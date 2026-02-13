/**
 * API Route: POST /api/trust-builder/missions/[id]/join
 * Story: S4-03B - Mission Joining UI
 *
 * Allows authenticated member to join a mission:
 * - Validates eligibility (trust_score >= min_trust_score)
 * - Prevents duplicate joins
 * - Creates membership with status='active'
 * - Logs membership.created event with enhanced metadata
 * - Uses withTransaction for atomicity
 *
 * Enhanced metadata includes:
 * - group_id, group_stable_id, group_name
 * - member_id, member_stable_id
 * - member_trust_score, joined_at
 */

import type { APIRoute } from 'astro';
import { withTransaction, sql } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';
import type { PoolClient } from '@neondatabase/serverless';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    const member = await getCurrentUser(request, sql);

    if (!member) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'Mission ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client: PoolClient) => {
        // Fetch mission details
        const {
          rows: [mission],
        } = await client.query(
          `SELECT g.*, gs.stable_id as group_stable_id 
           FROM groups g
           JOIN group_stable_ids gs ON gs.group_id = g.id
           WHERE g.id = $1 AND g.type = 'mission'`,
          [id]
        );

        if (!mission) {
          throw new Error('Mission not found');
        }

        // Validate eligibility
        const memberTrustScore = member.trust_score_cached || 0;
        if (memberTrustScore < mission.min_trust_score) {
          throw new Error(
            `Insufficient trust score. Required: ${mission.min_trust_score}, Current: ${memberTrustScore}`
          );
        }

        // Check for existing active membership
        const {
          rows: [existingMembership],
        } = await client.query(
          `SELECT id FROM memberships WHERE group_id = $1 AND member_id = $2 AND status = 'active'`,
          [id, member.id]
        );

        if (existingMembership) {
          throw new Error('Already a member of this mission');
        }

        // Get member stable ID
        const {
          rows: [memberData],
        } = await client.query(
          `SELECT ms.stable_id as member_stable_id FROM members m
           JOIN member_stable_ids ms ON ms.member_id = m.id
           WHERE m.id = $1`,
          [member.id]
        );

        const joinedAt = new Date().toISOString();

        // CTE: Create membership + log event atomically
        await client.query(
          `
          WITH new_membership AS (
            INSERT INTO memberships (group_id, member_id, status, joined_at)
            VALUES ($1, $2, 'active', $3)
            RETURNING *
          )
          INSERT INTO events (entity_type, entity_id, event_type, metadata)
          SELECT 'membership', nm.id, 'membership.created', 
            jsonb_build_object(
              'group_id', $1,
              'group_stable_id', $4,
              'group_name', $5,
              'member_id', $2,
              'member_stable_id', $6,
              'member_trust_score', $7,
              'joined_at', $3
            )
          FROM new_membership nm
          `,
          [
            id,
            member.id,
            joinedAt,
            mission.group_stable_id,
            mission.name,
            memberData.member_stable_id,
            memberTrustScore,
          ]
        );

        return { success: true, joined_at: joinedAt };
      }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error joining mission:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (
      error.message.includes('Insufficient trust score') ||
      error.message.includes('Already a member')
    ) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Failed to join mission' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
