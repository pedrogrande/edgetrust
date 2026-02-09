# Story S1-01: Database Schema, Connection & Seed Data

**Sprint**: 1
**Points**: 3
**Agent**: `fullstack-developer`
**Depends on**: None — this is the foundation story
**Status**: Ready for implementation

---

## Goal

Establish the complete database foundation for Trust Builder so that all subsequent stories (auth, tasks, claims, dashboard) have a solid, typed, migration-ready data layer to build on.

## Ontology Mapping

| Dimension       | What this story creates                                      |
| --------------- | ------------------------------------------------------------ |
| **Groups**      | `groups` table — Colony root + Mission sub-groups            |
| **People**      | `members` table — structure ready for auth story             |
| **Things**      | `tasks`, `criteria`, `incentives` tables — contract entities |
| **Connections** | `task_incentives`, `memberships`, `claims`, `proofs` tables  |
| **Events**      | `events` table — append-only audit ledger                    |
| **Knowledge**   | Query helpers for derived Trust Score calculation            |

## User Story (Gherkin)

```gherkin
Given the NeonDB project is provisioned with a DATABASE_URL
When the fullstack-developer runs the schema migration
Then all 10 tables are created with correct types, constraints, and indices:
  | Table            | Purpose                              |
  | groups           | Missions and Colony containers       |
  | members          | People with Member IDs               |
  | tasks            | Contracts with states                |
  | criteria         | Acceptance criteria per task         |
  | incentives       | 5 predefined incentive dimensions    |
  | task_incentives  | Points linking tasks to incentives   |
  | memberships      | Member-to-Mission connections        |
  | claims           | Submission records                   |
  | proofs           | Evidence per criterion               |
  | events           | Immutable audit log                  |
And the "Future's Edge" Colony group is seeded
And the "Webinar Series Season 0" Mission is seeded
And 5 incentive types are seeded (Participation, Collaboration, Innovation, Leadership, Impact)
And 2 starter tasks are seeded with criteria and incentive allocations:
  | Task                      | Type   | Verify       | Points |
  | Attend Live Webinar       | Simple | Auto-approve | 50     |
  | Basic Webinar Reflection  | Simple | Auto-approve | 25     |
And TypeScript types are exported matching all table structures
And typed query helpers are available for common operations
```

## Acceptance Criteria

- [ ] `src/lib/db/connection.ts` exports a working NeonDB connection using `@neondatabase/serverless` AND a `withTransaction()` helper for atomic multi-step operations
- [ ] `src/lib/db/schema.sql` contains DDL for all 10 tables with:
  - UUID primary keys using `gen_random_uuid()`
  - Foreign key constraints
  - Indices on `tasks.group_id`, `tasks.state`, `claims.member_id`, `claims.task_id`, `events.entity_id`, `events.actor_id`
  - CHECK constraints for task states and claim statuses
  - `events` table uses `BIGSERIAL` PK and comment documenting REVOKE UPDATE/DELETE
- [ ] `src/lib/db/seed.sql` populates Colony, Mission, 5 incentives, 2 tasks with criteria and task_incentives
- [ ] `src/types/trust-builder.ts` exports interfaces for all tables + enums for states/statuses + `EventType` enum with canonical event type taxonomy
- [ ] `src/lib/db/queries.ts` exports typed query functions (at minimum: `getOpenTasks`, `getTaskById`, `getMemberByEmail`, `createMember`, `getClaimsByMember`, `getApprovedPointsByMember`)
- [ ] Schema runs clean on a fresh NeonDB database
- [ ] Seed data populates correctly (verified by SELECT queries)
- [ ] All TypeScript compiles without errors
- [ ] `src/lib/events/logger.ts` exports a working `logEvent()` function that inserts into the events table
- [ ] Connection works on Cloudflare Workers edge runtime (no Node.js-only APIs)
- [ ] `withTransaction()` helper works for multi-statement atomic operations (verified with a test INSERT + SELECT)

## Technical Notes

### NeonDB Connection Pattern

```typescript
import { neon } from '@neondatabase/serverless';
const sql = neon(import.meta.env.DATABASE_URL);
```

- Use the HTTP driver (`neon()`) for one-shot queries — fastest, simplest
- `import.meta.env.DATABASE_URL` is the Astro way to access env vars
- For **non-interactive batched transactions**, use `sql.transaction([...])` — sends multiple queries atomically over HTTP
- For **interactive transactions** (where step N depends on step N-1 results), use `Pool`/`Client` via WebSocket within a single request handler
- Export a `withTransaction()` helper from `connection.ts` that abstracts this:

```typescript
import { Pool } from '@neondatabase/serverless';

export async function withTransaction<T>(
  dbUrl: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
```

- **Why this matters**: The claim-engine (S1-04) needs atomic multi-step operations (create claim + proofs + approve + update trust score + log events). Without `withTransaction()`, atomicity breaks and the quasi-smart contract guarantee fails.
- WebSocket Pool/Client connections CAN be used on Cloudflare Workers — they just can't outlive the request handler

### Schema Design Principles (from doc 04)

