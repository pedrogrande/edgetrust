/**
 * GET /api/trust-builder/tasks
 *
 * Returns all open tasks with mission and incentive details
 * Supports filtering by mission ID via query param
 * Public endpoint — no authentication required
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { TaskState } from '@/types/trust-builder';

export const GET: APIRoute = async ({ url }) => {
  try {
    const missionId = url.searchParams.get('mission');

    const tasks = await sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.task_type,
        t.max_completions,
        t.published_at,
        g.id AS mission_id,
        g.name AS mission_name,
        COALESCE(
          json_agg(
            json_build_object(
              'name', i.name,
              'points', ti.points
            )
            ORDER BY i.name
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS incentives,
        COALESCE(SUM(ti.points), 0) AS total_points
      FROM tasks t
      JOIN groups g ON t.group_id = g.id
      LEFT JOIN task_incentives ti ON t.id = ti.task_id
      LEFT JOIN incentives i ON ti.incentive_id = i.id
      WHERE t.state = ${TaskState.OPEN}
        AND (${missionId}::uuid IS NULL OR t.group_id = ${missionId}::uuid)
      GROUP BY t.id, g.id, g.name
      ORDER BY t.published_at DESC
    `;

    return new Response(
      JSON.stringify({
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          task_type: t.task_type,
          max_completions: t.max_completions,
          mission: {
            id: t.mission_id,
            name: t.mission_name,
          },
          incentives: t.incentives,
          total_points: Number(t.total_points),
          published_at: t.published_at,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
