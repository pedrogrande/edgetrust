/**
 * S3-03: Orphaned Claims Count (Admin Endpoint)
 * S4-01: Updated to use system_config table for timeout threshold
 *
 * Fast query for badge display - returns count only (no claim details)
 */

import type { APIRoute } from 'astro';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db/connection';
import { getConfigNumber } from '@/lib/db/config';

export const GET: APIRoute = async ({ request }) => {
  const member = await getCurrentUser(request, sql);

  if (!member || !['guardian', 'admin'].includes(member.role.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // S4-01: Read timeout from config table
    const timeoutDays = await getConfigNumber('claim_timeout_days');

    const result = await sql`
      SELECT COUNT(*)::INTEGER AS count
      FROM claims
      WHERE status = 'under_review'
        AND reviewed_at < NOW() - INTERVAL ${timeoutDays} || ' days'
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
