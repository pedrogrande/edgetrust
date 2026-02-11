# Developer Quick Reference

**Purpose**: Fast lookup for common tasks (3-10 min read)  
**Full Details**: [Sprint 2 Learnings](../retros/sprint-2-learnings-and-guidance.md) | [Standards Checklist](../meta/developer-standards-checklist.md)  
**Last Updated**: 11 February 2026

---

## ⚡ Before You Start

### Pre-Implementation Checklist

- [ ] Create feature branch: `git checkout -b S3-XX-feature-name`
- [ ] Check story complexity: If Medium+, wait for product-advisor pre-review
- [ ] Check git hooks installed: `.husky/pre-commit` and `.husky/pre-push`
- [ ] Run tests: `pnpm test` (should pass before you start)

---

## 🎯 Core Patterns (Copy These!)

### 1. API Endpoint with Transaction

```typescript
import { withTransaction } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';

export async function POST({ request }: APIContext) {
  // 1. AUTH FIRST
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  // 2. PARSE & VALIDATE
  const body = await request.json();
  if (!body.required_field) {
    return new Response(
      JSON.stringify({ error: 'Missing required_field (why it matters)' }),
      { status: 400 }
    );
  }

  // 3. TRANSACTION (state + event together)
  return await withTransaction(process.env.DATABASE_URL, async (client) => {
    // UPDATE state
    await client.query('UPDATE table SET field = $1 WHERE id = $2', [
      value,
      id,
    ]);

    // LOG event (same transaction!)
    await client.query(
      'INSERT INTO events (event_type, actor_id, entity_id, metadata) VALUES ($1, $2, $3, $4)',
      ['entity.action', user.id, id, { before, after }]
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  });
}
```

**Why**: Atomic transactions ensure events + state stay in sync (migration critical).

---

### 2. Event Logging

```typescript
await client.query(
  `INSERT INTO events (event_type, actor_id, entity_type, entity_id, metadata)
   VALUES ($1, $2, $3, $4, $5)`,
  [
    'claim.approved', // event_type (domain.action)
    reviewerId, // actor_id (who did it)
    'claim', // entity_type
    claimId, // entity_id
    {
      trust_score_before: 320, // CRITICAL: before/after state
      trust_score_after: 395,
      points_awarded: 75,
      verification_notes: 'LGTM',
    },
  ]
);
```

**Required Fields**:

- `event_type`: `domain.action` format
- `actor_id`: Who performed action
- `entity_type` + `entity_id`: What was affected
- `metadata`: Rich JSON (before/after state for audit trail)

**Migration Path**: Events → IPFS → on-chain

---

### 3. Sanctuary Error Messages

```typescript
// ❌ BAD: Technical jargon
throw new Error('INVALID_FILE_TYPE');

// ✅ GOOD: Educational + actionable
return new Response(
  JSON.stringify({
    error:
      'Please upload a PDF, PNG, or JPG file. Need a different format? Let us know!',
  }),
  { status: 400 }
);
```

**Template**: `[What happened] + [Why it matters] + [How to fix]`

---

### 4. Defense-in-Depth (Critical Rules)

```sql
-- Migration: Add database constraint
ALTER TABLE claims
ADD CONSTRAINT claims_revision_count_check
CHECK (revision_count <= 2);
```

```typescript
// Application: Sanctuary message
if (claim.revision_count >= 2) {
  return new Response(
    JSON.stringify({
      error:
        'This claim has reached the maximum revision limit (2). Further review cycles would delay feedback for other members.',
    }),
    { status: 400 }
  );
}
```

**Why Both**: Database prevents bypass, application provides guidance.

---

## 🚨 Common Pitfalls

### Character Encoding (RECURRING)

**Problem**: Smart quotes break TypeScript  
**Check**: `grep -rn "[''""]" src/ --include="*.ts"`  
**Fix**: Replace `' → '` and `" → "`  
**Prevention**: Pre-commit hook (installed in S3-01)

### Event Logging Outside Transaction

**Problem**: State updates but event fails → orphaned state  
**Check**: All `INSERT events` inside `withTransaction`  
**Fix**: Wrap mutations in transaction

### Missing Before/After State in Events

**Problem**: Can't reconstruct Trust Scores  
**Check**: Event metadata includes `trust_score_before`, `trust_score_after`  
**Fix**: Capture state before mutation, log both values

---

## 🧪 Testing

### Run Tests Before Committing

```bash
pnpm test                  # Full suite (<5s)
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage report
```

### Integration Test Template

```typescript
import { POST } from '@/pages/api/endpoint';
import { vi } from 'vitest';

vi.mock('@/lib/auth');
vi.mock('@/lib/db/connection');

describe('POST /api/endpoint', () => {
  it('should validate input', async () => {
    const request = new Request('http://localhost/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ missing_field: true }),
    });

    const response = await POST({ request } as any);
    expect(response.status).toBe(400);
  });
});
```

**Pattern**: [patterns/api-testing.md](../patterns/api-testing.md)

---

## 📋 Pre-Commit Checklist

Before `git commit`:

- [ ] Tests pass: `pnpm test`
- [ ] TypeScript compiles: `pnpm build`
- [ ] No smart quotes: `grep -rn "[''""]" src/`
- [ ] Events logged inside transactions
- [ ] Error messages are sanctuary-aligned
- [ ] Git hooks pass (pre-commit runs automatically)

---

## 📚 Full References

**Detailed Patterns**:

- [Event Sourcing](../patterns/event-sourcing.md)
- [API Endpoint](../patterns/api-endpoint.md)
- [API Testing](../patterns/api-testing.md)
- [Auth Middleware](../patterns/auth-middleware.md)

**Long-Form Guides**:

- [Sprint 2 Learnings](../retros/sprint-2-learnings-and-guidance.md) (1066 lines)
- [Developer Standards Checklist](../meta/developer-standards-checklist.md) (686 lines)
- [Smart Contract Spec](../05-smart-contract-behaviour-spec.md)

**Questions?** Check [PATTERN-ANALYSIS.md](../meta/PATTERN-ANALYSIS.md) for recurring issues.
