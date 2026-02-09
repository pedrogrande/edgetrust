/**
 * Trust Builder Query Helpers
 *
 * Typed database query functions for common operations.
 * All queries use the ONE ontology dimension mapping.
 */

import { sql } from './connection';
import type {
  Member,
  Task,
  TaskWithIncentives,
  Claim,
  ClaimWithTask,
  DimensionBreakdown,
  Group,
} from '@/types/trust-builder';

// ============================================================================
// GROUPS DIMENSION
// ============================================================================

/**
 * Get all active missions
 */
export async function getActiveMissions(): Promise<Group[]> {
  const result = await sql`
    SELECT * FROM groups
    WHERE type = 'mission' AND status = 'active'
    ORDER BY created_at DESC
  `;
  return result as Group[];
}

/**
 * Get a group by ID
 */
export async function getGroupById(id: string): Promise<Group | null> {
  const result = await sql`
    SELECT * FROM groups WHERE id = ${id}
  `;
  const group = result[0] as Group | undefined;
  return group || null;
}

// ============================================================================
// PEOPLE DIMENSION
// ============================================================================

/**
 * Get a member by email
 */
export async function getMemberByEmail(email: string): Promise<Member | null> {
  const result = await sql`
    SELECT * FROM members WHERE email = ${email}
  `;
  const member = result[0] as Member | undefined;
  return member || null;
}

/**
 * Get a member by ID
 */
export async function getMemberById(id: string): Promise<Member | null> {
  const result = await sql`
    SELECT * FROM members WHERE id = ${id}
  `;
  const member = result[0] as Member | undefined;
  return member || null;
}

/**
 * Get a member by Member ID (FE-M-XXXXX)
 */
export async function getMemberByMemberId(
  memberId: string
): Promise<Member | null> {
  const result = await sql`
    SELECT * FROM members WHERE member_id = ${memberId}
  `;
  const member = result[0] as Member | undefined;
  return member || null;
}

/**
 * Create a new member with generated Member ID
 * Member ID format: FE-M-00001, FE-M-00002, etc.
 */
export async function createMember(data: {
  email: string;
  displayName?: string;
}): Promise<Member> {
  // Generate next member_id
  const countResult = await sql`
    SELECT COUNT(*) as count FROM members
  `;
  const count = (countResult[0] as { count: number }).count;
  const nextNumber = Number(count) + 1;
  const memberId = `FE-M-${String(nextNumber).padStart(5, '0')}`;

  const result = await sql`
    INSERT INTO members (email, member_id, display_name, role, trust_score_cached)
    VALUES (${data.email}, ${memberId}, ${data.displayName || null}, 'explorer', 0)
    RETURNING *
  `;

  return result[0] as Member;
}

// ============================================================================
// THINGS DIMENSION: Tasks
// ============================================================================

/**
 * Get all open tasks with incentive and group details
 * Optionally filter by mission (group_id)
 */
