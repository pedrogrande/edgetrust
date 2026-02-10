/**
 * Verify API Endpoint
 * POST /api/trust-builder/auth/verify
 *
 * Verifies email + code, creates member if new,
 * sets session cookie, and logs member.created event.
 */

import type { APIRoute } from 'astro';
import { createSessionCookie } from '@/lib/auth';
import { verifyCode } from '@/lib/auth/codes';
import { withTransaction } from '@/lib/db/connection';
import { EventType, type Member } from '@/types/trust-builder';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, code } = body;

    // Validate input
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify code
    if (!verifyCode(email, code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification code' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get DATABASE_URL
    const dbUrl = import.meta.env.DATABASE_URL;
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find or create member with atomic transaction
    const result = await withTransaction(dbUrl, async (client) => {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if member exists
      const existingResult = await client.query(
        'SELECT * FROM members WHERE email = $1',
        [normalizedEmail]
      );

      if (existingResult.rows.length > 0) {
        // Existing member - return without event logging
        return {
          member: existingResult.rows[0] as Member,
          isNew: false,
        };
      }

      // Generate Member ID: FE-M-XXXXX
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM members'
      );
      const count = parseInt(countResult.rows[0].count);
      const nextNumber = count + 1;
      const memberId = `FE-M-${String(nextNumber).padStart(5, '0')}`;

      // Create new member
      const createResult = await client.query(
        `INSERT INTO members (email, member_id, role, trust_score_cached)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [normalizedEmail, memberId, 'explorer', 0]
      );

      const newMember = createResult.rows[0] as Member;

      // Log member.created event
      await client.query(
        `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          newMember.id,
          'member',
          newMember.id,
          EventType.MEMBER_CREATED,
          JSON.stringify({
            member_id: newMember.member_id,
            email: newMember.email,
            role: newMember.role,
          }),
        ]
      );

      return {
        member: newMember,
        isNew: true,
      };
    });

    // Create session cookie
    const sessionCookie = createSessionCookie(result.member.id);

    // Return member profile with session cookie
    return new Response(
      JSON.stringify({
        success: true,
        message: result.isNew ? 'Account created successfully' : 'Welcome back',
        member: {
          id: result.member.id,
          email: result.member.email,
          member_id: result.member.member_id,
          display_name: result.member.display_name,
          role: result.member.role,
          trust_score_cached: result.member.trust_score_cached,
        },
        isNew: result.isNew,
      }),
      {
        status: result.isNew ? 201 : 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': sessionCookie,
        },
      }
    );
  } catch (error) {
    console.error('Verify error:', error);
    return new Response(
      JSON.stringify({
        error: 'Verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
