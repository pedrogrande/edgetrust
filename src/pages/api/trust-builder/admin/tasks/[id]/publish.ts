/**
 * Publish Task API
 * PATCH /api/trust-builder/admin/tasks/[id]/publish
 *
 * Transitions task from draft → open with immutability locking
 */

import type { APIRoute } from 'astro';
import { requireRole } from '@/lib/auth';
import { sql } from '@/lib/db/connection';
import { logEvent } from '@/lib/events/logger';
import { EventType, TaskState } from '@/types/trust-builder';

export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    // Guardian role check
    const member = await requireRole(request, sql, 'guardian');

    const { id: taskId } = params;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch task with metadata for event logging
    const tasks = await sql`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM criteria WHERE task_id = t.id) as criteria_count,
        (SELECT COALESCE(SUM(points), 0) FROM task_incentives WHERE task_id = t.id) as total_points
      FROM tasks t
      WHERE t.id = ${taskId}
    `;

    if (tasks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const task = tasks[0];

    // Race condition protection: check current state
    if (task.state !== TaskState.DRAFT) {
      if (task.state === TaskState.OPEN) {
        return new Response(
          JSON.stringify({
            error: 'This task has already been published by another Guardian. Refresh the page to see the current state.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: `Task is currently in '${task.state}' state and cannot be published. Only draft tasks can be published.`,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Atomic update: state transition + published_at + event
    const updatedTasks = await sql`
      UPDATE tasks
      SET 
        state = ${TaskState.OPEN},
        published_at = NOW(),
        updated_at = NOW()
      WHERE id = ${taskId} AND state = ${TaskState.DRAFT}
      RETURNING *
    `;

    // Double-check update succeeded (additional race protection)
    if (updatedTasks.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'This task has already been published. Refresh the page to see the current state.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log task.published event
    await logEvent({
      sql,
      actorId: member.id,
      entityType: 'task',
      entityId: taskId,
      eventType: EventType.TASK_PUBLISHED,
      metadata: {
        task_id: taskId,
        title: task.title,
        group_id: task.group_id,
        criteria_count: Number(task.criteria_count),
        total_points: Number(task.total_points),
        actor_id: member.id,
        state: TaskState.OPEN,
        published_at: updatedTasks[0].published_at,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Task published successfully. Core fields are now immutable.',
        task: {
          id: updatedTasks[0].id,
          title: updatedTasks[0].title,
          state: updatedTasks[0].state,
          published_at: updatedTasks[0].published_at,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // If error is already a Response (from requireRole), re-throw it
    if (error instanceof Response) {
      return error;
    }

    console.error('Task publish error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to publish task',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : String(error)) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
