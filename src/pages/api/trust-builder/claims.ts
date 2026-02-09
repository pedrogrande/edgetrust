/**
 * Claims API Endpoint
 * POST /api/trust-builder/claims - Submit a new claim
 * GET /api/trust-builder/claims - List member's claims
 */

import type { APIRoute } from 'astro';
import { withTransaction, sql } from '@/lib/db/connection';
import {
  processClaimSubmission,
  type ProofInput,
} from '@/lib/contracts/claim-engine';
import { getClaimsByMember } from '@/lib/db/queries';
import { getCurrentUser } from '@/lib/auth';
import { validateUUID } from '@/lib/contracts/validators';

/**
 * POST /api/trust-builder/claims
 * Submit a claim on a task with proof of completion
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Auth check
    const user = await getCurrentUser(request, sql);
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'You must be signed in to submit a claim',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: { task_id: string; proofs: ProofInput[] };
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          message: 'Request must be valid JSON',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { task_id, proofs } = body;

    // Validate required fields
    if (!task_id || !proofs || !Array.isArray(proofs)) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'task_id and proofs array are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format (learned from S1-03: return 400, not 500)
    try {
      validateUUID(task_id, 'task_id');
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid task_id',
          message:
            error instanceof Error ? error.message : 'Invalid UUID format',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process claim submission atomically
    const dbUrl = import.meta.env.DATABASE_URL;
    let result;

    try {
      result = await withTransaction(dbUrl, async (client) => {
        return await processClaimSubmission(client, user.id, task_id, proofs);
      });
    } catch (error) {
      // Handle known business logic errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      const errorMap: Record<string, { status: number; message: string }> = {
        TASK_NOT_FOUND: {
          status: 404,
          message: 'Task not found',
        },
        TASK_NOT_OPEN: {
          status: 410,
          message: 'This task is no longer accepting claims',
        },
        DUPLICATE_CLAIM: {
          status: 409,
          message: 'You have already claimed this task',
        },
        MAX_COMPLETIONS_REACHED: {
          status: 410,
          message: 'This task has reached its completion limit',
        },
        TASK_HAS_NO_CRITERIA: {
          status: 400,
          message: 'Task has no acceptance criteria',
        },
        MEMBER_NOT_FOUND: {
          status: 404,
          message: 'Member not found',
        },
      };

      // Check for known error types
      for (const [errorType, response] of Object.entries(errorMap)) {
        if (errorMessage.includes(errorType)) {
          return new Response(
            JSON.stringify({ error: errorType, message: response.message }),
            {
              status: response.status,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Handle validation errors (proof requirements, etc.)
      if (
        errorMessage.includes('PROOF_COUNT_MISMATCH') ||
        errorMessage.includes('MISSING_PROOF') ||
        errorMessage.includes('Proof text')
      ) {
        return new Response(
          JSON.stringify({ error: 'Validation error', message: errorMessage }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Unexpected error
      console.error('Claim submission error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: 'An unexpected error occurred while processing your claim',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Success response
    const responseData = {
      claim_id: result.claimId,
      status: result.status,
      message: result.message,
      ...(result.pointsEarned !== undefined && {
        points_earned: result.pointsEarned,
      }),
      ...(result.newTrustScore !== undefined && {
        new_trust_score: result.newTrustScore,
      }),
    };

    return new Response(JSON.stringify(responseData), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Claims API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * GET /api/trust-builder/claims
 * List claims for the authenticated member
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    // Auth check
    const user = await getCurrentUser(request, sql);
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'You must be signed in',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch member's claims
    const claims = await getClaimsByMember(user.id);

    return new Response(JSON.stringify({ claims }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get claims error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to retrieve claims',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
