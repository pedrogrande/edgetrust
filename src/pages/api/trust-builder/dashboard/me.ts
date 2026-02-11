/**
 * GET /api/trust-builder/dashboard/me
 *
 * Returns dashboard data for authenticated member:
 * - Trust Score (event-sourced)
 * - Incentive breakdown by dimension
 * - Claim history (paginated)
 * - Progress to next role
 *
 * AC1: Dashboard displays member's Trust Score within 2s page load
 * AC2: Trust Score matches sum of all claim.approved events
 * AC3: Radial chart visualizes 5 incentive dimensions
 * AC13: Dashboard load logs dashboard.viewed event
 */

import type { APIRoute } from 'astro';
import { sql, withTransaction } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth/index';
import { getDashboardData } from '@/lib/db/dashboard-queries';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const currentUser = await getCurrentUser(request, sql);
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();

    // Get dashboard data in transaction
    const dashboardData = await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client) => {
        const data = await getDashboardData(client, currentUser.id);

        // AC13: Log dashboard.viewed event
        await client.query(
          `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            currentUser.id,
            'member',
            currentUser.id,
            'dashboard.viewed',
            {
              trust_score_at_view: data.trustScore,
              role: data.member.role,
              load_time_ms: Date.now() - startTime,
            },
          ]
        );

        return data;
      }
    );

    const loadTime = Date.now() - startTime;

    // AC26: Performance monitoring
    if (loadTime > 2000) {
      console.warn(
        `Dashboard load time exceeded 2s: ${loadTime}ms for member ${currentUser.member_id}`
      );
    }

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Time': `${loadTime}ms`,
      },
    });
  } catch (error) {
    console.error('Dashboard load error:', error);
    return new Response(
      JSON.stringify({
        error: 'We could not load your dashboard right now.',
        reason: 'This might be a temporary connection issue.',
        nextSteps:
          'Please try refreshing the page. If this persists, contact support@futuresedge.org',
        supportUrl: '/support',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
