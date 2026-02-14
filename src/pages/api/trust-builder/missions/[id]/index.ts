/**
 * API Route: GET /api/trust-builder/missions/[id]
 * Story: S4-03B - Mission Joining UI
 *
 * Returns mission detail with active members:
 * - Mission details (name, description, min_trust_score, member_count)
 * - Active members list
 * - is_member and is_eligible flags for current member
 *
 * Uses S4-03A helper: get_mission_members()
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';

export const GET: APIRoute = async ({ params, request }) => {
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

    // Fetch mission (from groups table WHERE type='mission')
    const missionResult = await sql`
      SELECT 
        g.*,
        (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id AND m.status = 'active') as member_count,
        CASE 
          WHEN EXISTS (SELECT 1 FROM memberships m WHERE m.group_id = g.id AND m.member_id = ${member.id} AND m.status = 'active')
          THEN true ELSE false 
        END as is_member,
        CASE WHEN ${member.trust_score_cached || 0} >= g.min_trust_score THEN true ELSE false END as is_eligible
      FROM groups g
      WHERE g.id = ${id} AND g.type = 'mission'
    `;

    const mission = missionResult[0];
    if (!mission) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch active members (use S4-03A helper)
    const members = await sql`SELECT * FROM get_mission_members(${id}::UUID)`;

    return new Response(JSON.stringify({ mission, members }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching mission details:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch mission details' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
