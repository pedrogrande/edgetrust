# Neon SQL Parameterization Patterns

**Quick Reference for Trust Builder Developers**

This guide documents Neon-specific SQL parameterization patterns to prevent common bugs. All examples are validated against production code from Sprint 4.

---

## 1. Interval Parameterization

### ❌ INCORRECT: Template Literal Inside SQL String

```typescript
// BUG: SQL sees '${days}' as string literal, not parameter placeholder
const result = await sql`
  WHERE reviewed_at < NOW() - INTERVAL '${days} days'
`;
// Error: bind message supplies 1 parameters, but prepared statement requires 0
```

**Why it fails**: Wrapping `${}` in quotes `'...'` prevents parameter binding. The SQL parser sees a fixed string literal, but the query planner expects a parameter.

### ✅ CORRECT: Concatenation + Cast

```typescript
// Parameter properly bound, concatenated with ' days', cast to INTERVAL
const result = await sql`
  WHERE reviewed_at < NOW() - (${days} || ' days')::INTERVAL
`;
```

**How it works**:

1. `${days}` binds as parameter (e.g., `7`)
2. `||` concatenates parameter with `' days'` → `'7 days'`
3. `::INTERVAL` casts string to PostgreSQL interval type

### Production Example (from S4-01)

```typescript
// src/pages/trust-builder/admin/claims.astro
const timeoutDays = await getConfigNumber('claim_timeout_days');

const orphanedClaims = await sql`
  SELECT c.id, t.title, m.name, 
         EXTRACT(day FROM NOW() - c.reviewed_at) as days_orphaned
  FROM claims c
  WHERE c.status = 'under_review' 
    AND c.reviewed_at < NOW() - (${timeoutDays} || ' days')::INTERVAL
`;
```

---

## 2. JSONB Parameters

### ❌ INCORRECT: Double Serialization

```typescript
// BUG: JSON.stringify creates string "7", not JSONB number 7
await client.query(
  'UPDATE system_config SET value = $1 WHERE key = $2',
  [JSON.stringify(value), key] // ← Double serialization
);
```

**Why it fails**: PostgreSQL driver **automatically** serializes JavaScript values to JSONB. Using `JSON.stringify()` adds extra quotes, turning numbers into strings.

**Database result**:

```sql
-- Expected: {"value": 7}
-- Actual:   {"value": "7"}
```

### ✅ CORRECT: Pass Native Values

```typescript
// Driver handles JSONB serialization automatically
await client.query(
  'UPDATE system_config SET value = $1 WHERE key = $2',
  [value, key] // value is JavaScript number 7
);
```

**Rule**: Always pass native JavaScript values (numbers, objects, arrays) to parameterized queries. Let the driver handle serialization.

### Production Example (from S4-01)

```typescript
// src/pages/api/trust-builder/admin/config.ts
export async function PUT({ request }: APIContext) {
  const { key, value } = await request.json();

  await withTransaction(DATABASE_URL, async (client) => {
    // ✅ Correct: Pass native value
    await client.query(
      'UPDATE system_config SET value = $1, updated_at = NOW() WHERE key = $2',
      [value, key] // No JSON.stringify needed
    );
  });
}
```

---

## 3. Array Parameters

### ✅ CORRECT: Array Binding with ANY()

```typescript
// Pass JavaScript array, use ANY() in SQL
const memberIds = ['uuid-1', 'uuid-2', 'uuid-3'];

const members = await sql`
  SELECT * FROM members
  WHERE id = ANY(${memberIds})
`;
```

**How it works**: PostgreSQL driver converts JavaScript array to `ARRAY['uuid-1', 'uuid-2', 'uuid-3']`, then `ANY()` checks if column value matches any array element.

### Common Pattern: Dynamic IN Clause

```typescript
// ✅ Type-safe array handling
const statuses: string[] = ['pending', 'under_review'];

const claims = await sql`
  SELECT * FROM claims
  WHERE status = ANY(${statuses})
`;
```

---

## 4. Date/Time Calculations

### ✅ CORRECT: Parameter in Time Expression

```typescript
// Dynamic hours for session timeout
const hours = 24;

const expiredSessions = await sql`
  SELECT * FROM sessions
  WHERE created_at < NOW() - (${hours} || ' hours')::INTERVAL
`;
```

### Common Patterns

```typescript
// Days ago
sql`WHERE created_at > NOW() - (${days} || ' days')::INTERVAL`;

// Hours from now
sql`WHERE expires_at < NOW() + (${hours} || ' hours')::INTERVAL`;

// Minutes threshold
sql`WHERE updated_at > NOW() - (${minutes} || ' minutes')::INTERVAL`;
```

---

## 5. Pattern Summary Table

| Scenario               | ❌ WRONG                  | ✅ CORRECT                         |
| ---------------------- | ------------------------- | ---------------------------------- |
| **Interval with days** | `INTERVAL '${days} days'` | `(${days} \|\| ' days')::INTERVAL` |
| **JSONB value**        | `JSON.stringify(value)`   | `value` (native type)              |
| **Array filter**       | `IN (${arr.join(',')})`   | `ANY(${arr})`                      |
| **Date comparison**    | `> '${dateStr}'`          | `> ${new Date()}`                  |
| **Simple equality**    | `WHERE id = '${id}'`      | `WHERE id = ${id}`                 |

---

## 6. Testing Your Queries

### Pre-Commit Checklist

Before committing SQL queries, verify:

- [ ] All `${}` parameters are **outside** SQL string literals (`'...'`)
- [ ] No `JSON.stringify()` used with JSONB columns
- [ ] Arrays use `ANY()` operator, not string concatenation
- [ ] Intervals use concatenation + cast pattern: `(${n} || ' unit')::INTERVAL`
- [ ] Query tested with **actual parameters**, not just type-checked

### Quick Test Pattern

```typescript
// Add temporary logging to verify parameter binding
console.log('Query parameters:', { days, status, memberId });
const result = await sql`...`;
console.log('Query result:', result);
```

---

## 7. Common Errors & Fixes

### Error: "bind message supplies X parameters, but prepared statement requires Y"

**Cause**: Parameter inside SQL string literal

**Fix**: Move parameter outside quotes, use concatenation

```typescript
// Before: sql`INTERVAL '${n} days'`
// After:  sql`(${n} || ' days')::INTERVAL`
```

### Error: "invalid input syntax for type json"

**Cause**: Double-serialization with `JSON.stringify()`

**Fix**: Pass native JavaScript value

```typescript
// Before: [JSON.stringify(obj)]
// After:  [obj]
```

---

## 8. References

- **Neon Documentation**: [Query with Server-Side Driver](https://neon.tech/docs/serverless/serverless-driver)
- **PostgreSQL Arrays**: [Array Functions](https://www.postgresql.org/docs/current/functions-array.html)
- **S4-01 QA Report**: `/project/trust-builder/retros/qa-report-S4-01-admin-config-ui.md`
  - Bug #1: JSONB double-serialization (line 125)
  - Bug #6: Interval parameterization (line 182)

---

## 9. Migration Considerations

All patterns documented here are **blockchain-ready**:

- ✅ Parameterized queries prevent SQL injection
- ✅ Type-safe JSONB handling survives schema evolution
- ✅ Interval calculations use PostgreSQL native functions (portable)
- ✅ Array operations use standard SQL operators

When migrating to blockchain storage, these patterns ensure data integrity and query correctness across environments.

---

**Version**: 1.0 (Sprint 4)  
**Last Updated**: 2026-02-13  
**Maintainer**: Trust Builder Development Team
