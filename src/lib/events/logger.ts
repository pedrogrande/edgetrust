/**
 * Event Logger — Genesis Audit Trail
 *
 * Cross-cutting foundation for the append-only event ledger.
 * All state changes MUST log events using this utility.
 *
 * IMPORTANT: Always use EventType enum values — never raw strings.
 */

import type { NeonQueryFunction } from '@neondatabase/serverless';
import { EventType } from '@/types/trust-builder';

export interface LogEventParams {
  sql: NeonQueryFunction<false, false>;
  actorId: string;
  entityType: string;
  entityId: string;
  eventType: EventType;
  metadata?: Record<string, unknown>;
}

/**
 * Log an immutable event to the Genesis audit trail
 *
 * @example
 * ```typescript
 * await logEvent({
 *   sql,
 *   actorId: member.id,
 *   entityType: 'member',
 *   entityId: member.id,
 *   eventType: EventType.MEMBER_CREATED,
 *   metadata: { member_id: member.member_id, email: member.email }
 * });
 * ```
 */
export async function logEvent({
  sql,
  actorId,
  entityType,
  entityId,
  eventType,
  metadata = {},
}: LogEventParams): Promise<void> {
  await sql`
    INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
    VALUES (${actorId}, ${entityType}, ${entityId}, ${eventType}, ${JSON.stringify(metadata)})
  `;
}

/**
 * Batch log multiple events atomically
 * Use within withTransaction() when logging multiple related events
 *
 * @example
 * ```typescript
 * await withTransaction(dbUrl, async (client) => {
 *   // ... perform operations ...
 *   await logEventBatch(client, [
 *     { actorId, entityType: 'claim', entityId: claimId, eventType: EventType.CLAIM_SUBMITTED, metadata: {} },
 *     { actorId, entityType: 'claim', entityId: claimId, eventType: EventType.CLAIM_APPROVED, metadata: { points: 50 } },
 *     { actorId, entityType: 'member', entityId: actorId, eventType: EventType.TRUST_UPDATED, metadata: { newScore: 100 } },
 *   ]);
 * });
 * ```
 */
export async function logEventBatch(
  client: { query: (text: string, values: unknown[]) => Promise<unknown> },
  events: Array<Omit<LogEventParams, 'sql'>>
): Promise<void> {
  for (const event of events) {
    await client.query(
      'INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata) VALUES ($1, $2, $3, $4, $5)',
      [
        event.actorId,
        event.entityType,
        event.entityId,
        event.eventType,
        JSON.stringify(event.metadata ?? {}),
      ]
    );
  }
}
