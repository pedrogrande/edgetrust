/**
 * Claim Engine — Quasi-Smart Contract Business Logic
 *
 * Implements the auto-approve engine for task completion claims.
 * All operations are atomic and generate immutable event logs.
 *
 * CRITICAL: This module uses transaction-safe event logging via logEventBatch.
 * The logEvent function uses HTTP driver and cannot participate in transactions.
 */

import type { PoolClient } from '@neondatabase/serverless';
import {
  EventType,
  ClaimStatus,
  type DimensionBreakdown,
} from '@/types/trust-builder';
import { logEventBatch } from '@/lib/events/logger';
import { validateUUID, validateProofText } from './validators';
import { checkAndPromoteMember } from '@/lib/db/role-helpers';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProofInput {
  criterion_id: string;
  proof_text?: string; // Optional for text-based proofs
  file_id?: string; // S2-03: Optional for file-based proofs
  file_hash?: string; // S2-03: SHA-256 hash for file integrity
}

export interface ClaimResult {
  claimId: string;
  status: ClaimStatus;
  pointsEarned?: number;
  newTrustScore?: number;
  message: string;
  promoted?: boolean; // S3-04: Promotion occurred
  newRole?: string; // S3-04: Role after promotion
}

export interface PointsBreakdown {
  total: number;
  dimensions: Record<string, number>;
}

// ============================================================================
// ELIGIBILITY VALIDATION
// ============================================================================

/**
 * Validate that a member can submit a claim on a task
 * Checks: task exists, task is open, no duplicate claim, max_completions not reached
 */
async function validateClaimEligibility(
  client: PoolClient,
  memberId: string,
  taskId: string
): Promise<void> {
  // Check 1: Task exists and is Open
  const taskResult = await client.query(
    'SELECT state, max_completions FROM tasks WHERE id = $1',
    [taskId]
  );

  if (taskResult.rows.length === 0) {
    throw new Error('TASK_NOT_FOUND');
  }

  const task = taskResult.rows[0] as {
    state: string;
    max_completions: number | null;
  };

  if (task.state !== 'open') {
    throw new Error('TASK_NOT_OPEN');
  }

  // Check 2: No duplicate claim (explicit check for better UX, also enforced by DB constraint)
  const existingClaimResult = await client.query(
    'SELECT id FROM claims WHERE member_id = $1 AND task_id = $2',
    [memberId, taskId]
  );

  if (existingClaimResult.rows.length > 0) {
    throw new Error('DUPLICATE_CLAIM');
  }

  // Check 3: max_completions not reached (checked inside transaction to prevent race conditions)
  if (task.max_completions !== null) {
    const completionsResult = await client.query(
      "SELECT COUNT(*) as count FROM claims WHERE task_id = $1 AND status = 'approved'",
      [taskId]
    );
    const completions = Number(
      (completionsResult.rows[0] as { count: string }).count
    );

    if (completions >= task.max_completions) {
      throw new Error('MAX_COMPLETIONS_REACHED');
    }
  }
}

/**
 * Validate proofs against task criteria
 * Ensures all criteria have proof submissions
 */
