# Trust Builder: Developer Standards Checklist

**Purpose**: Patterns and standards adopted from Sprint 1-2 QA reports and retrospectives  
**Owner**: fullstack-developer (applied), qa-engineer (validated)  
**Updated**: 2026-02-11 (Post S3-01 strategic review)  
**Status**: Living document (update after each sprint)

---

## Pre-Implementation Checklist

Before writing any code:

- [ ] **Story complexity checked**: If Moderate/Complex, wait for product-advisor strategic review
- [ ] **Gold standard patterns reviewed**: Can atomic assignment, defense-in-depth, or transaction boundaries be reused?
- [ ] **Testing strategy defined**: Which critical path components need coverage first?
- [ ] **Character encoding prevention**: Pre-commit hook installed and tested

---

## Code Quality Standards

### 1. Character Encoding (RECURRING ISSUE: S2-03, S2-04)

**Problem**: Copying sanctuary language from Markdown → TypeScript introduces smart quotes, en-dashes  
**Solution**: Automated pre-commit hook + manual vigilance

**File Types to Check**:

- ✅ `.ts`, `.tsx` (TypeScript)
- ✅ `.js`, `.jsx` (JavaScript)
- ✅ `.astro` (Astro components with frontmatter scripts)

**Forbidden Characters**:
| Character | Name | ASCII Replacement |
|-----------|------|-------------------|
| `'` `'` | Smart single quotes | `'` (straight apostrophe) |
| `"` `"` | Smart double quotes | `"` (straight quotes) |
| `–` | En-dash | `-` (hyphen) |
| `—` | Em-dash | `--` (double hyphen) or `-` |

**Pre-Commit Hook Pattern** (`.husky/pre-commit`):

```bash
# Check for non-ASCII in code files
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx|astro)$' | xargs grep -n "[''""\u2013\u2014]" ; then
  echo "❌ Non-ASCII characters detected"
  echo "Replace: ' or ' → ' | " or " → \" | – or — → -"
  exit 1
fi
```

**Manual Check** (before QA handoff):

```bash
# Search entire codebase
grep -rn "[''""\u2013\u2014]" src/ --include="*.ts" --include="*.tsx" --include="*.astro"
```

---

### 2. Quasi-Smart Contract Test Requirements (NEW: S3-01+)

**Rationale**: Migration readiness depends on contract integrity being testable and validated

**Required Test Scenarios**:

#### 2a. Append-Only Events (CRITICAL)

```typescript
describe('Event Log Integrity', () => {
  it('should prevent UPDATE on events table', async () => {
    // Attempt to modify existing event
    // Expect: Rejection or no-op (depending on implementation)
  });

  it('should prevent DELETE on events table', async () => {
    // Attempt to delete event
    // Expect: Rejection or no-op
  });
});
```

#### 2b. Immutable Published State

```typescript
describe('Published Task Immutability', () => {
  it('should prevent editing core fields after publication', async () => {
    // Create task with status 'published'
    // Attempt to modify title, description, or incentive_breakdown
    // Expect: 400 with sanctuary message
  });

  it('should allow editing mutable fields (status only)', async () => {
    // Status transitions (published → archived) should succeed
  });
});
```

#### 2c. Trust Score Derivation (CRITICAL)

```typescript
describe('Trust Score Calculation', () => {
  it('should derive score from events, not cache', () => {
    // Mock events with approved claims
    // Calculate Trust Score
    // Expect: Sum of points from events only (cache ignored)
  });

  it('should include before/after state in Trust Score events', () => {
    // Check event metadata
    // Expect: trust_score_before, trust_score_after, points_earned
  });
});
```

#### 2d. Atomic Assignment (Gold Standard)

```typescript
describe('Race-Safe Claim Assignment', () => {
  it('should handle concurrent claim attempts', async () => {
    // Simulate 2 reviewers claiming same claim simultaneously
    // Expect: One succeeds, one gets "Someone else claimed this first"
  });

  it('should use UPDATE...RETURNING with optimistic locking', () => {
    // Verify WHERE conditions: status='submitted' AND reviewer_id IS NULL
  });
});
```

**Coverage Target**: 80%+ of contract-critical code paths (even if overall coverage is lower)

