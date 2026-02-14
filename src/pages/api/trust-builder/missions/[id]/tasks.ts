/**
 * API Route: GET /api/trust-builder/missions/[id]/tasks
 *
 * Returns mission-scoped tasks for members who have joined the mission.
 * Authorization: Member must be an active member of the mission.
 *
 * Story: S4-04 (Mission Task Management)
 * AC9: Returns mission tasks with claim status (unclaimed, claimed_by_me, claimed_by_other)
 */

import type { APIRoute } from 'astro';
import { sql, withTransaction } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const missionId = params.id;

    if (!missionId) {
      return new Response(JSON.stringify({ error: 'Mission ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current user
    const user = await getCurrentUser(request, sql);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client) => {
        // AC18: Check if member is an active member of this mission
        const membershipCheck = await client.query(
          `SELECT 1 
           FROM memberships 
           WHERE member_id = $1 
             AND group_id = $2
             AND status = 'active'`,
          [user.id, missionId]
        );

        if (membershipCheck.rows.length === 0) {
          return {
            isMember: false,
            tasks: [],
          };
        }

        // AC9: Get mission tasks with claim status
        const tasksResult = await client.query(
          `SELECT 
            t.id,
            t.title,
            t.description,
            t.state,
            t.task_type,
            t.max_completions,
            t.group_id,
            g.name as group_name,
            g.stable_id as group_stable_id,
            -- Count existing claims
            (SELECT COUNT(*) FROM claims c WHERE c.task_id = t.id AND c.status IN ('pending', 'approved')) as claim_count,
            -- Check if current member has claimed this task
            EXISTS(
              SELECT 1 FROM claims c 
              WHERE c.task_id = t.id 
                AND c.member_id = $1
                AND c.status IN ('pending', 'approved')
            ) as claimed_by_me,
            -- Check if someone else has claimed task (for max_completions = 1)
            CASE 
              WHEN t.max_completions = 1 THEN
                EXISTS(
                  SELECT 1 FROM claims c
                  WHERE c.task_id = t.id
                    AND c.member_id != $1
                    AND c.status IN ('pending', 'approved')
                )
              ELSE false
            END as claimed_by_other
          FROM tasks t
          LEFT JOIN groups g ON t.group_id = g.id
          WHERE t.group_id = $2
            AND t.state = 'open'
          ORDER BY t.created_at DESC`,
          [user.id, missionId]
        );

        // AC9: Compute claim_status based on claim data
        const tasks = tasksResult.rows.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          state: task.state,
          task_type: task.task_type,
          max_completions: task.max_completions,
          group_id: task.group_id,
          group_name: task.group_name,
          group_stable_id: task.group_stable_id,
          claim_count: parseInt(task.claim_count),
          claim_status: task.claimed_by_me
            ? 'claimed_by_me'
            : task.claimed_by_other
              ? 'claimed_by_other'
              : 'unclaimed',
        }));

        return {
          isMember: true,
          tasks,
        };
      }
    );

    // AC19: If not a member, return helpful message
    if (!result.isMember) {
      return new Response(
        JSON.stringify({
          error: 'Not a member',
          message:
            'Join this mission to view available tasks and start contributing!',
          isMember: false,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasks: result.tasks,
        isMember: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching mission tasks:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch mission tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