async function validateProofs(
  client: PoolClient,
  taskId: string,
  proofs: ProofInput[]
): Promise<void> {
  // Get all criteria for this task
  const criteriaResult = await client.query(
    'SELECT id FROM criteria WHERE task_id = $1 ORDER BY sort_order',
    [taskId]
  );

  const criteriaIds = criteriaResult.rows.map(
    (row) => (row as { id: string }).id
  );

  if (criteriaIds.length === 0) {
    throw new Error('TASK_HAS_NO_CRITERIA');
  }

  if (proofs.length !== criteriaIds.length) {
    throw new Error(
      `PROOF_COUNT_MISMATCH: Expected ${criteriaIds.length} proofs, got ${proofs.length}`
    );
  }

  // Validate each proof
  const proofCriterionIds = new Set(proofs.map((p) => p.criterion_id));

  for (const criterionId of criteriaIds) {
    if (!proofCriterionIds.has(criterionId)) {
      throw new Error(
        `MISSING_PROOF: No proof provided for criterion ${criterionId}`
      );
    }
  }

  // Validate proof text meets minimum requirements
  for (const proof of proofs) {
    validateUUID(proof.criterion_id, 'criterion_id');

    // S2-03: Proof must have either text OR file (not both, not neither)
    const hasText = proof.proof_text && proof.proof_text.trim().length > 0;
    const hasFile = proof.file_id && proof.file_hash;

    if (!hasText && !hasFile) {
      throw new Error(
        `Proof for criterion ${proof.criterion_id} must include either proof text or a file upload`
      );
    }

    // Validate text proof if provided
    if (hasText) {
      validateProofText(proof.proof_text!);
    }

    // Validate file proof if provided
    if (hasFile) {
      validateUUID(proof.file_id!, 'file_id');
      // Hash format: 64 hex characters (SHA-256)
      if (!/^[a-f0-9]{64}$/i.test(proof.file_hash!)) {
        throw new Error(
          `Invalid file_hash format for criterion ${proof.criterion_id}. Expected 64-character hex string.`
        );
      }
    }
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Create claim record
 */
async function createClaim(
  client: PoolClient,
  memberId: string,
  taskId: string
): Promise<string> {
  const result = await client.query(
    `INSERT INTO claims (member_id, task_id, status, submitted_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id`,
    [memberId, taskId, ClaimStatus.SUBMITTED]
  );

  return (result.rows[0] as { id: string }).id;
}

/**
 * Create proof records
 * S2-03: Handles both text and file-based proofs
 * For file proofs, moves file data from uploaded_files to proofs table
 */
async function createProofs(
  client: PoolClient,
  claimId: string,
  proofs: ProofInput[]
): Promise<void> {
  for (const proof of proofs) {
    // Case 1: Text-based proof
    if (proof.proof_text) {
      await client.query(
        `INSERT INTO proofs (claim_id, criterion_id, content_text)
         VALUES ($1, $2, $3)`,
        [claimId, proof.criterion_id, proof.proof_text.trim()]
      );
    }
    // Case 2: File-based proof
    else if (proof.file_id && proof.file_hash) {
      // Fetch file data from uploaded_files staging table
      const fileResult = await client.query(
        `SELECT file_data, file_size, mime_type, file_url
         FROM uploaded_files
         WHERE id = $1 AND file_hash = $2`,
        [proof.file_id, proof.file_hash]
      );

      if (fileResult.rows.length === 0) {
        throw new Error(
          `File not found in staging table: ${proof.file_id}. The file may have expired or the hash does not match.`
        );
      }

      const file = fileResult.rows[0] as {
        file_data: Buffer;
        file_size: number;
        mime_type: string;
        file_url: string;
      };

      // Insert proof with file data
      await client.query(
        `INSERT INTO proofs (claim_id, criterion_id, file_url, file_hash, file_size, mime_type, file_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          claimId,
          proof.criterion_id,
          file.file_url,
          proof.file_hash,
          file.file_size,
          file.mime_type,
          file.file_data,
        ]
      );

      // Clean up staging table (file has been moved to proofs)
      await client.query('DELETE FROM uploaded_files WHERE id = $1', [
        proof.file_id,
      ]);
    }
  }
}

/**
 * Check if task is eligible for auto-approve
 * Returns true if ALL criteria use verification_method = 'auto_approve'
 */
async function checkAutoApproveEligibility(
  client: PoolClient,
  taskId: string
): Promise<boolean> {
  const result = await client.query(
    `SELECT 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE verification_method = 'auto_approve') as auto_count
     FROM criteria
     WHERE task_id = $1`,
    [taskId]
  );

  const row = result.rows[0] as { total: string; auto_count: string };
  const total = Number(row.total);
  const autoCount = Number(row.auto_count);

  return total > 0 && total === autoCount;
}

/**
 * Calculate task points with dimension breakdown
 * Returns both total and per-dimension breakdown for blockchain migration
 */
async function calculateTaskPoints(
  client: PoolClient,
  taskId: string
): Promise<PointsBreakdown> {
  const result = await client.query(
    `SELECT i.name as dimension, ti.points
     FROM task_incentives ti
     INNER JOIN incentives i ON ti.incentive_id = i.id
     WHERE ti.task_id = $1`,
    [taskId]
  );

  const dimensions: Record<string, number> = {};
  let total = 0;

  for (const row of result.rows) {
    const { dimension, points } = row as { dimension: string; points: number };
    dimensions[dimension.toLowerCase()] = points;
    total += points;
  }

  return { total, dimensions };
}

/**
 * Update claim status to approved with auto-approve metadata
 */
async function approveClaim(
  client: PoolClient,
  claimId: string
): Promise<void> {
  await client.query(
    `UPDATE claims
     SET status = $1,
         reviewed_at = NOW(),
         reviewer_id = NULL,
         review_notes = $2
     WHERE id = $3`,
    [
      ClaimStatus.APPROVED,
      'Auto-approved: all criteria use auto-approve verification method',
      claimId,
    ]
  );
}

/**
 * Update member's cached trust score (increment)
 */
async function updateMemberTrustScore(
  client: PoolClient,
  memberId: string,
  pointsToAdd: number
): Promise<void> {
  await client.query(
    `UPDATE members
     SET trust_score_cached = trust_score_cached + $1,
         updated_at = NOW()
     WHERE id = $2`,
    [pointsToAdd, memberId]
  );
}

/**
 * Get member's current trust score
 */
async function getMemberTrustScore(
  client: PoolClient,
  memberId: string
): Promise<number> {
  const result = await client.query(
    'SELECT trust_score_cached FROM members WHERE id = $1',
    [memberId]
  );

  if (result.rows.length === 0) {
    throw new Error('MEMBER_NOT_FOUND');
  }

  return Number(
    (result.rows[0] as { trust_score_cached: number }).trust_score_cached
  );
}

// ============================================================================
// MAIN CLAIM PROCESSING
// ============================================================================

/**
 * Process a claim submission with atomic transaction
 *
 * Workflow:
 * 1. Validate eligibility (task open, no duplicate, max_completions check)
 * 2. Validate proofs (all criteria covered, text meets requirements)
 * 3. Create claim + proofs
 * 4. Log claim.submitted event
 * 5. Check auto-approve eligibility
 * 6. If auto-approve: approve claim, update trust score, log approval events
 * 7. If manual review: return submitted status
 *
 * CRITICAL: Uses logEventBatch for transaction-safe event logging
 */
export async function processClaimSubmission(
  client: PoolClient,
  memberId: string,
  taskId: string,
  proofs: ProofInput[]
): Promise<ClaimResult> {
  // STEP 1: Validate eligibility
  await validateClaimEligibility(client, memberId, taskId);

  // STEP 2: Validate proofs
  await validateProofs(client, taskId, proofs);

  // STEP 3: Create claim record
  const claimId = await createClaim(client, memberId, taskId);

  // STEP 4: Create proof records
  await createProofs(client, claimId, proofs);

  // STEP 5: Log claim.submitted event (transaction-safe)
  await logEventBatch(client, [
    {
      actorId: memberId,
      entityType: 'claim',
      entityId: claimId,
      eventType: EventType.CLAIM_SUBMITTED,
      metadata: { task_id: taskId, proof_count: proofs.length },
    },
  ]);

  // STEP 6: Check if auto-approve eligible
  const isAutoApprove = await checkAutoApproveEligibility(client, taskId);

  if (!isAutoApprove) {
    return {
      claimId,
      status: ClaimStatus.SUBMITTED,
      message: 'Claim submitted! A reviewer will evaluate your work soon.',
    };
  }

  // STEP 7: Execute auto-approve workflow
  await approveClaim(client, claimId);

  const pointsResult = await calculateTaskPoints(client, taskId);
  const { total: pointsEarned, dimensions } = pointsResult;

  await updateMemberTrustScore(client, memberId, pointsEarned);

  // Log both approval events in a single batch (transaction-safe)
  await logEventBatch(client, [
    {
      actorId: memberId,
      entityType: 'claim',
      entityId: claimId,
      eventType: EventType.CLAIM_APPROVED,
      metadata: {
        task_id: taskId,
        points_earned: pointsEarned,
        dimensions, // Dimension breakdown for blockchain migration
        auto_approved: true,
      },
    },
    {
      actorId: memberId,
      entityType: 'member',
      entityId: memberId,
      eventType: EventType.TRUST_UPDATED,
      metadata: {
        claim_id: claimId,
        points_added: pointsEarned,
        dimensions, // Dimension-level attestation
      },
    },
  ]);

  const newTrustScore = await getMemberTrustScore(client, memberId);

  return {
    claimId,
    status: ClaimStatus.APPROVED,
    pointsEarned,
    newTrustScore,
    message: `Claim approved! You earned ${pointsEarned} points.`,
  };
}

// ============================================================================
// S2-04: PEER REVIEW WORKFLOW
// ============================================================================

/**
 * Assign a claim to a reviewer (atomic with race condition protection)
 * Sets status to 'under_review' and establishes 72-hour deadline
 */
export async function assignClaimToReviewer(
  client: PoolClient,
  claimId: string,
  reviewerId: string
): Promise<{ success: boolean; queueDepth: number }> {
  validateUUID(claimId, 'claimId');
  validateUUID(reviewerId, 'reviewerId');

  // Get queue depth for event metadata
  const queueResult = await client.query(
    "SELECT COUNT(*) as count FROM claims WHERE status = 'submitted'"
  );
  const queueDepth = Number((queueResult.rows[0] as { count: string }).count);

  // Atomic claim assignment with race condition protection
  const result = await client.query(
    `UPDATE claims 
     SET status = $1, 
         reviewer_id = $2,
         review_deadline = NOW() + INTERVAL '72 hours',
         reviewed_at = NOW()
     WHERE id = $3 
       AND status = 'submitted'
       AND reviewer_id IS NULL
     RETURNING id, member_id`,
    [ClaimStatus.UNDER_REVIEW, reviewerId, claimId]
  );

  if (result.rows.length === 0) {
    return { success: false, queueDepth };
  }

  const claim = result.rows[0] as { id: string; member_id: string };

  // Log assignment event
  await logEventBatch(client, [
    {
      actorId: reviewerId,
      entityType: 'claim',
      entityId: claim.id,
      eventType: EventType.CLAIM_REVIEW_ASSIGNED,
      metadata: {
        reviewer_id: reviewerId,
        claimant_id: claim.member_id,
        assignment_method: 'self_selected',
        queue_depth_at_assignment: queueDepth,
      },
    },
  ]);

  return { success: true, queueDepth };
}

/**
 * Approve a claim after peer review (atomic trust score update)
 */
export async function approveClaimWithReview(
  client: PoolClient,
  claimId: string,
  reviewerId: string,
  verificationNotes?: string
): Promise<ClaimResult> {
  validateUUID(claimId, 'claimId');
  validateUUID(reviewerId, 'reviewerId');

  // Get claim details
  const claimResult = await client.query(
    `SELECT c.id, c.member_id, c.task_id, c.reviewer_id, c.status
     FROM claims c
     WHERE c.id = $1`,
    [claimId]
  );

  if (claimResult.rows.length === 0) {
    throw new Error('CLAIM_NOT_FOUND');
  }

  const claim = claimResult.rows[0] as {
    id: string;
    member_id: string;
    task_id: string;
    reviewer_id: string | null;
    status: string;
  };

  // Validation: Must be under review by this reviewer
  if (claim.reviewer_id !== reviewerId) {
    throw new Error('UNAUTHORIZED_REVIEWER');
  }

  if (claim.status !== ClaimStatus.UNDER_REVIEW) {
    throw new Error('CLAIM_NOT_UNDER_REVIEW');
  }

  // Calculate points
  const pointsResult = await calculateTaskPoints(client, claim.task_id);
  const { total: pointsEarned, dimensions } = pointsResult;

  // Get trust score before update
  const trustScoreBefore = await getMemberTrustScore(client, claim.member_id);

  // Update claim status
  await client.query(
    `UPDATE claims 
     SET status = $1, reviewed_at = NOW(), review_notes = $2, review_deadline = NULL
     WHERE id = $3`,
    [ClaimStatus.APPROVED, verificationNotes || null, claimId]
  );

  // Update member trust score (atomic)
  const memberResult = await client.query<{
    role: string;
    trust_score_cached: number;
  }>(
    'UPDATE members SET trust_score_cached = trust_score_cached + $1 WHERE id = $2 RETURNING role, trust_score_cached',
    [pointsEarned, claim.member_id]
  );

  const trustScoreAfter = trustScoreBefore + pointsEarned;
  const currentRole = memberResult.rows[0].role;
  const currentTrustScore = memberResult.rows[0].trust_score_cached;

  // S3-04: Check for role promotion after trust score update
  // AC2: Promotion happens atomically with claim approval (same transaction)
  const promotionResult = await checkAndPromoteMember(
    client,
    claim.member_id,
    currentRole,
    currentTrustScore,
    'system'
  );

  // Log events
  await logEventBatch(client, [
    {
      actorId: reviewerId,
      entityType: 'claim',
      entityId: claimId,
      eventType: EventType.CLAIM_APPROVED,
      metadata: {
        reviewer_id: reviewerId,
        verification_notes: verificationNotes || null,
        points_awarded: pointsEarned,
        dimensions,
        trust_score_before: trustScoreBefore,
        trust_score_after: trustScoreAfter,
        peer_reviewed: true,
      },
    },
    {
      actorId: claim.member_id,
      entityType: 'member',
      entityId: claim.member_id,
      eventType: EventType.TRUST_UPDATED,
      metadata: {
        claim_id: claimId,
        points_added: pointsEarned,
        dimensions,
      },
    },
  ]);

  return {
    claimId,
    status: ClaimStatus.APPROVED,
    pointsEarned,
    newTrustScore: trustScoreAfter,
    promoted: promotionResult.promoted,
    newRole: promotionResult.newRole,
    message: promotionResult.promoted
      ? `Claim approved! You earned ${pointsEarned} points and were promoted to ${promotionResult.newRole}!`
      : `Claim approved by peer reviewer! You earned ${pointsEarned} points.`,
  };
}

/**
 * Reject a claim with required reason
 */
export async function rejectClaim(
  client: PoolClient,
  claimId: string,
  reviewerId: string,
  rejectionReason: string
): Promise<void> {
  validateUUID(claimId, 'claimId');
  validateUUID(reviewerId, 'reviewerId');

  if (!rejectionReason || rejectionReason.trim().length < 20) {
    throw new Error(
      'Rejection reason required (minimum 20 characters) to help the member understand what needs improvement'
    );
  }

  // Get claim details
  const claimResult = await client.query(
    `SELECT c.id, c.member_id, c.reviewer_id, c.status
     FROM claims c
     WHERE c.id = $1`,
    [claimId]
  );

  if (claimResult.rows.length === 0) {
    throw new Error('CLAIM_NOT_FOUND');
  }

  const claim = claimResult.rows[0] as {
    id: string;
    member_id: string;
    reviewer_id: string | null;
    status: string;
  };

  // Validation
  if (claim.reviewer_id !== reviewerId) {
    throw new Error('UNAUTHORIZED_REVIEWER');
  }

  if (claim.status !== ClaimStatus.UNDER_REVIEW) {
    throw new Error('CLAIM_NOT_UNDER_REVIEW');
  }

  // Update claim status
  await client.query(
    `UPDATE claims 
     SET status = $1, reviewed_at = NOW(), review_notes = $2, review_deadline = NULL
     WHERE id = $3`,
    [ClaimStatus.REJECTED, rejectionReason, claimId]
  );

  // Log rejection event
  await logEventBatch(client, [
    {
      actorId: reviewerId,
      entityType: 'claim',
      entityId: claimId,
      eventType: EventType.CLAIM_REJECTED,
      metadata: {
        reviewer_id: reviewerId,
        claimant_id: claim.member_id,
        rejection_reason: rejectionReason,
        can_resubmit: false,
      },
    },
  ]);
}

/**
 * Request revision on a claim (max 2 revision cycles)
 */
export async function requestRevision(
  client: PoolClient,
  claimId: string,
  reviewerId: string,
  feedback: string
): Promise<void> {
  validateUUID(claimId, 'claimId');
  validateUUID(reviewerId, 'reviewerId');

  if (!feedback || feedback.trim().length < 20) {
    throw new Error(
      'Revision feedback required (minimum 20 characters) to help the member improve their submission'
    );
  }

  // Get claim details including revision count
  const claimResult = await client.query(
    `SELECT c.id, c.member_id, c.reviewer_id, c.status, c.revision_count
     FROM claims c
     WHERE c.id = $1`,
    [claimId]
  );

  if (claimResult.rows.length === 0) {
    throw new Error('CLAIM_NOT_FOUND');
  }

  const claim = claimResult.rows[0] as {
    id: string;
    member_id: string;
    reviewer_id: string | null;
    status: string;
    revision_count: number;
  };

  // Validation
  if (claim.reviewer_id !== reviewerId) {
    throw new Error('UNAUTHORIZED_REVIEWER');
  }

  if (claim.status !== ClaimStatus.UNDER_REVIEW) {
    throw new Error('CLAIM_NOT_UNDER_REVIEW');
  }

  // Check revision limit (max 2 revisions)
  if (claim.revision_count >= 2) {
    throw new Error(
      'MAX_REVISIONS_REACHED: This claim has reached the maximum revision limit (2). Please reject or approve.'
    );
  }

  // Get current proof hashes for audit trail
  const proofsResult = await client.query(
    `SELECT file_hash FROM proofs WHERE claim_id = $1 AND file_hash IS NOT NULL`,
    [claimId]
  );
  const previousHashes = proofsResult.rows.map(
    (row) => (row as { file_hash: string }).file_hash
  );

  // Increment revision count and reset to submitted
  await client.query(
    `UPDATE claims 
     SET status = $1, 
         revision_count = revision_count + 1,
         reviewer_id = NULL,
         review_notes = $2,
         review_deadline = NULL,
         reviewed_at = NOW()
     WHERE id = $3`,
    [ClaimStatus.SUBMITTED, feedback, claimId]
  );

  // Log revision request event
  await logEventBatch(client, [
    {
      actorId: reviewerId,
      entityType: 'claim',
      entityId: claimId,
      eventType: EventType.CLAIM_REVISION_REQUESTED,
      metadata: {
        reviewer_id: reviewerId,
        claimant_id: claim.member_id,
        feedback,
        revision_count: claim.revision_count + 1,
        previous_submission_hashes: previousHashes,
      },
    },
  ]);
}

/**
 * Release a claim back to the queue (voluntary reviewer action)
 */
export async function releaseClaim(
  client: PoolClient,
  claimId: string,
  reviewerId: string,
  reason?: string
): Promise<void> {
  validateUUID(claimId, 'claimId');
  validateUUID(reviewerId, 'reviewerId');

  // Get claim details
  const claimResult = await client.query(
    `SELECT c.id, c.member_id, c.reviewer_id, c.status
     FROM claims c
     WHERE c.id = $1`,
    [claimId]
  );

  if (claimResult.rows.length === 0) {
    throw new Error('CLAIM_NOT_FOUND');
  }

  const claim = claimResult.rows[0] as {
    id: string;
    member_id: string;
    reviewer_id: string | null;
    status: string;
  };

  // Validation
  if (claim.reviewer_id !== reviewerId) {
    throw new Error('UNAUTHORIZED_REVIEWER');
  }

  if (claim.status !== ClaimStatus.UNDER_REVIEW) {
    throw new Error('CLAIM_NOT_UNDER_REVIEW');
  }

  // Reset to submitted
  await client.query(
    `UPDATE claims 
     SET status = $1, reviewer_id = NULL, review_deadline = NULL
     WHERE id = $2`,
    [ClaimStatus.SUBMITTED, claimId]
  );

  // Log release event
  await logEventBatch(client, [
    {
      actorId: reviewerId,
      entityType: 'claim',
      entityId: claimId,
      eventType: EventType.CLAIM_REVIEW_RELEASED,
      metadata: {
        reviewer_id: reviewerId,
        claimant_id: claim.member_id,
        reason: reason || 'Reviewer voluntarily released claim',
      },
    },
  ]);
}

/**
 * Auto-release orphaned claims (timeout after 72 hours)
 * Should be called by background job/cron
 */
export async function releaseOrphanedClaims(
  client: PoolClient
): Promise<number> {
  const result = await client.query(
    `UPDATE claims 
     SET status = $1, reviewer_id = NULL, review_deadline = NULL
     WHERE status = $2
       AND review_deadline < NOW()
     RETURNING id, reviewer_id, member_id`,
    [ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW]
  );

  // Log timeout events for each orphaned claim
  const events = result.rows.map((row) => {
    const claim = row as {
      id: string;
      reviewer_id: string;
      member_id: string;
    };
    return {
      actorId: claim.reviewer_id,
      entityType: 'claim' as const,
      entityId: claim.id,
      eventType: EventType.CLAIM_REVIEW_TIMEOUT,
      metadata: {
        reviewer_id: claim.reviewer_id,
        claimant_id: claim.member_id,
        reason: 'Review deadline exceeded 72 hours',
      },
    };
  });

  if (events.length > 0) {
    await logEventBatch(client, events);
  }

  return result.rows.length;
}
