/**
 * GET /api/trust-builder/missions
 *
 * Returns all active missions with task counts and total points available
 * Public endpoint — no authentication required
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { GroupType } from '@/types/trust-builder';

export const GET: APIRoute = async () => {
  try {
    const missions = await sql`
      SELECT 
        g.id,
        g.name,
        g.description,
        COUNT(t.id) AS task_count,
        COALESCE(SUM(ti_sum.total_points), 0) AS total_points_available
      FROM groups g
      LEFT JOIN tasks t ON g.id = t.group_id AND t.state = 'open'
      LEFT JOIN LATERAL (
        SELECT SUM(points) AS total_points
        FROM task_incentives
        WHERE task_id = t.id
      ) ti_sum ON true
      WHERE g.type = ${GroupType.MISSION}
        AND g.status = 'active'
      GROUP BY g.id, g.name, g.description
      ORDER BY g.created_at DESC
    `;

    return new Response(
      JSON.stringify({
        missions: missions.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          task_count: Number(m.task_count),
          total_points_available: Number(m.total_points_available),
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching missions:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch missions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
