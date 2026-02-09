/**
 * Test API Route: Database Verification
 *
 * Verifies the S1-01 database deployment:
 * 1. Counts all tables
 * 2. Lists groups, incentives, tasks
 * 3. Checks event log
 *
 * Usage: GET /api/test-database
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';

export const GET: APIRoute = async () => {
  try {
    // Count records in all tables
    const counts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM groups`,
      sql`SELECT COUNT(*) as count FROM members`,
      sql`SELECT COUNT(*) as count FROM incentives`,
      sql`SELECT COUNT(*) as count FROM tasks`,
      sql`SELECT COUNT(*) as count FROM criteria`,
      sql`SELECT COUNT(*) as count FROM task_incentives`,
      sql`SELECT COUNT(*) as count FROM claims`,
      sql`SELECT COUNT(*) as count FROM proofs`,
      sql`SELECT COUNT(*) as count FROM events`,
      sql`SELECT COUNT(*) as count FROM memberships`,
    ]);

    // Get sample data
    const groups =
      await sql`SELECT name, type, status FROM groups ORDER BY created_at`;
    const incentives =
      await sql`SELECT name FROM incentives ORDER BY created_at`;
    const tasks =
      await sql`SELECT title, state, task_type FROM tasks ORDER BY created_at`;
    const members =
      await sql`SELECT member_id, email, role FROM members ORDER BY created_at`;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'S1-01 Database Deployment Verified',
        counts: {
          groups: (counts[0][0] as any).count,
          members: (counts[1][0] as any).count,
          incentives: (counts[2][0] as any).count,
          tasks: (counts[3][0] as any).count,
          criteria: (counts[4][0] as any).count,
          task_incentives: (counts[5][0] as any).count,
          claims: (counts[6][0] as any).count,
          proofs: (counts[7][0] as any).count,
          events: (counts[8][0] as any).count,
          memberships: (counts[9][0] as any).count,
        },
        data: {
          groups: groups.map((g: any) => ({
            name: g.name,
            type: g.type,
            status: g.status,
          })),
          incentives: incentives.map((i: any) => i.name),
          tasks: tasks.map((t: any) => ({
            title: t.title,
            state: t.state,
            type: t.task_type,
          })),
          members: members.map((m: any) => ({
            member_id: m.member_id,
            email: m.email,
            role: m.role,
          })),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Database verification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
