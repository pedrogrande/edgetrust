/**
 * Dashboard Query Helpers for S3-02
 *
 * Trust Score derivation and incentive breakdown queries
 * All queries use event sourcing (Knowledge dimension from Events)
 */

import type { PoolClient } from '@neondatabase/serverless';

export interface TrustScoreBreakdown {
  trustScore: number;
  incentiveBreakdown: IncentiveDimension[];
}

export interface IncentiveDimension {
  name: string;
  points: number;
}

export interface ClaimHistoryItem {
  id: string;
  taskTitle: string;
  missionName: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  incentives: IncentiveDimension[];
}

export interface DashboardData {
  member: {
    id: string;
    memberId: string;
    displayName: string | null;
    role: string;
    email: string;
  };
  trustScore: number;
  incentiveBreakdown: IncentiveDimension[];
  claimHistory: ClaimHistoryItem[];
  progressToNextRole: {
    currentRole: string;
    nextRole: string | null;
    currentScore: number;
    targetScore: number | null;
    percentage: number;
  } | null;
}

/**
 * Calculate Trust Score from events (source of truth)
 * AC2: Trust Score matches sum of all claim.approved events
 * AC9: Trust Score derivable from events alone
 */
export async function calculateTrustScore(
  client: PoolClient,
  memberId: string
): Promise<number> {
  const result = await client.query<{ trust_score: string }>(
    `SELECT COALESCE(SUM((metadata->>'points_earned')::integer), 0) AS trust_score
     FROM events
     WHERE event_type = 'claim.approved'
       AND (metadata->>'member_id')::uuid = $1`,
    [memberId]
  );

  return parseInt(result.rows[0]?.trust_score || '0', 10);
}

/**
 * Get incentive breakdown by dimension
 * AC4: Chart data accurate (sums metadata.incentives[].points per type)
 * AC11: Event metadata includes points breakdown per incentive type
 *
 * Includes fallback to task_incentives table (strategic review HIGH priority)
 */
export async function getIncentiveBreakdown(
  client: PoolClient,
  memberId: string
): Promise<IncentiveDimension[]> {
  const result = await client.query<{
    incentive_name: string;
    total_points: string;
  }>(
    `SELECT
       COALESCE(i.name, incentive->>'name') AS incentive_name,
       COALESCE(
         SUM((incentive->>'points')::integer),  -- From event metadata
         SUM(ti.points)                          -- Fallback: from task definition
       ) AS total_points
     FROM events e
     LEFT JOIN claims c ON (e.metadata->>'claim_id')::uuid = c.id
     LEFT JOIN task_incentives ti ON ti.task_id = c.task_id
     LEFT JOIN incentives i ON i.id = ti.incentive_id
     LEFT JOIN LATERAL jsonb_array_elements(e.metadata->'incentives') AS incentive ON true
     WHERE e.event_type = 'claim.approved'
       AND (e.metadata->>'member_id')::uuid = $1
       AND (i.name IS NOT NULL OR incentive->>'name' IS NOT NULL)
     GROUP BY COALESCE(i.name, incentive->>'name')
     ORDER BY total_points DESC`,
    [memberId]
  );

  return result.rows.map((row) => ({
    name: row.incentive_name,
    points: parseInt(row.total_points || '0', 10),
  }));
}

/**
 * Get claim history with task context
 * AC5: Claim history table shows all member's claims
 * AC28: Claim history query paginated (default 20 rows)
 */
