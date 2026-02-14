/**
 * API Route: GET /api/trust-builder/missions
 * Story: S4-03B - Mission Joining UI
 *
 * Returns all active missions with metadata including:
 * - Mission details (name, description, min_trust_score)
 * - Member count, task count
 * - is_member, is_eligible flags for current member
 *
 * Uses S4-03A helper: get_active_missions()
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const member = await getCurrentUser(request, sql);

    if (!member) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use S4-03A helper function
    const missions =
      await sql`SELECT * FROM get_active_missions(${member.id}::UUID, ${member.trust_score_cached || 0}::INTEGER)`;

    return new Response(JSON.stringify({ missions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching missions:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch missions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
