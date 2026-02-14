/**
 * API Route: GET /api/trust-builder/missions/me
 *
 * Returns missions that the authenticated member has joined,
 * enriched with task progress statistics.
 *
 * Story: S4-04 (Mission Task Management)
 * AC14: Returns missions with tasks_completed and tasks_available counts
 * AC15: Only returns missions where member is an active member
 */

import type { APIRoute } from 'astro';
import { sql, withTransaction } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get current user
    const user = await getCurrentUser(request, sql);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const missions = await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client) => {
        // AC14 & AC15: Get joined missions with task progress
        const result = await client.query(
          `SELECT 
            g.id,
            g.stable_id,
            g.name,
            g.description,
            g.status,
            m.joined_at,
            -- Count open tasks in this mission
            (SELECT COUNT(*) 
             FROM tasks t 
             WHERE t.group_id = g.id 
               AND t.state = 'open') as tasks_available,
            -- Count tasks member has completed (approved claims)
            (SELECT COUNT(DISTINCT c.task_id)
             FROM claims c
             INNER JOIN tasks t ON c.task_id = t.id
             WHERE c.member_id = $1
               AND c.status = 'approved'
               AND t.group_id = g.id) as tasks_completed
          FROM memberships m
          INNER JOIN groups g ON m.group_id = g.id
          WHERE m.member_id = $1
            AND m.status = 'active'
            AND g.status = 'active'
          ORDER BY m.joined_at DESC`,
          [user.id]
        );

        return result.rows.map((row: any) => ({
          id: row.id,
          stable_id: row.stable_id,
          name: row.name,
          description: row.description,
          status: row.status,
          joined_at: row.joined_at,
          tasks_available: parseInt(row.tasks_available),
          tasks_completed: parseInt(row.tasks_completed),
        }));
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        missions,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching member missions:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch your missions',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
