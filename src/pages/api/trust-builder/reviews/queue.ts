/**
 * GET /api/trust-builder/reviews/queue
 *
 * Returns claims awaiting peer review
 * Filters out self-reviews and checks reviewer eligibility
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth/index';

export const GET: APIRoute = async ({ request }) => {
  try {
    const currentUser = await getCurrentUser(request, sql);
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check reviewer eligibility (Contributor 250+ or Steward 500+)
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

    // Get claims awaiting review (excluding self-reviews)
    const claimsResult = await sql`
      SELECT 
        c.id,
        c.member_id,
        c.task_id,
        c.submitted_at,
        c.revision_count,
        t.title as task_title,
        t.description as task_description,
        t.verification_method,
        m.display_name as member_display_name,
        m.member_id as member_identifier,
        m.trust_score_cached as member_trust_score,
        (SELECT COUNT(*) FROM proofs WHERE claim_id = c.id) as proof_count
       FROM claims c
       JOIN tasks t ON t.id = c.task_id
       JOIN members m ON m.id = c.member_id
       WHERE c.status = 'submitted'
         AND t.verification_method = 'peer_review'
         AND c.member_id != ${currentUser.id}
       ORDER BY c.submitted_at ASC
    `;

    // Get active review count for current user
    const activeResult = await sql`
      SELECT COUNT(*) as count 
       FROM claims 
       WHERE reviewer_id = ${currentUser.id} AND status = 'under_review'
    `;

    const activeReviewCount = Number(
      (activeResult[0] as { count: string }).count
    );

    const claims = claimsResult.map((row: any) => {
      const claim = row as {
        id: string;
        member_id: string;
        task_id: string;
        submitted_at: Date;
        revision_count: number;
        task_title: string;
        task_description: string;
        verification_method: string;
        member_display_name: string;
        member_identifier: string;
        member_trust_score: number;
        proof_count: string;
      };

      return {
        id: claim.id,
        memberId: claim.member_id,
        memberDisplayName: claim.member_display_name,
        memberIdentifier: claim.member_identifier,
        memberTrustScore: claim.member_trust_score,
        taskId: claim.task_id,
        taskTitle: claim.task_title,
        taskDescription: claim.task_description,
        submittedAt: claim.submitted_at,
        revisionCount: claim.revision_count,
        proofCount: Number(claim.proof_count),
      };
    });

    return new Response(
      JSON.stringify({
        claims: claims,
        queueDepth: claims.length,
        activeReviewCount,
        maxActiveReviews: 3, // AC27: Max 3 active reviews per reviewer
        canReviewMore: activeReviewCount < 3,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Review queue error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch review queue',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
