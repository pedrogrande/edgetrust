/**
 * PATCH /api/trust-builder/claims/[id]/review
 *
 * Submit review decision: approve, reject, or request revision
 */

import type { APIRoute } from 'astro';
import { sql, withTransaction } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth/index';
import {
  approveClaimWithReview,
  rejectClaim,
  requestRevision,
} from '@/lib/contracts/claim-engine';

export const PATCH: APIRoute = async ({ request, params }) => {
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

    const body = await request.json();
    const { decision, feedback } = body as {
      decision: 'approve' | 'reject' | 'revision';
      feedback?: string;
    };

    if (!decision || !['approve', 'reject', 'revision'].includes(decision)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid decision. Must be: approve, reject, or revision',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate feedback for reject and revision (sanctuary culture: supportive)
    if (decision === 'reject' || decision === 'revision') {
      if (!feedback || feedback.trim().length < 20) {
        return new Response(
          JSON.stringify({
            error:
              'Please provide detailed feedback (minimum 20 characters) to help the member improve their submission. Your role is to support their growth.',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Process review decision
    let result;

    try {
      result = await withTransaction(
        import.meta.env.DATABASE_URL,
        async (client) => {
          if (decision === 'approve') {
            return await approveClaimWithReview(
              client,
              claimId,
              currentUser.id,
              feedback
            );
          } else if (decision === 'reject') {
            await rejectClaim(client, claimId, currentUser.id, feedback!);
            return {
              success: true,
              message: 'Claim marked as needing more information',
            };
          } else {
            // revision
            await requestRevision(client, claimId, currentUser.id, feedback!);
            return {
              success: true,
              message:
                'Revision requested. Claim returned to queue for member to improve.',
            };
          }
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'UNAUTHORIZED_REVIEWER') {
          return new Response(
            JSON.stringify({
              error: 'You are not the assigned reviewer for this claim',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (error.message === 'CLAIM_NOT_UNDER_REVIEW') {
          return new Response(
            JSON.stringify({
              error: 'This claim is not currently under review',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (error.message.startsWith('MAX_REVISIONS_REACHED')) {
          return new Response(
            JSON.stringify({
              error:
                'This claim has reached the maximum revision limit (2). Please approve or reject.',
              revisionLimit: 2,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
      throw error;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Review submission error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to submit review decision',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
