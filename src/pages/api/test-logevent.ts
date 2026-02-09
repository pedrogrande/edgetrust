/**
 * Test API Route: logEvent() Function
 *
 * Tests event logging with EventType enum:
 * 1. Retrieves system member
 * 2. Logs a test trust.updated event
 * 3. Returns event confirmation
 *
 * Usage: POST /api/test-logevent
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { logEvent } from '@/lib/events/logger';
import { EventType } from '@/types/trust-builder';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { memberId, newScore } = await request.json();

    if (!memberId || typeof newScore !== 'number') {
      return new Response(
        JSON.stringify({ error: 'memberId and newScore are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get member by member_id (e.g., "FE-M-00001")
    const memberResult = await sql`
      SELECT * FROM members WHERE member_id = ${memberId}
    `;

    if (memberResult.length === 0) {
      return new Response(
        JSON.stringify({ error: `Member ${memberId} not found` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const member = memberResult[0] as any;

    // Log trust.updated event
    await logEvent({
      sql,
      actorId: member.id,
      entityType: 'member',
      entityId: member.id,
      eventType: EventType.TRUST_UPDATED,
      metadata: {
        old_score: member.trust_score_cached,
        new_score: newScore,
        member_id: member.member_id,
      },
    });

    // Verify event was logged
    const eventCheck = await sql`
      SELECT COUNT(*) as count
      FROM events
      WHERE entity_id = ${member.id}
        AND event_type = ${EventType.TRUST_UPDATED}
    `;

    const eventCount = (eventCheck[0] as any).count;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Event logged successfully with EventType enum',
        event: {
          actor_id: member.id,
          entity_type: 'member',
          entity_id: member.id,
          event_type: EventType.TRUST_UPDATED,
          metadata: {
            old_score: member.trust_score_cached,
            new_score: newScore,
            member_id: member.member_id,
          },
        },
        total_events_for_member: eventCount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Event logging test error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
