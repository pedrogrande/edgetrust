/**
 * GET /api/trust-builder/tasks/[id]
 *
 * Returns single task with full details including criteria
 * Public endpoint — no authentication required
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch task with mission details
    const taskResult = await sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.task_type,
        t.max_completions,
        t.state,
        t.published_at,
        g.id AS mission_id,
        g.name AS mission_name
      FROM tasks t
      JOIN groups g ON t.group_id = g.id
      WHERE t.id = ${id}::uuid
    `;

    if (taskResult.length === 0) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const task = taskResult[0];

    // Fetch criteria
    const criteria = await sql`
      SELECT 
        id,
        description,
        proof_type,
        verification_method,
        sort_order
      FROM criteria
      WHERE task_id = ${id}::uuid
      ORDER BY sort_order ASC
    `;

    // Fetch incentives
    const incentives = await sql`
      SELECT 
        i.name,
        ti.points
      FROM task_incentives ti
      JOIN incentives i ON ti.incentive_id = i.id
      WHERE ti.task_id = ${id}::uuid
      ORDER BY i.name
    `;

    const totalPoints = incentives.reduce(
      (sum, inc) => sum + Number(inc.points),
      0
    );

    return new Response(
      JSON.stringify({
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          task_type: task.task_type,
          max_completions: task.max_completions,
          state: task.state,
          mission: {
            id: task.mission_id,
            name: task.mission_name,
          },
          criteria: criteria.map((c) => ({
            id: c.id,
            description: c.description,
            proof_type: c.proof_type,
            verification_method: c.verification_method,
            sort_order: c.sort_order,
          })),
          incentives: incentives.map((i) => ({
            name: i.name,
            points: Number(i.points),
          })),
          total_points: totalPoints,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching task:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
