# Pattern: Event Sourcing

**Purpose**: Copy-paste implementation for event logging  
**Migration Critical**: Yes (events → IPFS → on-chain)  
**Complexity**: Simple  
**Time**: 10 min implementation

---

## Pattern Overview

**Event Sourcing** = All state changes logged to append-only events table

**Why**:

- Database state can be rebuilt from events (disaster recovery)
- Disputes resolved by replaying events (audit trail)
- Blockchain migration = export events + replay on-chain
- Trust Scores derivable (query events, sum points)

---

## Implementation

### 1. Event Schema (Already exists in database)

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,     -- 'domain.action' format
  actor_id UUID,                         -- Who did it
  entity_type VARCHAR(50),               -- What was affected
  entity_id UUID,                        -- Which instance
  metadata JSONB DEFAULT '{}',           -- Rich context
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. Basic Event Logging

```typescript
import { withTransaction } from '@/lib/db/connection';

// Inside API handler
await withTransaction(process.env.DATABASE_URL, async (client) => {
  // 1. Capture state BEFORE mutation
  const before = await client.query(
    'SELECT trust_score_cached FROM members WHERE id = $1',
    [memberId]
  );
  const trust_score_before = before.rows[0].trust_score_cached;

  // 2. Perform state mutation
  await client.query(
    'UPDATE members SET trust_score_cached = trust_score_cached + $1 WHERE id = $2',
    [points, memberId]
  );

  // 3. Capture state AFTER mutation
  const after = await client.query(
    'SELECT trust_score_cached FROM members WHERE id = $1',
    [memberId]
  );
  const trust_score_after = after.rows[0].trust_score_cached;

  // 4. Log event (same transaction!)
  await client.query(
    `INSERT INTO events (event_type, actor_id, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      'claim.approved', // Event type
      reviewerId, // Who did it
      'claim', // What was affected
      claimId, // Which instance
      {
        // Rich metadata for reconstruction
        trust_score_before,
        trust_score_after,
        points_awarded: points,
        verification_notes: 'LGTM',
        reviewer_feedback: 'Great work!',
      },
    ]
  );
});
```

---

### 3. Event Type Naming Convention

**Format**: `domain.action`

**Examples**:

- `member.created` - New member registered
- `claim.submitted` - Member submitted proof
- `claim.approved` - Reviewer approved claim
- `claim.rejected` - Reviewer rejected claim
- `task.published` - Admin published new task
- `trust_score.updated` - Trust Score changed
- `review.assigned` - Claim assigned to reviewer

**Migration Note**: Domain events map to smart contract events on-chain.

---

### 4. Required Metadata Fields

#### All Events

```typescript
{
  actor_id: UUID,        // Who performed action
  timestamp: ISO8601,    // When (if not using created_at)
}
```

#### Trust Score Events (CRITICAL)

```typescript
{
  trust_score_before: number,  // State before mutation
  trust_score_after: number,   // State after mutation
  points_awarded: number,      // Delta (for verification)
  reason: string,              // Why points changed
}
```

#### State Transition Events

```typescript
{
  status_before: string,  // 'submitted'
  status_after: string,   // 'approved'
  transition_reason: string,
}
```

#### Entity Creation Events

```typescript
{
  entity_data: {          // Snapshot of created entity
    id: UUID,
    ...all_relevant_fields
  }
}
```

---

## Testing

### Unit Test: Event Logging

```typescript
import { describe, it, expect, vi } from 'vitest';
import { logEvent } from '@/lib/events/logger';

