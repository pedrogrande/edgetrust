# Pattern: API Endpoint

**Purpose**: Copy-paste template for REST API endpoints  
**Migration Critical**: Yes (transaction + event patterns)  
**Complexity**: Simple  
**Time**: 15 min implementation

---

## Pattern Overview

**Standard Endpoint** = Auth → Validate → Transaction (State + Event) → Response

**Why This Order**:

1. **Auth First**: Fail fast on unauthorized requests
2. **Validate Input**: Catch errors before database access
3. **Transaction**: State + events atomic (rollback together)
4. **Sanctuary Response**: Educational error messages

---

## Full Template

### File: `src/pages/api/trust-builder/endpoint.ts`

```typescript
import type { APIContext } from 'astro';
import { getCurrentUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db/connection';

/**
 * POST /api/trust-builder/endpoint
 *
 * Description: [What this endpoint does]
 *
 * Request Body:
 * {
 *   required_field: string,
 *   optional_field?: number
 * }
 *
 * Response:
 * - 200: Success with data
 * - 400: Validation error (sanctuary message)
 * - 401: Unauthorized (not logged in)
 * - 403: Forbidden (logged in, insufficient permissions)
 * - 409: Conflict (business logic error, e.g., duplicate)
 */
export async function POST({ request }: APIContext) {
  // ============================================
  // 1. AUTHENTICATION (Fail Fast)
  // ============================================
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ============================================
  // 2. INPUT VALIDATION (Schema Check)
  // ============================================
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: 'Please send valid JSON in the request body.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate required fields
  if (!body.required_field) {
    return new Response(
      JSON.stringify({
        error:
          'Missing required_field. This helps us [explain why field matters].',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ============================================
  // 3. AUTHORIZATION (Business Logic Check)
  // ============================================
  // Example: Check if user has permission
  if (user.role !== 'steward') {
    return new Response(
      JSON.stringify({
        error:
          'You need Steward role to perform this action. Stewards are trusted reviewers who help maintain quality.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ============================================
  // 4. TRANSACTION (State + Event Atomic)
  // ============================================
  return await withTransaction(process.env.DATABASE_URL!, async (client) => {
    // 4a. Capture state BEFORE mutation
    const before = await client.query(
      'SELECT status, trust_score_cached FROM table WHERE id = $1',
      [body.id]
    );

    if (before.rows.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Entity not found. It may have been removed or you may not have access.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const beforeState = before.rows[0];

    // 4b. Business Logic Validation
    if (beforeState.status !== 'pending') {
      return new Response(
        JSON.stringify({
          error: `This entity has already been processed (status: ${beforeState.status}). Only pending items can be modified.`,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4c. Perform state mutation
    await client.query(
      `UPDATE table 
       SET status = $1, trust_score_cached = trust_score_cached + $2 
       WHERE id = $3`,
      ['approved', 75, body.id]
    );

    // 4d. Capture state AFTER mutation
    const after = await client.query(
      'SELECT status, trust_score_cached FROM table WHERE id = $1',
      [body.id]
    );
    const afterState = after.rows[0];

    // 4e. Log event (SAME TRANSACTION)
    await client.query(
      `INSERT INTO events (event_type, actor_id, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'entity.approved', // Event type
        user.id, // Actor (who did it)
        'entity', // Entity type
        body.id, // Entity ID (what was affected)
        {
          // Rich metadata for reconstruction
          status_before: beforeState.status,
          status_after: afterState.status,
          trust_score_before: beforeState.trust_score_cached,
          trust_score_after: afterState.trust_score_cached,
          points_awarded: 75,
          action_reason: body.optional_field || 'No reason provided',
        },
      ]
    );

    // 5. SUCCESS RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: body.id,
          status: afterState.status,
          trust_score: afterState.trust_score_cached,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });
}
```

---

## Status Code Guide

| Code | Meaning        | When to Use                                          | Example Message                           |
| ---- | -------------- | ---------------------------------------------------- | ----------------------------------------- |
| 200  | Success        | Normal operation completed                           | `{ success: true, data: {...} }`          |
| 201  | Created        | New resource created                                 | `{ success: true, id: 'uuid' }`           |
| 400  | Bad Request    | Invalid input (missing fields, wrong format)         | "Please provide an email address"         |
| 401  | Unauthorized   | Not logged in                                        | "Unauthorized" (generic)                  |
| 403  | Forbidden      | Logged in but insufficient permissions               | "You need Steward role to review claims"  |
| 404  | Not Found      | Resource doesn't exist                               | "Claim not found"                         |
| 409  | Conflict       | Business logic error (duplicate, race condition)     | "This claim is already being reviewed"    |
| 500  | Internal Error | Unexpected error (should never happen in production) | "Something went wrong. Please try again." |

---

## Sanctuary Error Messages

### Template

```
[What happened] + [Why it matters] + [How to fix/context]
```

### Examples

**400 - Missing Field**:

```typescript
error: 'Please provide feedback. Thoughtful feedback helps members improve their work.';
```

**403 - Insufficient Permission**:

```typescript
error: 'You need 250+ Trust Score to review claims. This ensures reviewers have experience in the community.';
```

**409 - Business Logic**:

```typescript
error: 'This claim has reached the maximum revision limit (2). Further cycles would delay feedback for other members.';
```

**404 - Not Found**:

```typescript
error: 'Task not found. It may have been archived or removed by an admin.';
```

---

## Testing

### Integration Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/pages/api/trust-builder/endpoint';
import * as auth from '@/lib/auth';
import * as dbConnection from '@/lib/db/connection';

// Mock modules
vi.mock('@/lib/auth');
vi.mock('@/lib/db/connection');

describe('POST /api/trust-builder/endpoint', () => {
  const mockUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
    role: 'steward',
    trust_score_cached: 500,
  };

  const mockClient = {
    query: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.getCurrentUser).mockResolvedValue(mockUser as any);
    vi.mocked(dbConnection.withTransaction).mockImplementation(
      async (dbUrl, callback) => await callback(mockClient as any)
    );
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

      const request = new Request('http://localhost/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ required_field: 'value' }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 if required field is missing', async () => {
      const request = new Request('http://localhost/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Missing required_field
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Missing required_field');
    });

    it('should return 400 if JSON is invalid', async () => {
      const request = new Request('http://localhost/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('valid JSON');
    });
  });

  describe('Business Logic', () => {
    it('should successfully process valid request', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          // SELECT before state
          rows: [{ status: 'pending', trust_score_cached: 320 }],
        })
        .mockResolvedValueOnce({
          // UPDATE state
          rows: [],
        })
        .mockResolvedValueOnce({
          // SELECT after state
          rows: [{ status: 'approved', trust_score_cached: 395 }],
        })
        .mockResolvedValueOnce({
          // INSERT event
          rows: [],
        });

      const request = new Request('http://localhost/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ required_field: 'value', id: 'uuid' }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });

    it('should return 404 if entity not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [], // Entity not found
      });

      const request = new Request('http://localhost/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ required_field: 'value', id: 'uuid' }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toContain('not found');
    });

    it('should return 409 if entity already processed', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ status: 'approved', trust_score_cached: 395 }], // Already processed
      });

      const request = new Request('http://localhost/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ required_field: 'value', id: 'uuid' }),
      });

      const response = await POST({ request } as any);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toContain('already been processed');
    });
  });

  describe('Transaction Atomicity', () => {
    it('should call withTransaction', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ status: 'pending' }] });

      const request = new Request('http://localhost/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ required_field: 'value', id: 'uuid' }),
      });

      await POST({ request } as any);

      expect(dbConnection.withTransaction).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function)
      );
    });
  });
});
```

---

## Checklist

Before merging:

- [ ] Authentication check first (fail fast)
- [ ] Input validation with sanctuary messages
- [ ] Authorization check (role/permission)
- [ ] All mutations inside `withTransaction`
- [ ] Before/after state captured
- [ ] Event logged (same transaction)
- [ ] Sanctuary error messages (educational)
- [ ] Integration tests cover auth, validation, business logic
- [ ] Status codes correct (200/400/401/403/404/409)

---

## Related Patterns

- [Event Sourcing](./event-sourcing.md) - Event logging details
- [API Testing](./api-testing.md) - Full integration test examples
- [Auth Middleware](./auth-middleware.md) - Authentication patterns

## References

- [Data Model & API Design](../04-data-model-and-api-design.md) - API contract specs
- [Smart Contract Spec](../05-smart-contract-behaviour-spec.md) - Transaction patterns
- [Developer Quick Ref](../quickrefs/developer.md) - Fast lookup guide