export async function getOpenTasks(
  groupId?: string
): Promise<TaskWithIncentives[]> {
  const query = groupId
    ? sql`
        SELECT
          t.*,
          g.name as group_name,
          i.name as incentive_name,
          ti.points as incentive_points
        FROM tasks t
        INNER JOIN groups g ON t.group_id = g.id
        LEFT JOIN task_incentives ti ON t.id = ti.task_id
        LEFT JOIN incentives i ON ti.incentive_id = i.id
        WHERE t.state = 'open'
          AND t.group_id = ${groupId}
        ORDER BY t.published_at DESC
      `
    : sql`
        SELECT
          t.*,
          g.name as group_name,
          i.name as incentive_name,
          ti.points as incentive_points
        FROM tasks t
        INNER JOIN groups g ON t.group_id = g.id
        LEFT JOIN task_incentives ti ON t.id = ti.task_id
        LEFT JOIN incentives i ON ti.incentive_id = i.id
        WHERE t.state = 'open'
        ORDER BY t.published_at DESC
      `;

  const tasks = (await query) as Array<{
    id: string;
    group_id: string;
    title: string;
    description: string | null;
    rationale: string | null;
    state: string;
    task_type: string;
    verification_method: string;
    max_completions: number | null;
    version: number;
    created_by: string;
    created_at: Date;
    published_at: Date | null;
    updated_at: Date;
    group_name: string;
    incentive_name: string;
    incentive_points: number;
  }>;

  // Group by task and aggregate incentives
  const taskMap = new Map<string, TaskWithIncentives>();

  for (const row of tasks) {
    if (!taskMap.has(row.id)) {
      taskMap.set(row.id, {
        id: row.id,
        group_id: row.group_id,
        title: row.title,
        description: row.description,
        rationale: row.rationale,
        state: row.state as any,
        task_type: row.task_type as any,
        verification_method: row.verification_method as any,
        max_completions: row.max_completions,
        version: row.version,
        created_by: row.created_by,
        created_at: row.created_at,
        published_at: row.published_at,
        updated_at: row.updated_at,
        group_name: row.group_name,
        incentives: [],
        total_value: 0,
        criteria_count: 0,
      });
    }

    const task = taskMap.get(row.id)!;
    if (row.incentive_name) {
      task.incentives.push({
        name: row.incentive_name,
        points: row.incentive_points,
      });
      task.total_value += row.incentive_points;
    }
  }

  // Get criteria counts
  const taskIds = [...taskMap.keys()];
  if (taskIds.length > 0) {
    const criteriaCounts = (await sql`
      SELECT task_id, COUNT(*) as count
      FROM criteria
      WHERE task_id = ANY(${taskIds})
      GROUP BY task_id
    `) as Array<{ task_id: string; count: number }>;

    for (const { task_id, count } of criteriaCounts) {
      const task = taskMap.get(task_id);
      if (task) {
        task.criteria_count = Number(count);
      }
    }
  }

  return Array.from(taskMap.values());
}

/**
 * Get a task by ID with full details (criteria, incentives)
 */
export async function getTaskById(
  id: string
): Promise<TaskWithIncentives | null> {
  const taskResult = await sql`
    SELECT * FROM tasks WHERE id = ${id}
  `;
  const task = taskResult[0] as Task | undefined;

  if (!task) return null;

  const groupResult = await sql`
    SELECT * FROM groups WHERE id = ${task.group_id}
  `;
  const group = groupResult[0] as Group | undefined;

  const incentives = (await sql`
    SELECT i.name, ti.points
    FROM task_incentives ti
    INNER JOIN incentives i ON ti.incentive_id = i.id
    WHERE ti.task_id = ${id}
  `) as Array<{ name: string; points: number }>;

  const countResult = await sql`
    SELECT COUNT(*) as count FROM criteria WHERE task_id = ${id}
  `;
  const count = (countResult[0] as { count: number }).count;

  const total_value = incentives.reduce((sum, inc) => sum + inc.points, 0);

  return {
    ...task,
    group_name: group?.name || 'Unknown',
    incentives,
    total_value,
    criteria_count: Number(count),
  };
}

// ============================================================================
// CONNECTIONS DIMENSION: Claims
// ============================================================================

/**
 * Get all claims for a member with task details
 */
export async function getClaimsByMember(
  memberId: string
): Promise<ClaimWithTask[]> {
  const result = await sql`
    SELECT
      c.*,
      t.title as task_title,
      t.task_type,
      COALESCE(
        (
          SELECT SUM(ti.points)
          FROM task_incentives ti
          WHERE ti.task_id = c.task_id
        ),
        0
      ) as points_earned
    FROM claims c
    INNER JOIN tasks t ON c.task_id = t.id
    WHERE c.member_id = ${memberId}
    ORDER BY c.submitted_at DESC
  `;
  return result as ClaimWithTask[];
}

/**
 * Get task criteria with verification methods
 */
export async function getTaskCriteria(taskId: string): Promise<
  Array<{
    id: string;
    description: string;
    verification_method: string;
    proof_type: string;
    sort_order: number;
  }>
> {
  const result = await sql`
    SELECT id, description, verification_method, proof_type, sort_order
    FROM criteria
    WHERE task_id = ${taskId}
    ORDER BY sort_order
  `;
  return result as Array<{
    id: string;
    description: string;
    verification_method: string;
    proof_type: string;
    sort_order: number;
  }>;
}

