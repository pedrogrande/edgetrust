/**
 * POST /api/trust-builder/members/[id]/recalculate-trust-score
 *
 * Recalculates Trust Score from events and updates cache
 * Admin-only repair mechanism
 *
 * AC7: "Recalculate Trust Score" button available (admin-only)
 * AC8: Recalculated score matches current cached score (validation test)
 * AC14: Recalculate button logs trust_score.recalculated event
 * AC15: All event logging inside transactions
 */

import type { APIRoute } from 'astro';
import { sql, withTransaction } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth/index';
import {
  calculateTrustScore,
  detectCacheDrift,
} from '@/lib/db/dashboard-queries';

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const currentUser = await getCurrentUser(request, sql);
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // AC7: Admin-only (guardian or steward can recalculate)
    if (!['guardian', 'steward'].includes(currentUser.role)) {
      return new Response(
        JSON.stringify({
          error:
            'Only Stewards and Guardians can recalculate Trust Scores. This ensures data integrity.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
        // Detect cache drift before recalculation
        const driftInfo = await detectCacheDrift(client, memberId);

        // Recalculate Trust Score from events
        const calculatedScore = await calculateTrustScore(client, memberId);

        // Update cache
        await client.query(
          `UPDATE members SET trust_score_cached = $1 WHERE id = $2`,
          [calculatedScore, memberId]
        );

        // AC14: Log trust_score.recalculated event
        await client.query(
          `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            currentUser.id,
            'member',
            memberId,
            'trust_score.recalculated',
            {
              old_value: driftInfo.cached,
              new_value: calculatedScore,
              discrepancy: driftInfo.drift,
              drift_percentage: driftInfo.driftPercentage,
              recalculated_by: currentUser.member_id,
            },
          ]
        );

        // Log drift detection if significant (strategic review MEDIUM priority)
        if (Math.abs(driftInfo.drift) > 5) {
          await client.query(
            `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              currentUser.id,
              'member',
              memberId,
              'trust_score.drift_detected',
              {
                cached_value: driftInfo.cached,
                calculated_value: calculatedScore,
                discrepancy: driftInfo.drift,
                drift_percentage: driftInfo.driftPercentage,
                severity: Math.abs(driftInfo.drift) > 50 ? 'HIGH' : 'LOW',
              },
            ]
          );
        }

        return {
          oldScore: driftInfo.cached,
          newScore: calculatedScore,
          discrepancy: driftInfo.drift,
          driftPercentage: driftInfo.driftPercentage,
        };
      }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Recalculate Trust Score error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to recalculate Trust Score',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
