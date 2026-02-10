/**
 * POST /api/trust-builder/reviews/[id]/assign
 *
 * Assign a claim to the current reviewer (atomic with race condition protection)
 */

import type { APIRoute } from 'astro';
import { sql, withTransaction } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth/index';
import { assignClaimToReviewer } from '@/lib/contracts/claim-engine';

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const currentUser = await getCurrentUser(request, sql);
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const claimId = params.id;
    if (!claimId) {
      return new Response(JSON.stringify({ error: 'Missing claim ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check reviewer eligibility
    if (currentUser.trust_score_cached < 250) {
      return new Response(
        JSON.stringify({
          error:
            'You need a Trust Score of at least 250 (Contributor level) to review claims',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check active review count (max 3)
    const activeResult = await sql`
      SELECT COUNT(*) as count 
       FROM claims 
       WHERE reviewer_id = ${currentUser.id} AND status = 'under_review'
    `;

    const activeReviewCount = Number(
      (activeResult[0] as { count: string }).count
    );

    if (activeReviewCount >= 3) {
      return new Response(
        JSON.stringify({
          error:
            'You have reached the maximum of 3 active reviews. Please complete or release a review before claiming another.',
          activeReviewCount,
          maxActiveReviews: 3,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check that this is not the reviewer's own claim
    const claimResult = await sql`
      SELECT member_id FROM claims WHERE id = ${claimId}
    `;

    if (claimResult.length === 0) {
      return new Response(JSON.stringify({ error: 'Claim not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const claim = claimResult[0] as { member_id: string };
    if (claim.member_id === currentUser.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot review your own claim' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Assign claim (atomic with race condition protection)
    const result = await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client) => {
        return await assignClaimToReviewer(client, claimId, currentUser.id);
      }
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error:
            'This claim was just assigned to another reviewer. Please select a different claim from the queue.',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Claim successfully assigned to you for review',
        claimId,
        reviewDeadline: new Date(
          Date.now() + 72 * 60 * 60 * 1000
        ).toISOString(),
        queueDepthAtAssignment: result.queueDepth,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Claim assignment error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to assign claim',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
