/**
 * API Route: POST /api/trust-builder/missions/[id]/leave
 * Story: S4-03B - Mission Joining UI
 *
 * Allows authenticated member to leave a mission:
 * - Updates membership with left_at and status='left'
 * - Logs membership.ended event with enhanced metadata
 * - Non-punitive (no Trust Score deduction)
 * - Uses withTransaction for atomicity
 *
 * Enhanced metadata includes:
 * - group_id, group_stable_id, group_name
 * - member_id, member_stable_id
 * - joined_at, left_at, days_active
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
        // Fetch mission and membership details
        const {
          rows: [membership],
        } = await client.query(
          `SELECT 
            m.id, m.joined_at, m.status,
            g.name as group_name,
            gs.stable_id as group_stable_id,
            ms.stable_id as member_stable_id
           FROM memberships m
           JOIN groups g ON g.id = m.group_id
           JOIN group_stable_ids gs ON gs.group_id = g.id
           JOIN members mem ON mem.id = m.member_id
           JOIN member_stable_ids ms ON ms.member_id = mem.id
           WHERE m.group_id = $1 AND m.member_id = $2 AND m.status = 'active'`,
          [id, member.id]
        );

        if (!membership) {
          throw new Error('No active membership found');
        }

        const leftAt = new Date().toISOString();
        const joinedAt = membership.joined_at;

        // Calculate days_active
        const daysActive = Math.floor(
          (new Date(leftAt).getTime() - new Date(joinedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // CTE: Update membership + log event atomically
        await client.query(
          `
          WITH updated_membership AS (
            UPDATE memberships 
            SET status = 'left', left_at = $2
            WHERE id = $1
            RETURNING *
          )
          INSERT INTO events (entity_type, entity_id, event_type, metadata)
          SELECT 'membership', um.id, 'membership.ended',
            jsonb_build_object(
              'group_id', $3,
              'group_stable_id', $4,
              'group_name', $5,
              'member_id', $6,
              'member_stable_id', $7,
              'joined_at', $8,
              'left_at', $2,
              'days_active', $9
            )
          FROM updated_membership um
          `,
          [
            membership.id,
            leftAt,
            id,
            membership.group_stable_id,
            membership.group_name,
            member.id,
            membership.member_stable_id,
            joinedAt,
            daysActive,
          ]
        );

        return {
          success: true,
          left_at: leftAt,
          days_active: daysActive,
        };
      }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error leaving mission:', error);

    // Handle specific error cases
    if (error.message.includes('No active membership')) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Failed to leave mission' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
