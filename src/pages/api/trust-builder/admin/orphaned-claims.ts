/**
 * S3-03: Get Orphaned Claims (Admin Endpoint)
 *
 * Returns list of orphaned claims for confirmation dialog display
 */

import type { APIRoute } from 'astro';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db/connection';

const TIMEOUT_THRESHOLD_DAYS = 7;

export const GET: APIRoute = async ({ request }) => {
  const member = await getCurrentUser(request, sql);

  if (!member || !['guardian', 'admin'].includes(member.role.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const orphaned = await sql`
      SELECT
        c.id,
        c.task_id,
        t.title AS task_title,
        c.reviewer_id,
        COALESCE(m.display_name, m.email) AS reviewer_name,
        EXTRACT(DAY FROM (NOW() - c.reviewed_at))::NUMERIC AS days_orphaned
      FROM claims c
      JOIN tasks t ON t.id = c.task_id
      LEFT JOIN members m ON m.id = c.reviewer_id
      WHERE c.status = 'under_review'
        AND c.reviewed_at < NOW() - INTERVAL '7 days'
      ORDER BY c.reviewed_at ASC
    `;

    return new Response(JSON.stringify({ orphaned }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Orphaned claims fetch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch orphaned claims',
        orphaned: [],
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
