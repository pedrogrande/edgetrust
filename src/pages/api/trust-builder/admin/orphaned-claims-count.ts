/**
 * S3-03: Orphaned Claims Count (Admin Endpoint)
 *
 * Fast query for badge display - returns count only (no claim details)
 */

import type { APIRoute } from 'astro';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db/connection';

const TIMEOUT_THRESHOLD_DAYS = 7;

export const GET: APIRoute = async ({ request }) => {
  const member = await getCurrentUser(request);

  if (!member || !['guardian', 'admin'].includes(member.role.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await sql`
      SELECT COUNT(*)::INTEGER AS count
      FROM claims
      WHERE status = 'under_review'
        AND reviewed_at < NOW() - INTERVAL '${TIMEOUT_THRESHOLD_DAYS} days'
    `;

    return new Response(JSON.stringify({ count: result[0]?.count || 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Orphaned claims count error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch count', count: 0 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
