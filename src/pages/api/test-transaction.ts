/**
 * Test API Route: withTransaction() Helper
 *
 * Tests atomic transaction behavior:
 * 1. Creates a test member
 * 2. Logs a member.created event
 * 3. Returns the new member data
 *
 * Usage: POST /api/test-transaction
 */

import type { APIRoute } from 'astro';
import { withTransaction } from '@/lib/db/connection';
import { logEvent } from '@/lib/events/logger';
import { EventType } from '@/types/trust-builder';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, displayName } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dbUrl = import.meta.env.DATABASE_URL;
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ error: 'DATABASE_URL not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Test atomic transaction: create member + log event
    const result = await withTransaction(dbUrl, async (client) => {
      // Generate Member ID
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM members'
      );
      const count = parseInt(countResult.rows[0].count);
      const nextNumber = count + 1;
      const memberId = `FE-M-${String(nextNumber).padStart(5, '0')}`;

      // Insert member
      const memberResult = await client.query(
        `INSERT INTO members (email, member_id, display_name, role, trust_score_cached)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [email, memberId, displayName || null, 'explorer', 0]
      );

      const member = memberResult.rows[0];

      // Log event
      await client.query(
        `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          member.id,
          'member',
          member.id,
          EventType.MEMBER_CREATED,
          JSON.stringify({ member_id: member.member_id, email: member.email }),
        ]
      );

      return member;
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Member created with atomic transaction and event logged',
        member: {
          id: result.id,
          email: result.email,
          member_id: result.member_id,
          display_name: result.display_name,
          role: result.role,
          trust_score_cached: result.trust_score_cached,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Transaction test error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
