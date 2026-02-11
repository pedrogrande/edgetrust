/**
 * Role Promotion Helpers (S3-04)
 *
 * Functions for role management and threshold-based promotion
 * Uses system_config table for versioned thresholds (AC5)
 */

import type { PoolClient } from '@neondatabase/serverless';

export interface RoleThresholds {
  contributor: number;
  steward: number;
  guardian: number;
}

export interface PromotionResult {
  promoted: boolean;
  oldRole?: string;
  newRole?: string;
  threshold?: number;
}

/**
 * Get current role promotion thresholds from config table
 * AC5: Threshold stored in config table (not hardcoded)
 */
export async function getRoleThresholds(
  client: PoolClient
): Promise<RoleThresholds> {
  const result = await client.query<{ value: RoleThresholds }>(
    `SELECT value FROM system_config WHERE key = 'role_promotion_thresholds'`
  );

  if (result.rows.length === 0) {
    // Fallback if config missing (should never happen after seed)
    console.warn('Role thresholds not found in system_config, using defaults');
    return { contributor: 100, steward: 250, guardian: 1000 };
  }

  return result.rows[0].value;
}

/**
 * Check if member qualifies for promotion and apply if eligible
 * AC1: Member promoted to Steward when trust_score_cached >= 250 AND role = 'Member'
 * AC3: Promotion triggers only once (not on every subsequent approval)
 */
export async function checkAndPromoteMember(
  client: PoolClient,
  memberId: string,
  currentRole: string,
  currentTrustScore: number,
  promotedBy: string = 'system'
): Promise<PromotionResult> {
  // Get current thresholds
  const thresholds = await getRoleThresholds(client);

  // Determine if promotion is needed
  let newRole: string | null = null;
  let threshold: number | null = null;

  // Role progression: explorer → contributor → steward → guardian
  if (
    currentRole === 'explorer' &&
    currentTrustScore >= thresholds.contributor
  ) {
    newRole = 'contributor';
    threshold = thresholds.contributor;
  } else if (
    currentRole === 'contributor' &&
    currentTrustScore >= thresholds.steward
  ) {
    newRole = 'steward';
    threshold = thresholds.steward;
  } else if (
    currentRole === 'steward' &&
    currentTrustScore >= thresholds.guardian
  ) {
    newRole = 'guardian';
    threshold = thresholds.guardian;
  }

  // No promotion needed
  if (!newRole) {
    return { promoted: false };
  }

  // Apply promotion
  await client.query(`UPDATE members SET role = $1 WHERE id = $2`, [
    newRole,
    memberId,
  ]);

  // Log promotion event (AC6: Event member.role_promoted logged with metadata)
  // AC7: Event logged inside transaction (atomic with role update)
  await client.query(
    `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
     VALUES ($1, 'member', $2, 'member.role_promoted', $3)`,
    [
      promotedBy === 'system' ? memberId : promotedBy, // System promotions use member as actor
      memberId,
      {
        member_id: memberId,
        old_role: currentRole,
        new_role: newRole,
        trust_score: currentTrustScore,
        threshold: threshold,
        promoted_by: promotedBy,
      },
    ]
  );

  return {
    promoted: true,
    oldRole: currentRole,
    newRole: newRole,
    threshold: threshold ?? undefined,
  };
}

/**
 * Manual promotion by admin (AC4: Manual promotion still possible)
 */
export async function manuallyPromoteMember(
  client: PoolClient,
  memberId: string,
  newRole: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; newRole: string }> {
  // Get current member state
  const {
    rows: [member],
  } = await client.query<{
    role: string;
    trust_score_cached: number;
  }>(`SELECT role, trust_score_cached FROM members WHERE id = $1`, [memberId]);

  if (!member) {
    throw new Error('Member not found');
  }

  // Validate role transition
  const validRoles = ['explorer', 'contributor', 'steward', 'guardian'];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  // Apply promotion
  await client.query(`UPDATE members SET role = $1 WHERE id = $2`, [
    newRole,
    memberId,
  ]);

  // Log manual promotion event
  await client.query(
    `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
     VALUES ($1, 'member', $2, 'member.role_promoted', $3)`,
    [
      adminId,
      memberId,
      {
        member_id: memberId,
        old_role: member.role,
        new_role: newRole,
        trust_score: member.trust_score_cached,
        threshold: null, // Manual promotion ignores threshold
        promoted_by: adminId,
        reason: reason,
      },
    ]
  );

  return { success: true, newRole };
}

/**
 * Check if member has a specific privilege based on role
 * Used for gatekeeping (AC12-15: Stewards can access review page)
 * AC13: Case-insensitive role checks
 */
export function hasPrivilege(
  role: string,
  privilege: 'review' | 'admin'
): boolean {
  const normalizedRole = role.toLowerCase();
  const roleHierarchy: Record<string, string[]> = {
    explorer: [],
    contributor: [],
    steward: ['review'],
    guardian: ['review', 'admin'],
  };

  return roleHierarchy[normalizedRole]?.includes(privilege) || false;
}
