/**
 * S4-01: Admin Configuration API
 * Endpoints for managing system_config table
 */

import type { APIContext } from 'astro';
import type { PoolClient } from '@neondatabase/serverless';
import { getAllConfigs } from '@/lib/db/config';
import { withTransaction, sql } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/trust-builder/admin/config
 * Fetch all config values (admin only)
 */
export async function GET({ request }: APIContext) {
  const member = await getCurrentUser(request, sql);

  // Authorization check
  if (!member || !['admin', 'guardian'].includes(member.role.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const configs = await getAllConfigs();

    return new Response(JSON.stringify({ configs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching configs:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch configurations' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/trust-builder/admin/config
 * Update a config value (admin only)
 * Body: { key: string, value: any }
 */
export async function POST({ request }: APIContext) {
  const member = await getCurrentUser(request, sql);

  // Authorization check
  if (!member || !['admin', 'guardian'].includes(member.role.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { key, value } = await request.json();

    // Validation
    if (!key || key.trim() === '') {
      return new Response(JSON.stringify({ error: 'Config key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (value === undefined || value === null) {
      return new Response(
        JSON.stringify({ error: 'Config value is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Atomic transaction: update config + log event
    await withTransaction(
      import.meta.env.DATABASE_URL,
      async (client: PoolClient) => {
        // Fetch old value
        const { rows: oldRows } = await client.query(
          'SELECT value FROM system_config WHERE key = $1',
          [key]
        );

        if (oldRows.length === 0) {
          throw new Error(`Config key not found: ${key}`);
        }

        const oldValue = oldRows[0].value;

        // Update config
        // Pass value directly - PostgreSQL driver handles JSONB serialization
        await client.query(
          'UPDATE system_config SET value = $1, updated_at = NOW() WHERE key = $2',
          [value, key]
        );

        // Log event (config.updated in Events dimension)
        // Note: Config events use sentinel UUID (all zeros) since there's no entity UUID
        // The actual config key is stored in metadata.key
        await client.query(
          `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
         VALUES ($1, 'config', '00000000-0000-0000-0000-000000000000', 'config.updated', $2)`,
          [
            member.id,
            {
              key,
              old_value: oldValue,
              new_value: value,
              admin_id: member.id,
              admin_email: member.email,
              updated_at: new Date().toISOString(),
            },
          ]
        );
      }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update configuration',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