- UUIDs for all PKs (migration-ready, unique across systems)
- `events` table is append-only: application user should only have INSERT + SELECT
- Trust Score is **derived** (summed from approved claims), not a first-class stored value — `members.trust_score_cached` is a cache for display performance only. **Note**: `trust_score_cached` is NOT migrated to future systems — only event-derived scores are authoritative.
- Task states: `draft`, `open`, `in_progress`, `complete`, `expired`, `cancelled`
- Claim statuses: `submitted`, `under_review`, `revision_requested`, `approved`, `rejected`

### Seed Data Shortcut Note

Seed tasks are inserted directly in `open` state with `published_at` set. This **bypasses the Draft→Open lifecycle** for convenience. The quasi-smart contract spec (doc 05) says publishing is a one-way gate — production task creation (S2) must go through Draft→Open. Seed data is the only exception.

### EventType Enum (canonical taxonomy)

The types file must include a canonical `EventType` enum to prevent drift across stories:

```typescript
export enum EventType {
  // S1: Core lifecycle
  MEMBER_CREATED = 'member.created',
  CLAIM_SUBMITTED = 'claim.submitted',
  CLAIM_APPROVED = 'claim.approved',
  CLAIM_REJECTED = 'claim.rejected', // placeholder for S2
  TRUST_UPDATED = 'trust.updated',

  // S2: Admin & reviewer workflows (placeholders)
  TASK_CREATED = 'task.created',
  TASK_PUBLISHED = 'task.published',
  TASK_CANCELLED = 'task.cancelled',
  MEMBERSHIP_JOINED = 'membership.joined',
  CLAIM_REVISION_REQUESTED = 'claim.revision_requested',
}
```

All stories must import and use `EventType` values — never raw strings.

### Event Logger (`logEvent()`)

This story creates the event logger utility that all subsequent stories depend on:

```typescript
// src/lib/events/logger.ts
import type { EventType } from '@/types/trust-builder';

export async function logEvent({
  sql,
  actorId,
  entityType,
  entityId,
  eventType,
  metadata,
}: {
  sql: NeonQueryFunction;
  actorId: string;
  entityType: string;
  entityId: string;
  eventType: EventType;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await sql`INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
    VALUES (${actorId}, ${entityType}, ${entityId}, ${eventType}, ${JSON.stringify(metadata ?? {})})`;
}
```

### Dashboard Aggregation Query

Include a `getApprovedPointsByMember` query that handles the non-trivial join for dimension breakdown:

```sql
SELECT i.name AS dimension, SUM(ti.points) AS total
FROM claims c
JOIN task_incentives ti ON ti.task_id = c.task_id
JOIN incentives i ON i.id = ti.incentive_id
WHERE c.member_id = $1 AND c.status = 'approved'
GROUP BY i.name
```

### Incentive Seed Values (from doc 06)

| Name          | Description                                         |
| ------------- | --------------------------------------------------- |
| Participation | Showing up, attending events, basic engagement      |
| Collaboration | Helping others, peer review, teamwork               |
| Innovation    | New ideas, research, prototyping, creative input    |
| Leadership    | Initiative, mentoring, proposing missions           |
| Impact        | Direct mission advancement, external value creation |

### Task Seed Values

**Attend Live Webinar**: task_incentives = [{ Participation: 50 }], verification = auto_approve, max_completions = unlimited
**Basic Webinar Reflection**: task_incentives = [{ Participation: 15 }, { Innovation: 10 }], verification = auto_approve, max_completions = unlimited

## Files to Create

```
src/
  lib/
    db/
      connection.ts      # NeonDB connection + withTransaction() helper
      schema.sql         # Full DDL for all tables
      seed.sql           # Colony, Mission, Incentives, Tasks
      queries.ts         # Typed query helpers (incl. aggregation)
    events/
      logger.ts          # logEvent() utility — cross-cutting foundation
  types/
    trust-builder.ts     # TypeScript interfaces, enums + EventType
```

## DoD

- [ ] All acceptance criteria pass
- [ ] Schema and seed verified by running against NeonDB
- [ ] `product-advisor` confirms ontology alignment (target: B+)
- [ ] Ready for S1-02 (Auth) and S1-03 (Task List) to begin

---

## Smoke Test (qa-engineer runs this)

1. Run `schema.sql` against a fresh NeonDB database
2. ASSERT: All 10 tables created (query `information_schema.tables`)
3. Run `seed.sql`
4. ASSERT: `SELECT COUNT(*) FROM groups` = 2 (Colony + Mission)
5. ASSERT: `SELECT COUNT(*) FROM incentives` = 5
6. ASSERT: `SELECT COUNT(*) FROM tasks` = 2, both with `state = 'open'`
7. ASSERT: `SELECT COUNT(*) FROM task_incentives` = 3 (50 + 15 + 10)
8. Test `withTransaction()`: run a multi-statement INSERT inside a transaction, then verify both rows exist
9. Test `logEvent()`: call it with a test event, verify row in `events` table
10. ASSERT: TypeScript compiles with `tsc --noEmit`

---

## Handoff

When complete, hand off to:

1. `qa-engineer` — verify schema integrity, seed data, and smoke test
2. `fullstack-developer` — begin S1-02 (Auth) and S1-03 (Task List) in parallel