describe('Event Logging', () => {
  it('should log claim approval with before/after state', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    await logEvent(mockClient, {
      event_type: 'claim.approved',
      actor_id: 'reviewer-uuid',
      entity_type: 'claim',
      entity_id: 'claim-uuid',
      metadata: {
        trust_score_before: 320,
        trust_score_after: 395,
        points_awarded: 75,
      },
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO events'),
      expect.arrayContaining(['claim.approved'])
    );
  });

  it('should prevent UPDATE on events table', async () => {
    // Verify append-only integrity
    const mockClient = {
      query: vi.fn().mockRejectedValue(new Error('UPDATE not allowed')),
    };

    await expect(
      mockClient.query('UPDATE events SET metadata = $1 WHERE id = $2', [
        {},
        'uuid',
      ])
    ).rejects.toThrow('UPDATE not allowed');
  });
});
```

---

### Integration Test: Transaction Atomicity

```typescript
describe('Transaction Atomicity', () => {
  it('should rollback state change if event logging fails', async () => {
    // Mock event logging failure
    vi.mocked(client.query).mockImplementation((sql) => {
      if (sql.includes('INSERT INTO events')) {
        throw new Error('Event logging failed');
      }
      return Promise.resolve({ rows: [] });
    });

    // Attempt transaction
    await expect(
      withTransaction(DATABASE_URL, async (client) => {
        await client.query('UPDATE members SET trust_score_cached = $1', [500]);
        await client.query('INSERT INTO events (...)', []);
      })
    ).rejects.toThrow('Event logging failed');

    // Verify state was rolled back
    const member = await client.query(
      'SELECT trust_score_cached FROM members WHERE id = $1',
      [memberId]
    );
    expect(member.rows[0].trust_score_cached).toBe(320); // Original value
  });
});
```

---

## Migration Path

### Current (PostgreSQL)

```sql
-- Events table
INSERT INTO events (event_type, metadata) VALUES ('claim.approved', {...});
```

### Future (Blockchain)

```solidity
// Smart contract event
contract TrustBuilder {
  event ClaimApproved(
    address indexed reviewer,
    uint256 indexed claimId,
    uint256 trustScoreBefore,
    uint256 trustScoreAfter,
    uint256 pointsAwarded
  );

  function approveClaim(uint256 claimId) public {
    // ... validation ...

    emit ClaimApproved(
      msg.sender,
      claimId,
      trustScoreBefore,
      trustScoreAfter,
      points
    );
  }
}
```

**Migration Steps**:

1. Export events table to JSONL
2. Upload to IPFS (append-only integrity)
3. Emit events on-chain (derive Trust Scores)
4. Verify Merkle root (event log integrity)

---

## Common Pitfalls

### ❌ Event Logging Outside Transaction

```typescript
// BAD: Event fails, state persists (orphaned state)
await client.query('UPDATE members SET trust_score_cached = $1', [500]);
await client.query('INSERT INTO events (...)', []); // Fails, rollback too late
```

### ✅ Event Logging Inside Transaction

```typescript
// GOOD: Event failure rolls back state change
await withTransaction(DATABASE_URL, async (client) => {
  await client.query('UPDATE members SET trust_score_cached = $1', [500]);
  await client.query('INSERT INTO events (...)', []);
});
```

---

### ❌ Missing Before/After State

```typescript
// BAD: Cannot reconstruct Trust Score
metadata: {
  points_awarded: 75,  // Delta only, no verification
}
```

### ✅ Complete State Capture

```typescript
// GOOD: Can verify Trust Score derivation
metadata: {
  trust_score_before: 320,
  trust_score_after: 395,
  points_awarded: 75,  // 320 + 75 = 395 ✅
}
```

---

## Checklist

Before merging:

- [ ] All state mutations logged to events table
- [ ] Events inside `withTransaction` (atomic with state changes)
- [ ] Metadata includes before/after state (Trust Scores)
- [ ] `actor_id` present (who performed action)
- [ ] Event naming follows `domain.action` convention
- [ ] Tests validate append-only integrity (no UPDATE/DELETE on events)

---

## Related Patterns

- [API Endpoint](./api-endpoint.md) - Shows transaction usage
- [API Testing](./api-testing.md) - Integration test examples
- [Auth Middleware](./auth-middleware.md) - Capturing actor_id

## References

- [Smart Contract Spec](../05-smart-contract-behaviour-spec.md) - Full event sourcing details
- [Migration Strategy](../08-migration-and-audit-strategy.md) - Blockchain migration path
- [S3-01 Test Infrastructure](../product-manager/stories/S3-01-test-infrastructure.md) - Event logging tests
