/**
 * S3-03: Release Orphaned Claims (Admin Endpoint)
 *
 * Manual trigger for releasing claims that have been under review for >7 days.
 * Phase 1: Manual admin trigger (this endpoint)
 * Phase 2 (S4+): Scheduled cron job
 *
 * ONTOLOGY:
 * - Connections: Claim-to-reviewer assignment cleared (reviewer_id = NULL)
 * - Events: claim.timeout_released logged with complete metadata
 * - Things: Claim state transition (under_review → submitted)
 *
 * QUASI-SMART CONTRACT:
 * - Transaction atomic (state update + event log)
 * - Event metadata sufficient for audit trail
 * - No Trust Score penalty (sanctuary culture)
 */

import type { APIRoute } from 'astro';
import { getCurrentUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db/connection';
import { EventType } from '@/types/trust-builder';

// TODO: Move to system_config table in S4+ governance story (per strategic review)
const TIMEOUT_THRESHOLD_DAYS = 7;

interface OrphanedClaim {
  id: string;
  task_id: string;
  task_title: string;
  reviewer_id: string;
  reviewer_name: string;
  days_orphaned: number;
}

export const POST: APIRoute = async ({ request }) => {
  // AC: Admin-only authorization check
  const member = await getCurrentUser(request);

  if (!member || !['guardian', 'admin'].includes(member.role.toLowerCase())) {
    return new Response(
      JSON.stringify({
        error:
          'Admin or Guardian access required to release orphaned claims. Contact your Guardian if you need this permission.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client) => {
        // AC1: Identify orphaned claims (>7 days under review)
        const { rows: orphaned } = await client.query<OrphanedClaim>(`
          SELECT
            c.id,
            c.task_id,
            t.title AS task_title,
            c.reviewer_id,
            COALESCE(m.display_name, m.email) AS reviewer_name,
            EXTRACT(DAY FROM (NOW() - c.reviewed_at))::NUMERIC AS days_orphaned
          FROM claims c
          JOIN tasks t ON t.id = c.task_id
          LEFT JOIN members m ON m.id = c.reviewer_id
          WHERE c.status = 'under_review'
            AND c.reviewed_at < NOW() - INTERVAL '${TIMEOUT_THRESHOLD_DAYS} days'
          ORDER BY c.reviewed_at ASC
        `);

        // AC: Defensive check for zero orphaned claims
        if (orphaned.length === 0) {
          return { released: [], count: 0 };
        }

        // AC2, AC3, AC6: Atomic transaction - Release claims + log events
        await client.query(
          `
          WITH released AS (
            UPDATE claims
            SET status = 'submitted',
                reviewer_id = NULL,
                updated_at = NOW()
            WHERE status = 'under_review'
              AND updated_at < NOW() - INTERVAL '${TIMEOUT_THRESHOLD_DAYS} days'
            RETURNING id, task_id, reviewer_id,
              EXTRACT(DAY FROM (NOW() - updated_at))::NUMERIC AS days_orphaned
          )
          INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
          SELECT
            $1,
            'claim',
            r.id,
            $2,
            jsonb_build_object(
              'claim_id', r.id,
              'task_id', r.task_id,
              'reviewer_id', r.reviewer_id,
              'days_orphaned', r.days_orphaned,
              'timeout_threshold_days', ${TIMEOUT_THRESHOLD_DAYS},
              'admin_id', $1,
              'release_reason', 'timeout'
            )
          FROM released r
        `,
          [member.id, EventType.CLAIM_TIMEOUT_RELEASED]
        );

        // AC5: Return detailed response for admin debugging
        return {
          released: orphaned.map((claim) => ({
            claim_id: claim.id,
            task_title: claim.task_title,
            reviewer_name: claim.reviewer_name,
            days_orphaned: Math.floor(claim.days_orphaned),
          })),
          count: orphaned.length,
        };
      }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Release orphaned claims error:', error);
    return new Response(
      JSON.stringify({
        error:
          'Unable to release claims right now. Please try again in a moment.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
