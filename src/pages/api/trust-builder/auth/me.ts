/**
 * Me API Endpoint
 * GET /api/trust-builder/auth/me
 *
 * Returns the currently authenticated member's profile
 * or 401 if not authenticated.
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const member = await getCurrentUser(request, sql);

    if (!member) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return member profile
    return new Response(
      JSON.stringify({
        member: {
          id: member.id,
          email: member.email,
          member_id: member.member_id,
          display_name: member.display_name,
          role: member.role,
          trust_score_cached: member.trust_score_cached,
          created_at: member.created_at,
          updated_at: member.updated_at,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Me endpoint error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get user profile' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
