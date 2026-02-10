/**
 * Admin Task Management API
 * POST /api/trust-builder/admin/tasks - Create draft task
 * GET /api/trust-builder/admin/tasks - List all tasks (including drafts)
 *
 * Guardian-only endpoints for task authoring
 */

import type { APIRoute } from 'astro';
import { requireRole } from '@/lib/auth';
import { sql, withTransaction } from '@/lib/db/connection';
import { logEvent } from '@/lib/events/logger';
import {
  EventType,
  TaskState,
  TaskType,
  VerificationMethod,
} from '@/types/trust-builder';

/**
 * POST - Create draft task with criteria and incentives
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Guardian role check
    const member = await requireRole(request, sql, 'guardian');

    const body = await request.json();
    const {
      group_id,
      title,
      rationale,
      description,
      task_type,
      verification_method,
      max_completions,
      criteria = [],
      incentives = [], // Array of { incentive_id, points }
    } = body;

    // Validation: Required fields
    if (!group_id || !title || !task_type || !verification_method) {
      return new Response(
        JSON.stringify({
          error:
            'Tasks need a mission, title, type, and verification method to be meaningful. Please fill in all required fields.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: At least one criterion
    if (!criteria || criteria.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Tasks need at least one acceptance criterion to be meaningful. This helps members know what success looks like. Please add criteria before saving.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validation: At least some incentive points
    if (!incentives || incentives.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Tasks should offer at least some points in one of the five dimensions (Participation, Collaboration, Innovation, Leadership, Impact). This recognizes member contributions. Please add incentive points.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate group exists and is a mission
    const groups = await sql`
      SELECT id, type FROM groups WHERE id = ${group_id} AND status = 'active'
    `;

    if (groups.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'The selected Mission does not exist or is not active. Please choose a valid Mission.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (groups[0].type !== 'mission') {
      return new Response(
        JSON.stringify({
          error:
            'Tasks must be assigned to a Mission, not a Colony. Colonies are organizational containers, while Missions have specific goals where tasks belong. Please select a Mission from the dropdown.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Atomic transaction: task + criteria + incentives + event
    const task = await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client) => {
        // 1. INSERT task (draft state)
        const {
          rows: [newTask],
        } = await client.query(
          `INSERT INTO tasks (
          group_id, title, rationale, description, state, task_type, 
          verification_method, max_completions, version, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
          [
            group_id,
            title,
            rationale || null,
            description || null,
            TaskState.DRAFT,
            task_type,
            verification_method,
            max_completions || null,
            1, // version
            member.id,
          ]
        );

        // 2. INSERT criteria
        for (let i = 0; i < criteria.length; i++) {
          const criterion = criteria[i];
          await client.query(
            `INSERT INTO criteria (task_id, description, proof_type, verification_method, sort_order, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              newTask.id,
              criterion.description,
              criterion.proof_type,
              criterion.verification_method || verification_method, // inherit from task if not specified
              i,
            ]
          );
        }

        // 3. INSERT task_incentives
        let totalPoints = 0;
        for (const incentive of incentives) {
          if (incentive.points > 0) {
            await client.query(
              `INSERT INTO task_incentives (task_id, incentive_id, points, created_at)
             VALUES ($1, $2, $3, NOW())`,
              [newTask.id, incentive.incentive_id, incentive.points]
            );
            totalPoints += incentive.points;
          }
        }

        // 4. LOG task.created event
        await client.query(
          `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            member.id,
            'task',
            newTask.id,
            EventType.TASK_CREATED,
            JSON.stringify({
              task_id: newTask.id,
              title: newTask.title,
              group_id: newTask.group_id,
              criteria_count: criteria.length,
              total_points: totalPoints,
              actor_id: member.id,
              state: newTask.state,
            }),
          ]
        );

        return newTask;
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Task draft created successfully',
        task: {
          id: task.id,
          title: task.title,
          state: task.state,
          created_at: task.created_at,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // If error is already a Response (from requireRole), re-throw it
    if (error instanceof Response) {
      return error;
    }

    console.error('Task creation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create task draft',
        details: import.meta.env.DEV
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * GET - List all tasks (including drafts) for Guardians
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    // Guardian role check
    await requireRole(request, sql, 'guardian');

    // Fetch all tasks with group and creator information
    const tasks = await sql`
      SELECT 
        t.*,
        g.name as mission_name,
        m.member_id as creator_member_id,
        m.display_name as creator_display_name,
        (SELECT COUNT(*) FROM criteria WHERE task_id = t.id) as criteria_count,
        (SELECT COALESCE(SUM(points), 0) FROM task_incentives WHERE task_id = t.id) as total_points
      FROM tasks t
      JOIN groups g ON t.group_id = g.id
      JOIN members m ON t.created_by = m.id
      ORDER BY t.created_at DESC
    `;

    return new Response(
      JSON.stringify({
        success: true,
        tasks,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // If error is already a Response (from requireRole), re-throw it
    if (error instanceof Response) {
      return error;
    }

    console.error('Task listing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to list tasks',
        details: import.meta.env.DEV
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