---

### 3. Event Logging Completeness (95% Migration Readiness Standard)

**For every database state change** (INSERT/UPDATE/DELETE):

- [ ] Event entry written **in same transaction** (pass `PoolClient`, not standalone queries)
- [ ] Event metadata includes:
  - [ ] `actor_id` (who made the change)
  - [ ] `entity_id` (what was changed: task_id, claim_id, etc.)
  - [ ] `before` state (JSON snapshot before change)
  - [ ] `after` state (JSON snapshot after change)
- [ ] Trust Score changes include `trust_score_before` and `trust_score_after` in metadata
- [ ] Edge cases logged (not just happy path):
  - [ ] Rejections (claim.rejected, with rationale)
  - [ ] Timeouts (claim.timeout, with duration)
  - [ ] Cancellations (task.cancelled, with reason)

**Example Pattern**:

```typescript
// CORRECT: Transaction-bounded event logging
export async function approveClaimWithEvent(
  client: PoolClient, // Caller manages transaction
  claimId: string,
  reviewerId: string,
  pointsEarned: number
) {
  // 1. Read current state
  const [claim] = await client.query('SELECT * FROM claims WHERE id = $1', [
    claimId,
  ]);

  // 2. Update state
  await client.query(
    'UPDATE claims SET status = $1, reviewer_id = $2 WHERE id = $3',
    ['approved', reviewerId, claimId]
  );

  // 3. Log event (same transaction)
  await client.query(
    'INSERT INTO events (event_type, actor_id, entity_id, metadata) VALUES ($1, $2, $3, $4)',
    [
      'claim.approved',
      reviewerId,
      claimId,
      JSON.stringify({
        before: { status: claim.status, reviewer_id: claim.reviewer_id },
        after: { status: 'approved', reviewer_id: reviewerId },
        points_earned: pointsEarned,
        trust_score_before: claim.member_trust_score, // Query from member
        trust_score_after: claim.member_trust_score + pointsEarned,
      }),
    ]
  );
}
```

**INCORRECT**:

```typescript
// ❌ Event logged outside transaction - can desync
await updateClaim(claimId, { status: 'approved' });
await logEvent('claim.approved', { claim_id: claimId }); // Separate query!
```

---

### 4. Sanctuary Culture in Code (Architecture, Not Just Copy)

**Principle**: Error messages, constraints, and system behavior should be **supportive, not punitive**

#### 4a. Error Messages

**AVOID** (punitive, technical jargon):

```typescript
return { error: 'Access denied. Insufficient permissions.' };
return { error: 'Invalid input. Validation failed.' };
return { error: 'Operation not allowed.' };
```

**PREFER** (sanctuary-aligned, educational):

```typescript
return {
  error:
    "You'll need 250 Trust Score points to review claims. Keep contributing to unlock this!",
};
return {
  error:
    "This file is a bit too large--let's keep evidence files under 10MB so everyone can access them easily.",
};
return {
  error:
    'Looks like someone else is already reviewing this claim. Check the dashboard for other ways to help!',
};
```

**Pattern**: Explain **why** (the value/protection) + suggest **what** (alternative action)

#### 4b. Git Hook Messages

**AVOID**:

```bash
echo "❌ Direct commits to main are not allowed!"
echo "ERROR: Build failed"
```

**PREFER**:

```bash
echo "🌱 Let's use a feature branch to keep main stable!"
echo "Why? Feature branches enable code review and safer collaboration."

echo "🔍 TypeScript found some issues. Let's fix them before committing:"
```

#### 4c. Database Constraints

**Pattern**: Layer 1 (uncheateable constraint) + Layer 2 (sanctuary message)

**Example**:

```sql
-- Layer 1: Database constraint
ALTER TABLE claims ADD CONSTRAINT max_revisions CHECK (revision_count <= 2);

-- Layer 2: Application message
if (claim.revision_count >= 2) {
  return {
    error: "You've reached the maximum of 2 revisions. This helps keep the review process flowing. If you need more changes, reach out to a Steward for guidance!"
  };
}
```

**Migration Path**: Layer 1 constraints map directly to Solidity `require()` statements

---

