# Trust Builder: Team Learnings & Development Guidelines

**Document Purpose**: Synthesized learnings from Sprint 2 retrospectives  
**Last Updated**: 2026-02-11  
**Status**: Living document (update after each sprint)  
**Source**: Story retros (S2-01 through S2-04) + Sprint 2 Retrospective

---

## Table of Contents

- [Core Principles](#core-principles)
- [Process Guidelines](#process-guidelines)
- [Technical Patterns](#technical-patterns)
- [Ontology Guidelines](#ontology-guidelines)
- [Code Quality Standards](#code-quality-standards)
- [Sanctuary Culture Integration](#sanctuary-culture-integration)
- [Migration Readiness Checklist](#migration-readiness-checklist)
- [Common Pitfalls & Solutions](#common-pitfalls--solutions)
- [Team Action Items](#team-action-items)

---

## Core Principles

### 1. Strategic Review First, Implementation Second

**Principle**: All Medium+ complexity stories receive strategic review before coding begins.

**Why**: Proven 3-4x ROI across Sprint 2
- S2-01: Prevented 3 production safety gaps
- S2-02: Improved event metadata design (85% migration-ready)
- S2-03: Prevented R2 vendor lock-in (saved 2-3 hours + simplified migration)
- S2-04: Defense-in-depth pattern identified upfront (95% migration-ready)

**Process**:
1. Product-owner assigns story
2. Product-advisor conducts 45-90 min pre-implementation review
3. Review produces written report with MUST/SHOULD items
4. Developer waits for review before implementation
5. Review report becomes reference during coding

**When to Use**:
- ✅ Complex stories (6+ points)
- ✅ High-value stories (migration impact)
- ✅ New patterns (first implementation)
- ✅ Infrastructure changes (database, auth, external services)

**When to Skip**:
- ❌ Simple stories (<2 hours)
- ❌ Repetitive patterns (nth implementation)
- ❌ Bug fixes
- ❌ UI polish

**Success Metrics**: 0 architectural rework, higher migration readiness scores, fewer QA cycles

---

### 2. Event Sourcing as Single Source of Truth

**Principle**: Events table is source of truth; database state is cache.

**Architecture**:
```
Database state = CACHE (can be rebuilt from events)
Event log = SOURCE OF TRUTH (append-only, immutable)
Trust scores = DERIVABLE (query events, sum points)
```

**Migration Path**:
```
events.jsonl → IPFS → smart contract emission → on-chain trust scores
```

**Event Schema Requirements**:
- ✅ Rich JSONB metadata (actor_id, entity_id, before/after state)
- ✅ Append-only (no UPDATE/DELETE on events table)
- ✅ Transaction-bounded (events inside same tx as state change)
- ✅ Deterministic (no server timestamps in business logic, no random values)

**Why This Matters**:
- Database can be nuked and rebuilt from events (disaster recovery)
- Disputes resolved by replaying events (audit trail)
- Blockchain migration = export events + replay on-chain

**Example** (from S2-04):
```typescript
await withTransaction(client, async (tx) => {
  // 1. UPDATE claim status
  await tx.query('UPDATE claims SET status = $1 WHERE id = $2', ['approved', claimId]);
  
  // 2. UPDATE trust score
  await tx.query('UPDATE members SET trust_score = trust_score + $1 WHERE id = $2', [points, memberId]);
  
  // 3. LOG EVENT (inside same transaction)
  await tx.query('INSERT INTO events (event_type, metadata) VALUES ($1, $2)', [
    'claim.approved',
    {
      claim_id: claimId,
      reviewer_id: reviewerId,
      trust_score_before: 320,  // Enables reconstruction
      trust_score_after: 395,   // Verification without recalculation
      points_awarded: 75,
      verification_notes: 'LGTM'
    }
  ]);
});
```

**Sprint 2 Evidence**: Event log progression 85% → 92% → 95% migration-ready

---

### 3. Defense-in-Depth for Critical Business Rules

**Principle**: Enforce critical rules at lowest possible level (database > application > UI).

**Two-Layer Pattern**:
1. **Database Layer**: CHECK constraints, NOT NULL, UNIQUE (uncheateable, cannot bypass)
2. **Application Layer**: Sanctuary-aligned error messages (educational, user-friendly)

**Examples from Sprint 2**:

| Business Rule         | Database Constraint                  | Application Validation                                   |
| --------------------- | ------------------------------------ | -------------------------------------------------------- |
| Max 2 revision cycles | `CHECK (revision_count <= 2)`        | "This claim has reached the maximum revision limit (2)"  |
| 10MB file size limit  | `CHECK (file_size <= 10485760)`      | "This file is a bit too large—let's keep it under 10MB" |
| Reviewer eligibility  | Foreign key + trust_score CHECK      | "You need 250+ trust score to review claims"             |
| No self-review        | `CHECK (claimant_id != reviewer_id)` | "You cannot review your own claims"                      |

**Why Both Layers Matter**:
- **Security**: Database constraints cannot be bypassed (even with SQL injection)
- **UX**: Application messages provide sanctuary-aligned guidance
- **Migration**: Constraints map directly to Solidity `require()` statements

**Implementation Checklist**:
- [ ] Critical rule identified
- [ ] CHECK constraint added to migration file
- [ ] Constraint name descriptive (`claims_revision_count_check`)
- [ ] Application validation with sanctuary message
- [ ] QA validates both layers (constraint + message)

---

### 4. Sanctuary Culture as Architecture, Not Copy

**Principle**: Embed values in system design, not just UI text.

**Architectural Patterns for Sanctuary**:

| Pattern                       | Implementation                        | Sanctuary Outcome                           |
| ----------------------------- | ------------------------------------- | ------------------------------------------- |
| Fail-closed error handling    | Clear error messages prevent confusion | Members understand what happened and why    |
| Immutability locking          | Published tasks as binding commitments | Trust through code constraints, not policy  |
| Educational tooltips          | Members learn cryptographic concepts  | Transparency builds understanding           |
| Workload caps                 | Max 3 reviews per reviewer (CHECK)    | Prevents burnout structurally               |
| Mandatory feedback            | 20-char minimum (CHECK + validation)  | Forces constructive criticism               |
| Feedback templates            | Starter prompts in UI                 | Guides helpful review culture               |
| Revision cycles               | Max 2 with clear explanation          | Learning opportunity without infinite loops |

**Error Message Guidelines**:
- ✅ **Educational**: Explain what happened and why
- ✅ **Actionable**: Tell user how to fix it
- ✅ **Non-punitive**: "This file is too large" not "ERROR: SIZE_LIMIT_EXCEEDED"
- ✅ **Specific**: "Please upload PDF, PNG, or JPG" not "Invalid file type"
- ✅ **Inviting**: "Need a different format? Let us know!"

**Examples from Sprint 2**:

**S2-01 (Fail-closed)**:
```typescript
// ❌ Bad: Technical jargon
throw new Error('RESEND_API_KEY missing');

// ✅ Good: Sanctuary-aligned
throw new Error('Email delivery is not configured');
```

**S2-02 (Immutability)**:
```typescript
// ❌ Bad: Punitive
return { error: 'Cannot edit published task' };

// ✅ Good: Educational
return { 
  error: 'This task has been published and cannot be edited. Core contract terms are locked to ensure fairness for members who already claimed it.' 
};
```

**S2-04 (Race condition)**:
```typescript
// ❌ Bad: Technical jargon
return { error: 'Race condition detected' };

// ✅ Good: Sanctuary-aligned
return { 
  error: 'This claim was just assigned to another reviewer. Please select a different claim from the queue.' 
};
```

**Budget Time**: Allocate 10-15 min per story for copy crafting. Error messages shape culture as much as features.

---

## Process Guidelines

### Git Workflow (75% Compliance Target: 100%)

**Standard Workflow**:
1. Create feature branch BEFORE implementation: `git checkout -b S2-05-feature-name`
2. Commit to feature branch: Small, atomic commits with clear messages
3. Open PR when implementation complete: `gh pr create --fill`
4. Wait for reviews (product-advisor, qa-engineer)
5. Merge to main after approval

**Pre-Commit Checklist**:
- [ ] Feature branch created (not working on main)
- [ ] TypeScript compiles (`pnpm build`)
- [ ] No character encoding issues (smart quotes, en-dashes)
- [ ] Sanctuary language reviewed (error messages, button labels)
- [ ] Ready for QA handoff

**Violations in Sprint 2**:
- S2-03: Direct commits to main (violation noted, corrected in S2-04)

**Action Items for S3**:
- [ ] Implement pre-push hook (reject commits to main)
- [ ] Update developer checklist (branch creation BEFORE implementation)
- [ ] Make git workflow violation = automatic B+ grade cap

**Rationale**: Code review opportunity, rollback safety, documentation in PRs, team learning

---

### Manual Testing Schedule

**Problem**: Stories identify testing requirements but don't schedule them → ACs marked "NEEDS TEST"

**Solution**: Add testing schedule to story template

**Story Timeline**:
- **Day 1-2**: Implementation (fullstack-developer)
- **Day 3**: Code review (product-advisor strategic review)
- **Day 4**: Code inspection QA (qa-engineer, 2 hours)
- **Day 5**: Manual testing (qa-engineer, 1 hour) ← NEW
  - Mobile responsiveness (iPhone 12+, Pixel 4+)
  - Keyboard navigation (Tab through interactive elements)
  - Screen reader (VoiceOver/NVDA)
- **Day 6**: QA report (qa-engineer)

**Testing Checklist** (1 hour allocated):

```markdown
### Mobile (30 min)
- [ ] Viewport rendering (375px, 768px, 1024px)
- [ ] Touch targets (buttons >44px, tappable)
- [ ] Form input (keyboard appears, input works)

### Accessibility (20 min)
- [ ] Keyboard navigation (Tab through all interactive elements)
- [ ] Focus indicators (visible focus state)
- [ ] Screen reader (VoiceOver announces labels correctly)

### Cross-browser (10 min)
- [ ] Chrome (primary browser)
- [ ] WebKit-based (Safari, Edge)
- [ ] Firefox (optional, if time allows)
```

**Resource Requirements**:
- iPhone 12+ (iOS 16+) for mobile testing
- Pixel 4+ (Android 12+) for mobile testing
- VoiceOver (macOS) or NVDA (Windows) configured

**Sprint 2 Gap**: 6 ACs marked "NEEDS TEST" across S2-03 and S2-04 (mobile, keyboard, accessibility)

---

### Strategic Review Process

**Timing**: BEFORE implementation begins

**Duration**: 
- Simple stories: Skip review (0 min)
- Medium stories: 45-60 min standard review
- Complex stories: 2-3 hour deep review (e.g., governance architecture)

**Review Checklist**:
```markdown
## Pre-Implementation Strategic Review

### Ontology Validation (10 min)
- [ ] Which dimensions affected? (Groups, People, Things, Connections, Events, Knowledge)
- [ ] Any new entities proposed?
- [ ] Are entities correctly mapped? (status = Thing attribute, not separate entity)

### Migration Readiness (10 min)
- [ ] Event log completeness plan?
- [ ] Immutability strategy for published entities?
- [ ] Quasi-smart contract patterns identified?

### Architecture Options (15 min)
- [ ] 3 implementation approaches considered?
- [ ] Pros/cons documented?
- [ ] Simplest approach recommended for Season 0?

### Risk Assessment (10 min)
- [ ] Edge cases identified?
- [ ] Security considerations?
- [ ] Performance concerns?

### Sanctuary Culture (5 min)
- [ ] Error messages educational?
- [ ] Button labels non-threatening?
- [ ] Feedback mechanisms constructive?
```

**Deliverable**: Written review report with MUST/SHOULD items

**ROI Evidence** (Sprint 2 average): 3-4x time savings

---

## Technical Patterns

### Pattern 1: Atomic Assignment with UPDATE ... RETURNING ⭐

**Use Case**: Any competitive action where only one actor should succeed
- Claim assignment (S2-04)
- Mission leader election (future)
- Task claiming (future)
- Resource reservation (future)
- Vote casting (future)

**Template**:
```sql
UPDATE {table}
SET status = 'assigned', 
    assigned_to = $1,
    assigned_at = NOW()
WHERE id = $2 
  AND status = 'available'
  AND assigned_to IS NULL
RETURNING id;
```

**TypeScript Wrapper**:
```typescript
async function assignResource(
  client: PoolClient,
  resourceId: string,
  actorId: string
): Promise<{ success: boolean; message?: string }> {
  const result = await client.query(
    `UPDATE claims 
     SET status = 'under_review', reviewer_id = $1
     WHERE id = $2 AND reviewer_id IS NULL
     RETURNING id`,
    [actorId, resourceId]
  );
  
  if (result.rows.length === 0) {
    return {
      success: false,
      message: 'This claim was just assigned to another reviewer'
    };
  }
  
  return { success: true };
}
```

**Why This is Gold Standard**:
- **Atomic**: Single UPDATE, no race window
- **Optimistic locking**: `WHERE reviewer_id IS NULL` ensures only one succeeds
- **Immediate feedback**: `RETURNING id` (0 rows = race lost)
- **Self-documenting**: SQL expresses business logic clearly
- **Database-enforced**: Cannot bypass

**Testing**: Two browser windows, same reviewer, simultaneous click → one succeeds, one gets 409 Conflict

---

### Pattern 2: Transaction Boundaries as Function Signatures

**Principle**: Pass `PoolClient` to functions that need transactions; caller manages scope.

**Implementation**:
```typescript
// Business logic function (transaction-safe)
async function approveClaimWithReview(
  client: PoolClient,  // ← Caller manages transaction
  claimId: string,
  reviewerId: string,
  feedback: string
): Promise<Claim> {
  // 1. UPDATE claim
  await client.query('UPDATE claims SET status = $1 WHERE id = $2', ['approved', claimId]);
  
  // 2. UPDATE trust score
  await client.query('UPDATE members SET trust_score = trust_score + $1 WHERE id = $2', [points, memberId]);
  
  // 3. LOG event
  await client.query('INSERT INTO events ...', [metadata]);
  
  return claim;
}

// Caller manages transaction scope
await withTransaction(dbUrl, async (tx) => {
  const claim = await approveClaimWithReview(tx, claimId, reviewerId, feedback);
  // Additional operations in same transaction...
  return claim;
});
```

**Why This Works**:
- Caller controls transaction scope (composable)
- Functions are pure (testable with mock client)
- Clear semantics (signature declares tx requirement)
- Prevents nested transactions (antipattern)

**Sprint 2 Evidence**: Zero partial writes, clean rollbacks on errors

---

### Pattern 3: RETURNING Clause for Atomic Operations

**Traditional Approach** (2 queries, race window):
```typescript
await client.query('UPDATE claims SET ...');
const result = await client.query('SELECT * FROM claims WHERE id = $1');
```

**Optimized Pattern** (1 query, atomic):
```typescript
const result = await client.query('UPDATE claims SET ... RETURNING *');
```

**Benefits**:
- Atomic (no race window between UPDATE and SELECT)
- Faster (one database round-trip)
- Simpler (fewer lines of code)
- Safer (returns exactly what was updated)

**Always Use RETURNING For**:
- INSERT (get auto-generated ID)
- UPDATE (get updated row)
- DELETE (get deleted row for audit)

---

### Pattern 4: Fail-Closed Error Handling

**Principle**: When production config missing, fail loudly with clear message.

**Implementation**:
```typescript
if (!apiKey) {
  if (import.meta.env.DEV) {
    // Development: Provide fallback
    console.log('[DEV] Using console fallback for email');
    return;
  }
  
  // Production: Fail closed
  throw new Error('Email delivery is not configured');
}
```

**Why This Matters**:
- **In DEV**: Console fallback preserves workflow (no external account needed)
- **In PROD**: Clear error prevents silent failures
- **HTTP Status**: 503 (config issue) vs 500 (bug)
- **No PII**: Error never includes sensitive data

**Examples**:
- Missing API keys (RESEND_API_KEY)
- Database connection unavailable
- External service timeout

**Contrast with Fail-Open**: Never fail open in production (creates silent data loss)

---

### Pattern 5: Magic Byte Validation for File Uploads

**Principle**: Don't trust HTTP headers for Content-Type; validate magic bytes.

**Implementation**:
```typescript
function detectContentType(buffer: Buffer): string | null {
  const uint8 = new Uint8Array(buffer);
  
  // Check magic bytes for JPEG: FF D8 FF
  if (uint8[0] === 0xff && uint8[1] === 0xd8 && uint8[2] === 0xff) {
    return 'image/jpeg';
  }
  
  // Check magic bytes for PNG: 89 50 4E 47
  if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47) {
    return 'image/png';
  }
  
  // Check magic bytes for PDF: 25 50 44 46
  if (uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46) {
    return 'application/pdf';
  }
  
  return null;
}
```

**Why This Matters**:
- Headers can be spoofed (attacker uploads `malware.exe` as `image.png`)
- Magic bytes cannot be faked (file format intrinsic to bytes)
- Protects reviewers who view files

**Sprint 2 Evidence**: QA graded security posture A+ (S2-03)

---

## Ontology Guidelines

### The 6 Dimensions Are Complete

**Principle**: Resist urge to add new dimensions. ONE ontology is sufficient for all Trust Builder features.

**The 6 Dimensions**:
1. **Groups** - Missions, working groups, governance councils
2. **People** - Members, roles (Guardian, reviewer), eligibility
3. **Things** - Tasks, claims, proposals, proofs
4. **Connections** - Assignments, votes, reviews, approvals
5. **Events** - State changes, logged with complete metadata
6. **Knowledge** - Trust scores, reputation (derivable from Events)

**Common Temptations to Resist**:

| Temptation                | Why It's Wrong                                   | Correct Mapping         |
| ------------------------- | ------------------------------------------------ | ----------------------- |
| "Add Governance dimension" | Governance is People-driven process              | People + Events         |
| "Add Status table"        | Status is Thing attribute, not entity            | Thing attribute (ENUM)  |
| "Add Audit Log table"     | Audit is event tracking                          | Events table (metadata) |
| "Add Trust Scores table"  | Trust scores derivable from events               | Compute from Events     |
| "Add Relationships table" | Relationships are Connections                    | Connections dimension   |

**Sprint 2 Validation**: S2-04 peer review mapped cleanly to existing dimensions
- Groups: Mission context
- People: Reviewer role, eligibility (trust_score >= 250)
- Things: Claim state machine
- Connections: Reviewer-to-claim assignment
- Events: All review actions logged
- Knowledge: Trust score updated based on review outcome

**Lesson**: When considering new entity, first ask "Which dimension does this belong to?"

---

### Status is Attribute, Not Entity

**Anti-Pattern**:
```sql
-- ❌ Wrong: Status as separate entity
CREATE TABLE task_status (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE tasks (
  status_id INTEGER REFERENCES task_status(id)
);
```

**Correct Pattern**:
```sql
-- ✅ Right: Status as attribute
CREATE TABLE tasks (
  status TEXT CHECK (status IN ('draft', 'open', 'closed')) DEFAULT 'draft'
);
```

**Why This Matters**:
- Simpler migration (status is enum, not separate contract)
- Fewer tables (reduced complexity)
- Better performance (no JOIN needed)
- Clear ontology (status is Property of Thing, not Entity)

**When to Use Separate Table**: Only if status has attributes (description, color, permissions)

---

### Events Include Complete Metadata

**Principle**: Event metadata must be sufficient to reconstruct all state.

**Required Fields**:
- `actor_id` - WHO did the action
- `entity_id` - WHAT was affected
- `entity_type` - Type of entity ('claim', 'task', 'member')
- State transition - Before/after values (if applicable)
- Derived values - trust_score_before/after, points_awarded
- Business context - Reason, notes, related entities

**Example** (S2-04 claim.approved event):
```json
{
  "claim_id": "uuid-here",
  "reviewer_id": "uuid-reviewer",
  "claimant_id": "uuid-claimant",
  "trust_score_before": 320,
  "trust_score_after": 395,
  "points_awarded": 75,
  "verification_notes": "LGTM, screenshots clear"
}
```

**Why This Matters**:
- **Reconstruction**: Trust scores computable from events alone
- **Verification**: trust_score_after = trust_score_before + points_awarded (query validation)
- **Audit**: Complete history available for disputes
- **Migration**: Event log exports to blockchain without gaps

**Testing**: SQL query to verify trust_score cache matches event-derived value

---

## Code Quality Standards

### TypeScript Strict Mode

**Configuration**: 
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Benefits**:
- Type errors caught at compile time (not runtime)
- Fewer null/undefined bugs
- Better autocomplete in IDE

**Sprint 2 Evidence**: 2 compilation errors caught in QA (both character encoding, not type errors)

---

### Character Encoding Discipline

**Problem**: Copying text from Markdown → TypeScript introduces smart quotes/en-dashes

**Solutions**:
1. **ESLint Rule**: Detect non-ASCII characters in string literals
2. **Pre-commit Hook**: Run `tsc --noEmit` before commit
3. **Developer Checklist**: Run `pnpm build` before QA handoff

**Example Issues**:
- S2-03: Smart quotes in string literals (`'` instead of `'`)
- S2-04: En-dashes in error messages (`–` instead of `-`)

**Fix**: Replace with ASCII equivalents before committing

---

### Transaction Completeness

**Checklist**:
```markdown
- [ ] withTransaction() wrapper used (no inline BEGIN/COMMIT)
- [ ] All related writes inside same transaction (UPDATE + INSERT events)
- [ ] Event logging inside transaction (not after COMMIT)
- [ ] Single return point (no early returns that skip COMMIT)
- [ ] Error handling present (try/catch with ROLLBACK on error)
```

**Sprint 2 Evidence**: Zero partial writes, clean rollbacks

---

### Database Constraint Naming

**Convention**: `{table}_{column}_{constraint_type}`

**Examples**:
- `claims_revision_count_check` (CHECK constraint)
- `members_email_unique` (UNIQUE constraint)
- `claims_reviewer_id_fkey` (FOREIGN KEY)

**Why This Matters**: Error messages reference constraint names; descriptive names aid debugging

---

## Sanctuary Culture Integration

### Error Message Checklist

**Before Shipping Any Error Message**:
- [ ] **Educational**: Explains what happened and why
- [ ] **Actionable**: Tells user how to fix it
- [ ] **Non-punitive**: Helpful tone, not blaming
- [ ] **Specific**: Concrete guidance, not vague
- [ ] **Inviting**: Open to feedback and questions

**Examples from Sprint 2**:

| Context          | ❌ Technical/Punitive                | ✅ Sanctuary-Aligned                                                                           |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Email not config | "RESEND_API_KEY missing"            | "Email delivery is not configured"                                                             |
| Immutability     | "Cannot edit published task"        | "This task has been published and cannot be edited. Core terms are locked to ensure fairness" |
| File size        | "ERROR: FILE_TOO_LARGE"             | "This file is a bit too large—let's keep it under 10MB to ensure smooth sailing"              |
| Race condition   | "Race condition detected"           | "This claim was just assigned to another reviewer. Please select a different claim"           |
| Self-review      | "Invalid: claimant cannot review"   | "You cannot review your own claims"                                                            |

---

### Button Label Guidelines

**Principles**:
- Action-oriented (verb phrase)
- Non-threatening language
- Clear intent

**Examples from S2-04**:
- ✅ "Needs More Information" (not "Reject")
- ✅ "Approve with Feedback" (not "Accept")
- ✅ "Request Revision" (not "Send Back")
- ✅ "Release This Claim" (not "Abandon")

---

### Confirmation Dialog Patterns

**For Irreversible Actions** (publish, approve, delete):

```typescript
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogTitle>Publish this task?</AlertDialogTitle>
    <AlertDialogDescription>
      Once published, this task becomes a contract. 
      Title, criteria, and incentives cannot be changed.
      This ensures fairness for members who claim it.
    </AlertDialogDescription>
    <AlertDialogAction onClick={handlePublish}>
      Yes, Publish Task
    </AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

**Why Educational Dialogs Matter**: Pre-trains members for blockchain immutability

---

### Feedback Templates

**Pattern**: Provide starter prompts to guide constructive criticism

**Example from S2-04**:
```typescript
const feedbackTemplates = [
  "Please provide more detail about...",
  "Could you clarify how you...",
  "Great start! To strengthen this, consider adding...",
];
```

**Why This Works**: 
- Reduces blank-page anxiety
- Models sanctuary language
- Encourages specific feedback (not vague "needs work")

---

## Migration Readiness Checklist

### Per-Story Assessment

**Use this checklist during strategic review and QA validation**:

```markdown
## Migration Readiness Assessment

### Event Log Completeness (30 points)
- [ ] All state transitions logged (10 pts)
- [ ] Complete metadata (actor, entity, before/after) (10 pts)
- [ ] Derivable values logged (trust_score, hash chains) (10 pts)

### Data Integrity (25 points)
- [ ] Immutability patterns (published entities locked) (10 pts)
- [ ] Atomic operations (transactions for multi-step writes) (10 pts)
- [ ] Referential integrity (foreign keys enforced) (5 pts)

### Quasi-Smart Contract Patterns (25 points)
- [ ] Deterministic outcomes (no timestamps/random in calculations) (10 pts)
- [ ] Idempotent operations (safe to retry) (10 pts)
- [ ] Defense-in-depth (database + application validation) (5 pts)

### Smart Contract Mappability (20 points)
- [ ] Ontology compliance (maps to 6 dimensions) (10 pts)
- [ ] Business logic exportable (no server-side dependencies) (10 pts)

**Total Score**: /100  
**Grade**: 90-100 = A (migration-ready), 80-89 = B (minor gaps), <80 = C (rework needed)
```

**Sprint 2 Progression**: 85% → 90% → 92% → 95%

---

### Trust Score Verification Query

**Run Monthly in Production** (detect cache drift):

```sql
-- Trust Score Drift Detection
WITH derived_scores AS (
  SELECT 
    c.member_id,
    SUM(CAST(e.metadata->>'points_awarded' AS INTEGER)) as derived_total
  FROM claims c
  JOIN events e ON e.entity_id = c.id::TEXT
  WHERE c.status = 'approved' 
    AND e.event_type = 'claim.approved'
  GROUP BY c.member_id
)
SELECT 
  m.id, 
  m.email,
  m.trust_score as cached_score,
  COALESCE(ds.derived_total, 0) as derived_score,
  CASE 
    WHEN m.trust_score = COALESCE(ds.derived_total, 0) THEN '✅ MATCH' 
    ELSE '❌ DRIFT' 
  END as status
FROM members m
LEFT JOIN derived_scores ds ON ds.member_id = m.id
WHERE m.trust_score != COALESCE(ds.derived_total, 0);
```

**Expected Result**: 0 rows (perfect match)  
**If Drift Found**: Investigate events table for missing/incorrect entries

---

## Common Pitfalls & Solutions

### Pitfall 1: Nested Transactions

**Problem**: Calling `withTransaction()` inside another `withTransaction()`

**Solution**: Pass `PoolClient` to inner function; caller manages transaction scope

```typescript
// ❌ Wrong: Nested transactions
await withTransaction(dbUrl, async (tx1) => {
  await withTransaction(dbUrl, async (tx2) => {  // Bug!
    // ...
  });
});

// ✅ Right: Single transaction, composable functions
async function innerLogic(client: PoolClient) { /* ... */ }

await withTransaction(dbUrl, async (tx) => {
  await innerLogic(tx);
});
```

---

### Pitfall 2: Race Conditions in Assignment Logic

**Problem**: `SELECT` then `UPDATE` creates race window

**Solution**: `UPDATE WHERE ... RETURNING` atomic pattern

```typescript
// ❌ Wrong: Race window between SELECT and UPDATE
const claim = await client.query('SELECT * FROM claims WHERE id = $1', [id]);
if (claim.rows[0].reviewer_id !== null) {
  return { error: 'Already assigned' };
}
await client.query('UPDATE claims SET reviewer_id = $1 WHERE id = $2', [reviewerId, id]);

// ✅ Right: Atomic UPDATE with optimistic locking
const result = await client.query(
  'UPDATE claims SET reviewer_id = $1 WHERE id = $2 AND reviewer_id IS NULL RETURNING id',
  [reviewerId, id]
);
if (result.rows.length === 0) {
  return { error: 'This claim was just assigned to another reviewer' };
}
```

---

### Pitfall 3: Event Logging Outside Transaction

**Problem**: Event inserted after COMMIT (not atomic with state change)

**Solution**: Include event logging inside `withTransaction()` scope

```typescript
// ❌ Wrong: Event logged after transaction completes
await withTransaction(dbUrl, async (tx) => {
  await tx.query('UPDATE claims SET status = $1', ['approved']);
  await tx.query('UPDATE members SET trust_score = trust_score + $1', [points]);
});
// Event logged AFTER COMMIT (could fail independently)
await client.query('INSERT INTO events ...', [metadata]);

// ✅ Right: Event logged inside transaction
await withTransaction(dbUrl, async (tx) => {
  await tx.query('UPDATE claims SET status = $1', ['approved']);
  await tx.query('UPDATE members SET trust_score = trust_score + $1', [points]);
  await tx.query('INSERT INTO events ...', [metadata]);  // Atomic!
});
```

---

### Pitfall 4: Character Encoding Bugs

**Problem**: Copying Markdown text → TypeScript introduces smart quotes

**Prevention**:
1. ESLint rule: `no-irregular-whitespace`, `no-misleading-character-class`
2. Pre-commit hook: Run `tsc --noEmit`
3. Manual check: Search for `'`, `"`, `–` before committing

**Sprint 2 Recurrence**: S2-03 and S2-04 both had this issue (pattern not prevented between stories)

---

### Pitfall 5: Incomplete State Machines

**Problem**: Missing timeout path or voluntary exit path

**Solution**: Design 5 paths upfront

1. **Happy path** - Normal completion
2. **Failure path** - Permanent rejection
3. **Retry path** - Learning opportunity
4. **Timeout path** - Accountability for abandonment
5. **Voluntary exit** - Workload management

**Example**: S2-04 claim review state machine includes all 5 paths

---

## Team Action Items

### High Priority (Must Complete Before S3)

- [ ] **Implement pre-push hook for git workflow** (Owner: fullstack-developer)
  - Reject commits to main branch
  - Force feature branch creation
  - Estimated time: 30 minutes

- [ ] **Set up pre-commit hooks** (Owner: fullstack-developer)
  - Run `tsc --noEmit` before commit
  - ESLint check for character encoding
  - Estimated time: 1 hour

- [ ] **Create S3-01 story: Test Infrastructure** (Owner: product-owner)
  - Vitest setup
  - Integration tests for API endpoints
  - Unit tests for business logic (claim-engine, auth)
  - Target: 60% code coverage by end of S3

- [ ] **Allocate manual testing resources** (Owner: qa-engineer)
  - Purchase or borrow iPhone 12+ and Pixel 4+
  - Set up VoiceOver on Mac (30 min)
  - Create mobile/accessibility testing checklist
  - Budget: ~$200 for devices

- [ ] **Update story template with Testing Schedule** (Owner: product-owner)
  - Add Day 5: Manual testing (1 hour, qa-engineer)
  - Mobile, keyboard, screen reader checklist

### Medium Priority (S3 Improvements)

- [ ] **Document atomic assignment pattern** (Owner: product-advisor)
  - Create `/trust-builder/patterns/atomic-assignment.md`
  - Include SQL template, TypeScript wrapper, test scenarios
  - Estimated time: 1 hour

- [ ] **Create architectural patterns library** (Owner: product-advisor)
  - Transaction wrappers
  - Defense-in-depth examples
  - Event logging templates
  - Estimated time: 3 hours

- [ ] **Publish grade rubric** (Owner: product-advisor)
  - Document 5-category system (Functionality 40%, Ontology 20%, Migration 20%, Quality 10%, Values 10%)
  - Save in `/product-manager/GRADING-RUBRIC.md`
  - Estimated time: 1 hour

- [ ] **Define story complexity tags** (Owner: product-owner)
  - Low/Medium/Complex criteria
  - Apply tags to backlog
  - Stratify review depth per complexity
  - Estimated time: 30 minutes

### Low Priority (S4+ Improvements)

- [ ] **Implement background job for orphaned claim release** (Owner: fullstack-developer)
  - Vercel Cron or GitHub Actions
  - Run daily at 00:00 UTC
  - Timeline: Post-deployment polish

- [ ] **Create migration readiness validation** (Owner: fullstack-developer)
  - Export scripts (database → JSON → Web3 format)
  - Reconstruction test (events → trust scores)
  - Timeline: Post-S3 (not blocking)

- [ ] **Document strategic review process** (Owner: product-advisor)
  - How reviews work (timeline, format, deliverables)
  - For future team members
  - Save in `/product-manager/STRATEGIC-REVIEW-PROCESS.md`

---

## Success Metrics

**Sprint 2 Achievements**:
- ✅ Strategic review ROI: 3-4x time savings (proven across 4 stories)
- ✅ Migration readiness: 85% → 95% progression
- ✅ Sprint grade: A (4.0 GPA), up from B+ in Sprint 1
- ✅ Git workflow: 75% compliance (up from 50%)
- ✅ Event sourcing architecture: Production-grade
- ✅ Zero critical bugs: All issues LOW severity

**Sprint 3 Targets**:
- 🎯 Strategic review: 100% adoption for Complex stories
- 🎯 Git workflow: 100% compliance (pre-push hook enforced)
- 🎯 Manual testing: 100% AC validation (no "NEEDS TEST" items)
- 🎯 Automated tests: 60% code coverage
- 🎯 Migration readiness: Maintain 90%+ average
- 🎯 Sprint grade: A (if achievable with increased complexity)

---

## Document Maintenance

**Update Frequency**: After each sprint retrospective

**Update Process**:
1. Review sprint retro for new learnings
2. Add new patterns to Technical Patterns section
3. Update Action Items with completion status
4. Archive completed items to CHANGELOG
5. Update Success Metrics

**Document Owner**: retro-facilitator

**Last Reviewed**: 2026-02-11 (Sprint 2 retrospective)

---

_This is a living document. As the team learns, this document evolves._
