/**
 * POST /api/trust-builder/reviews/[id]/release
 *
 * Voluntarily release a claim back to the queue
 */

import type { APIRoute } from 'astro';
import { sql, withTransaction } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth/index';
import { releaseClaim } from '@/lib/contracts/claim-engine';

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

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Reviewer voluntarily released claim';

    // Release claim
    await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
      await releaseClaim(client, claimId, currentUser.id, reason);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Claim released back to queue',
        claimId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Claim release error:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED_REVIEWER') {
        return new Response(
          JSON.stringify({ error: 'You are not the assigned reviewer' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (error.message === 'CLAIM_NOT_UNDER_REVIEW') {
        return new Response(
          JSON.stringify({ error: 'Claim is not currently under review' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to release claim',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