### 5. Git Workflow (100% Compliance Target, Sprint 3+)

**Pre-Push Hook** (prevents main violations):

```bash
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Audit trail for bypasses
if [ -n "$HUSKY_SKIP_HOOKS" ]; then
  echo "⚠️ BYPASS DETECTED: Logging for audit..."
  echo "$(date) - $(git config user.email) bypassed pre-push hook" >> .git/hook-bypasses.log
  exit 0
fi

branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$branch" = "main" ]; then
  echo "🌱 Let's use a feature branch to keep main stable!"
  echo "Try: git checkout -b SX-XX-feature-name"
  echo ""
  echo "Why? Feature branches enable code review and safer collaboration."
  exit 1
fi
```

**Branch Naming Convention**:

- Format: `feature/SX-XX-short-description` or `SX-XX-short-description`
- Examples: `feature/S3-01-test-infrastructure`, `S3-02-member-dashboard`

**Bypass Protocol** (emergencies only):

```bash
# Use sparingly, creates audit trail
git push --no-verify

# Check audit log
cat .git/hook-bypasses.log
```

**PR Checklist** (QA validates):

- [ ] Feature branch naming convention followed
- [ ] No commits pushed directly to main (check `git log origin/main`)
- [ ] PR title includes story ID (S3-01, S3-02, etc.)
- [ ] PR description links to story file
- [ ] All tests passing in PR
- [ ] Changes scoped to this story (no unrelated edits)

---

### 6. Test Strategy (Critical Path First)

**Priority Order** (from S3-01 strategic review):

**Priority 1** (must cover first):

1. **Quasi-smart contract validation** (events, immutability, Trust Score)
2. **Integration tests for state-changing APIs** (claim, review, task creation)
3. **Unit tests for business logic** (state machines, calculators, validators)

**Priority 2** (can defer): 4. **Component tests** (UI changes frequently, lower ROI) 5. **Edge case coverage** (after happy path works)

**Coverage Philosophy**:

- ✅ **80% of migration-critical code** is better than 40% of random code
- ✅ Focus on **contract integrity** over **code coverage percentage**
- ✅ **One good integration test** beats 10 shallow unit tests

**Critical Path Components** (test these first in every story):

- Event logging utilities (`src/lib/events/`)
- Trust Score calculation (`src/lib/trust-score-calculator.ts`)
- State machines (`src/lib/claim-engine.ts`, `src/lib/task-engine.ts`)
- API endpoints with state changes (POST, PUT, DELETE)

**Test File Naming**:

- Unit tests: `*.test.ts` (co-located with source: `trust-score-calculator.test.ts`)
- Integration tests: `__tests__/[feature].test.ts` (in API route folder)
- Fixtures: `__tests__/fixtures/` (shared test data)

**Mock Data Strategy**:

- Prefer **fixtures** over seed data (reduces brittleness)
- Create minimal, stable test data (2-3 entities per test)
- Clean up after tests (avoid pollution)

---

### 7. Defense-in-Depth Pattern (Gold Standard)

**Pattern**: Two layers of protection for critical business rules

**Layer 1: Database Constraint** (uncheateable, enforced at storage level)

```sql
ALTER TABLE tasks ADD CONSTRAINT valid_status
  CHECK (status IN ('draft', 'published', 'completed', 'archived'));

ALTER TABLE claims ADD CONSTRAINT max_revisions
  CHECK (revision_count <= 2);

ALTER TABLE file_uploads ADD CONSTRAINT max_file_size
  CHECK (file_size_bytes <= 10485760); -- 10MB
```

**Layer 2: Application Message** (educational, sanctuary-aligned)

```typescript
if (fileSize > 10 * 1024 * 1024) {
  return {
    error:
      "This file is a bit too large--let's keep evidence under 10MB so everyone can access it easily.",
  };
}

if (claim.revision_count >= 2) {
  return {
    error:
      "You've reached the maximum of 2 revisions. This keeps reviews flowing smoothly. Need more help? Reach out to a Steward!",
  };
}
```

**Why Both Layers?**:

- Layer 1: Catches bugs, malicious attempts, direct DB access (migration-ready: maps to Solidity `require()`)
- Layer 2: Provides helpful UX, educates members, reinforces sanctuary culture

