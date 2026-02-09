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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProofInput {
  criterion_id: string;
  proof_text: string;
}

export interface ClaimResult {
  claimId: string;
  status: ClaimStatus;
  pointsEarned?: number;
  newTrustScore?: number;
  message: string;
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
    validateProofText(proof.proof_text);
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
 */
async function createProofs(
  client: PoolClient,
  claimId: string,
  proofs: ProofInput[]
): Promise<void> {
  const values: string[] = [];
  const params: string[] = [];
  let paramIndex = 1;

  for (const proof of proofs) {
    values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
    params.push(claimId, proof.criterion_id, proof.proof_text.trim());
    paramIndex += 3;
  }

  const query = `
    INSERT INTO proofs (claim_id, criterion_id, content_text)
    VALUES ${values.join(', ')}
  `;

  await client.query(query, params);
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