/**
 * Get a claim by ID
 */
export async function getClaimById(id: string): Promise<Claim | null> {
  const result = await sql`
    SELECT * FROM claims WHERE id = ${id}
  `;
  const claim = result[0] as Claim | undefined;
  return claim || null;
}

/**
 * Check if member has already claimed a task
 */
export async function hasClaimedTask(
  memberId: string,
  taskId: string
): Promise<boolean> {
  const result = await sql`
    SELECT EXISTS(
      SELECT 1 FROM claims
      WHERE member_id = ${memberId} AND task_id = ${taskId}
    ) as exists
  `;
  const row = result[0] as { exists: boolean };
  return row.exists;
}

// ============================================================================
// KNOWLEDGE DIMENSION: Trust Score & Dimensions
// ============================================================================

/**
 * Get approved points by member with dimension breakdown
 * This is the AUTHORITATIVE trust score calculation (event-derived)
 */
export async function getApprovedPointsByMember(
  memberId: string
): Promise<{ total: number; dimensions: Record<string, number> }> {
  const dimensions = (await sql`
    SELECT
      i.name as dimension,
      COALESCE(SUM(ti.points), 0) as total
    FROM claims c
    INNER JOIN task_incentives ti ON ti.task_id = c.task_id
    INNER JOIN incentives i ON i.id = ti.incentive_id
    WHERE c.member_id = ${memberId}
      AND c.status = 'approved'
    GROUP BY i.name
  `) as Array<{ dimension: string; total: number }>;

  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const { dimension, total: dimTotal } of dimensions) {
    const key = dimension.toLowerCase();
    breakdown[key] = Number(dimTotal);
    total += Number(dimTotal);
  }

  return { total, dimensions: breakdown };
}

/**
 * Get member rank based on trust score thresholds
 */
export function getMemberRank(trustScore: number): string {
  if (trustScore >= 1000) return 'guardian';
  if (trustScore >= 500) return 'steward';
  if (trustScore >= 250) return 'contributor';
  return 'explorer';
}

// ============================================================================
// DASHBOARD QUERIES (S1-05)
// ============================================================================

/**
 * Get dimension breakdown from events (event-sourced approach)
 * Aggregates trust.updated events to show how member earned points across dimensions
 */
export async function getDimensionBreakdown(
  memberId: string
): Promise<{ total: number; dimensions: Record<string, number> }> {
  const result = await sql`
    SELECT 
      metadata->>'dimensions' as dimensions
    FROM events
    WHERE actor_id = ${memberId}
      AND event_type = 'trust.updated'
      AND metadata ? 'dimensions'
    ORDER BY timestamp DESC
  `;

  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const row of result) {
    if (!row.dimensions) continue;
    try {
      const dims = JSON.parse(row.dimensions as string);
      for (const [key, value] of Object.entries(dims)) {
        breakdown[key] = (breakdown[key] || 0) + (value as number);
        total += value as number;
      }
    } catch (error) {
      console.error('Failed to parse dimensions from event:', error);
      continue;
    }
  }

  return { total, dimensions: breakdown };
}

/**
 * Get recent claims with task and mission details
 * Used for dashboard "Recent Claims" section
 */
export async function getRecentClaims(memberId: string, limit: number = 5) {
  const result = await sql`
    SELECT 
      c.id,
      c.status,
      c.submitted_at,
      c.reviewed_at,
      t.id as task_id,
      t.title as task_title,
      g.name as mission_name,
      COALESCE(
        (SELECT SUM(ti.points) 
         FROM task_incentives ti 
         WHERE ti.task_id = t.id),
        0
      ) as points_earned
    FROM claims c
    INNER JOIN tasks t ON c.task_id = t.id
    INNER JOIN groups g ON t.group_id = g.id
    WHERE c.member_id = ${memberId}
    ORDER BY c.submitted_at DESC
    LIMIT ${limit}
  `;

  return result as Array<{
    id: string;
    status: string;
    submitted_at: Date;
    reviewed_at: Date | null;
    task_id: string;
    task_title: string;
    mission_name: string;
    points_earned: number;
  }>;
}
