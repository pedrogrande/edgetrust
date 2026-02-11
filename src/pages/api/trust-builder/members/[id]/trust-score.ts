/**
 * GET /api/trust-builder/members/[id]/trust-score
 *
 * Returns Trust Score breakdown for a specific member (public endpoint)
 * Used for leaderboard (S4) and governance voting weight (S5)
 *
 * AC2: Trust Score matches sum of all claim.approved events
 * AC9: Trust Score derivable from events alone
 */

import type { APIRoute } from 'astro';
import { withTransaction } from '@/lib/db/connection';
import {
  calculateTrustScore,
  getIncentiveBreakdown,
} from '@/lib/db/dashboard-queries';

export const GET: APIRoute = async ({ params }) => {
  try {
    const memberId = params.id;
    if (!memberId) {
      return new Response(JSON.stringify({ error: 'Missing member ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client) => {
        // Verify member exists
        const memberResult = await client.query(
          `SELECT id, member_id, display_name, role FROM members WHERE id = $1`,
          [memberId]
        );

        if (memberResult.rows.length === 0) {
          throw new Error('MEMBER_NOT_FOUND');
        }

        const member = memberResult.rows[0];

        // Calculate Trust Score from events
        const trustScore = await calculateTrustScore(client, memberId);

        // Get incentive breakdown
        const incentiveBreakdown = await getIncentiveBreakdown(
          client,
          memberId
        );

        return {
          member: {
            id: member.id,
            memberId: member.member_id,
            displayName: member.display_name,
            role: member.role,
          },
          trustScore,
          incentiveBreakdown,
        };
      }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'MEMBER_NOT_FOUND') {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('Trust Score fetch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch Trust Score',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