export async function getClaimHistory(
  client: PoolClient,
  memberId: string,
  limit: number = 20,
  cursor?: string
): Promise<ClaimHistoryItem[]> {
  const query = cursor
    ? `SELECT
         c.id,
         c.status,
         c.submitted_at,
         c.reviewed_at,
         t.title AS task_title,
         g.name AS mission_name,
         (
           SELECT COALESCE(jsonb_agg(
             jsonb_build_object(
               'name', i.name,
               'points', ti.points
             )
           ), '[]'::jsonb)
           FROM task_incentives ti
           JOIN incentives i ON i.id = ti.incentive_id
           WHERE ti.task_id = c.task_id
         ) AS incentives
       FROM claims c
       JOIN tasks t ON t.id = c.task_id
       JOIN groups g ON g.id = t.group_id
       WHERE c.member_id = $1
         AND c.submitted_at < $2
       ORDER BY c.submitted_at DESC
       LIMIT $3`
    : `SELECT
         c.id,
         c.status,
         c.submitted_at,
         c.reviewed_at,
         t.title AS task_title,
         g.name AS mission_name,
         (
           SELECT COALESCE(jsonb_agg(
             jsonb_build_object(
               'name', i.name,
               'points', ti.points
             )
           ), '[]'::jsonb)
           FROM task_incentives ti
           JOIN incentives i ON i.id = ti.incentive_id
           WHERE ti.task_id = c.task_id
         ) AS incentives
       FROM claims c
       JOIN tasks t ON t.id = c.task_id
       JOIN groups g ON g.id = t.group_id
       WHERE c.member_id = $1
       ORDER BY c.submitted_at DESC
       LIMIT $2`;

  const params = cursor ? [memberId, cursor, limit] : [memberId, limit];
  const result = await client.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    taskTitle: row.task_title,
    missionName: row.mission_name,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    incentives: Array.isArray(row.incentives)
      ? row.incentives
      : JSON.parse(row.incentives || '[]'),
  }));
}

/**
 * Calculate progress to next role
 * AC18: Progress bar to Steward shows percentage complete
 */
export function calculateRoleProgress(
  currentRole: string,
  trustScore: number
): {
  currentRole: string;
  nextRole: string | null;
  currentScore: number;
  targetScore: number | null;
  percentage: number;
} | null {
  const roleThresholds: Record<
    string,
    { next: string | null; threshold: number | null }
  > = {
    explorer: { next: 'contributor', threshold: 100 },
    contributor: { next: 'steward', threshold: 250 },
    steward: { next: 'guardian', threshold: 500 },
    guardian: { next: null, threshold: null },
  };

  const currentRoleInfo = roleThresholds[currentRole.toLowerCase()];
  if (!currentRoleInfo || !currentRoleInfo.next) {
    return null; // Max role reached
  }

  const percentage = currentRoleInfo.threshold
    ? Math.min(100, Math.round((trustScore / currentRoleInfo.threshold) * 100))
    : 0;

  return {
    currentRole,
    nextRole: currentRoleInfo.next,
    currentScore: trustScore,
    targetScore: currentRoleInfo.threshold,
    percentage,
  };
}

/**
 * Get complete dashboard data for member
 * AC1: Dashboard displays member's Trust Score within 2s page load
 */
export async function getDashboardData(
  client: PoolClient,
  memberId: string
): Promise<DashboardData> {
  // Get member info
  const memberResult = await client.query(
    `SELECT id, member_id, display_name, role, email FROM members WHERE id = $1`,
    [memberId]
  );

  if (memberResult.rows.length === 0) {
    throw new Error('Member not found');
  }

  const member = memberResult.rows[0];

  // Get Trust Score (event-sourced)
  const trustScore = await calculateTrustScore(client, memberId);

  // Get incentive breakdown
  const incentiveBreakdown = await getIncentiveBreakdown(client, memberId);

  // Get claim history
  const claimHistory = await getClaimHistory(client, memberId);

  // Calculate progress to next role
  const progressToNextRole = calculateRoleProgress(member.role, trustScore);

  return {
    member: {
      id: member.id,
      memberId: member.member_id,
      displayName: member.display_name,
      role: member.role,
      email: member.email,
    },
    trustScore,
    incentiveBreakdown,
    claimHistory,
    progressToNextRole,
  };
}

/**
 * Detect cache drift (strategic review MEDIUM priority)
 * AC8: Recalculated score matches current cached score
 */
export async function detectCacheDrift(
  client: PoolClient,
  memberId: string
): Promise<{
  cached: number;
  calculated: number;
  drift: number;
  driftPercentage: number;
}> {
  const memberResult = await client.query<{ trust_score_cached: number }>(
    `SELECT trust_score_cached FROM members WHERE id = $1`,
    [memberId]
  );

  const cached = memberResult.rows[0]?.trust_score_cached || 0;
  const calculated = await calculateTrustScore(client, memberId);
  const drift = calculated - cached;
  const driftPercentage = cached > 0 ? Math.abs((drift / cached) * 100) : 0;

  return {
    cached,
    calculated,
    drift,
    driftPercentage,
  };
}