**When to Use**:

- ✅ Business rules that protect member experience (revision limits, file sizes)
- ✅ Rules that map to smart contract constraints (immutability, thresholds)
- ✅ Data integrity (valid status transitions, FK relationships)

**When NOT to Use**:

- ❌ UI-only validation (form field format) - constraint overkill
- ❌ Frequently changing business rules - schema migrations are expensive

---

### 8. Atomic Assignment Pattern (Gold Standard, from S2-04)

**Problem**: Race conditions when multiple actors claim the same resource (claim, task, vote)

**Solution**: `UPDATE...RETURNING` with optimistic locking

**Pattern**:

```typescript
// CORRECT: Atomic, race-safe
export async function assignReviewerToClaim(
  claimId: string,
  memberId: string
): Promise<{ claim?: Claim; error?: string }> {
  const [claim] = await db
    .update(claims)
    .set({
      reviewer_id: memberId,
      status: 'in_review',
      reviewed_at: new Date(),
    })
    .where(
      and(
        eq(claims.id, claimId),
        eq(claims.status, 'submitted'), // Optimistic lock: only submitted
        isNull(claims.reviewer_id) // Optimistic lock: not yet claimed
      )
    )
    .returning();

  if (!claim) {
    return {
      error:
        'Looks like someone else is already reviewing this claim. Check the dashboard for other ways to help!',
    };
  }

  return { claim };
}
```

**Why This Works**:

- ✅ **Atomic**: Single database operation (no gap between read and write)
- ✅ **Race-proof**: Database enforces WHERE conditions (only one UPDATE succeeds)
- ✅ **Immediate feedback**: No rows returned = race lost, clear error message
- ✅ **Self-documenting**: WHERE clause shows business rules

**INCORRECT (Race Condition)**:

```typescript
// ❌ NOT ATOMIC: Another process can claim between read and write
const claim = await db.select().from(claims).where(eq(claims.id, claimId));

if (claim.status !== 'submitted' || claim.reviewer_id) {
  return { error: 'Already claimed' };
}

// ⚠️ RACE WINDOW HERE: Another reviewer could claim now!

await db
  .update(claims)
  .set({ reviewer_id: memberId })
  .where(eq(claims.id, claimId));
```

**When to Use**:

- ✅ Claim assignment (reviewer claiming claim)
- ✅ Task claiming (member taking task)
- ✅ Mission leader election (first to accept becomes leader)
- ✅ Vote casting (prevent double-voting)
- ✅ Resource reservation (limited slots)

**Test Validation**:

```typescript
describe('Atomic Assignment', () => {
  it('should handle concurrent claim attempts', async () => {
    const claimId = 'test-claim-1';

    // Simulate 2 reviewers claiming simultaneously
    const [result1, result2] = await Promise.all([
      assignReviewerToClaim(claimId, 'reviewer-1'),
      assignReviewerToClaim(claimId, 'reviewer-2'),
    ]);

    // Exactly one should succeed
    const successes = [result1, result2].filter((r) => r.claim !== undefined);
    const failures = [result1, result2].filter((r) => r.error !== undefined);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].error).toContain('someone else is already reviewing');
  });
});
```

---

### 9. Transaction Boundaries as Function Signatures

**Pattern**: Pass `PoolClient` to functions, caller manages transaction scope

**Why**: Event writes must be in same transaction as state changes (consistency)

**Correct**:

```typescript
// Function signature declares transaction requirement
export async function approveClaimWithEvent(
  client: PoolClient, // Caller owns transaction
  claimId: string,
  reviewerId: string
) {
  // 1. State change
  await client.query('UPDATE claims SET status = $1 WHERE id = $2', [
    'approved',
    claimId,
  ]);

  // 2. Event write (same transaction)
  await client.query('INSERT INTO events (...) VALUES (...)', [
    /* event data */
  ]);
}

// Caller controls transaction boundary
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await approveClaimWithEvent(client, claimId, reviewerId);
  await updateMemberTrustScore(client, memberId, points);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**Incorrect**:

```typescript
// ❌ Function hides transaction, events can desync
export async function approveClaim(claimId: string) {
  await db
    .update(claims)
    .set({ status: 'approved' })
    .where(eq(claims.id, claimId));
  // Event logged separately - might fail while claim succeeds!
  await logEvent('claim.approved', { claim_id: claimId });
}
```

**Benefits**:

- ✅ **Explicit**: Function signature shows transaction requirement
- ✅ **Composable**: Multiple operations in one transaction
- ✅ **Safe**: Events and state always consistent (both commit or both rollback)

---

## QA Handoff Checklist

Before submitting to qa-engineer, verify:

### Code Quality

- [ ] TypeScript compiles without errors (`pnpm tsc --noEmit`)
- [ ] No character encoding issues (smart quotes, en-dashes)
- [ ] All new code has corresponding tests
- [ ] Tests pass locally (`pnpm test`)

### Contract Integrity

- [ ] Event logged for every state change (in same transaction)
- [ ] Event metadata includes actor_id, entity_id, before/after state
- [ ] Trust Score changes include before/after values
- [ ] Quasi-smart contract tests added (append-only events, immutability, derivation)

### Git Workflow

- [ ] Feature branch used (not main)
- [ ] Branch naming convention followed (SX-XX-description)
- [ ] Commits reference story ID in messages
- [ ] PR created with story link

### Documentation

- [ ] README updated if new commands added
- [ ] Inline comments explain complex business logic
- [ ] Test fixtures documented

### Sanctuary Culture

- [ ] Error messages are supportive, not punitive
- [ ] Database constraints have corresponding helpful messages
- [ ] Git hooks use encouraging language

---

## Common Pitfalls & Solutions

### Pitfall 1: Character Encoding (RECURRED: S2-03, S2-04)

**Symptom**: TypeScript compilation fails with "Unexpected character" or "Invalid string"  
**Cause**: Copying text from Markdown/Notion with smart typography  
**Solution**: Pre-commit hook + search before handoff:

```bash
grep -rn "[''""\u2013\u2014]" src/ --include="*.ts" --include="*.tsx" --include="*.astro"
```

### Pitfall 2: Events Logged Outside Transaction

**Symptom**: Event table has entries but corresponding state change didn't persist  
**Cause**: Event logged in separate query, transaction rolled back  
**Solution**: Pass `PoolClient`, write event in same transaction

### Pitfall 3: Race Conditions in Claim Assignment

**Symptom**: Two reviewers see same claim, both click "Review", both think they claimed it  
**Cause**: Read-then-write pattern with gap between queries  
**Solution**: Atomic assignment with `UPDATE...RETURNING` and WHERE conditions

### Pitfall 4: Punitive Error Messages

**Symptom**: Error messages feel harsh ("Access denied", "Invalid input", "Operation not allowed")  
**Cause**: Developer-centric copy, not member-centric  
**Solution**: Explain why + suggest what: "You'll need X to do Y. Try Z instead!"

### Pitfall 5: Test Coverage Without Contract Coverage

**Symptom**: High percentage coverage but contract bugs still slip through  
**Cause**: Testing UI logic but not quasi-smart contract scenarios  
**Solution**: Prioritize event integrity, immutability, and derivation tests first

---

## Success Metrics (Track in Sprint Retrospectives)

| Metric                     | Sprint 2 | Sprint 3 Target | How Measured                                |
| -------------------------- | -------- | --------------- | ------------------------------------------- |
| Character encoding bugs    | 2        | 0               | Count of "non-ASCII" compilation errors     |
| Git workflow violations    | 25%      | 0%              | % of stories without feature branch PR      |
| Event completeness         | 90%      | 95%             | % of state changes with corresponding event |
| Contract test coverage     | 0%       | 80%             | % of contract scenarios tested              |
| Sanctuary message adoption | 60%      | 100%            | % of error messages that are supportive     |

---

## Document Maintenance

**Update after each sprint**:

1. Add new patterns discovered in retrospectives
2. Document solutions to recurring QA issues
3. Update success metrics with actual results
4. Deprecate patterns that didn't work

**Owned by**: fullstack-developer (applied), qa-engineer (validated), product-advisor (evolves)

---

_Last updated: 2026-02-11 (Post S3-01 strategic review)_
