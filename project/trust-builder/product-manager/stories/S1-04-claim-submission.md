# Story S1-04: Claim Submission with Auto-Approve Engine

**Sprint**: 1  
**Story ID**: S1-04  
**Depends on**: S1-01 (Schema), S1-02 (Auth), S1-03 (Task Detail Pages)  
**Blocks**: S1-05 (Dashboard needs claim data)  
**Created**: 2026-02-09

---

## Goal

Enable authenticated members to submit claims on Open tasks with proof of completion, implementing the auto-approve engine that instantly evaluates criteria, awards points, updates trust scores, and logs immutable events—demonstrating quasi-smart contract behavior where code enforces organizational terms.

---

## Complexity (for AI)

**Complex** — This story involves:

- Writes (claim + proof creation)
- Atomic transactions (claim → approve → trust update → events must be all-or-nothing)
- Business logic (auto-approve engine, duplicate detection, criteria validation)
- Multiple tables (claims, proofs, events, members update)
- State machine enforcement (task lifecycle, claim lifecycle)

**Recommendation from S1-03 Retro**: Consider splitting into:

- **S1-04a**: Claim submission form + validation (writes, no auto-approve)
- **S1-04b**: Auto-approve engine + trust score updates (atomic transactions, event logging)

For this implementation, we'll build the **complete vertical slice** but architect it modularly so the auto-approve engine can be validated independently.

---

## Ontology Mapping

- **Groups**: None directly (mission context already established in S1-03)
- **People**: Member submits claim (requires authentication), member identity linked to claim
- **Things**: Create Claim record + child Proof records for each criterion
- **Connections**: Link claim to task via `task_id`, link proofs to criteria via `criterion_id`, link claim to member via `member_id`
- **Events**: Log `claim.submitted`, `claim.approved` (auto-approve only), `trust.updated` (auto-approve only)
- **Knowledge**: Update `trust_score_cached` on members table (derived from approved claims)

---

## User Story (Gherkin)

### Scenario 1: Submit Claim on Auto-Approve Task

```gherkin
Given I am authenticated as FE-M-00001
And I am viewing task "Attend Live Webinar" (auto-approve task)
When I click "Submit a Claim"
Then I see a claim submission form with:
  - One text field per acceptance criterion (2 criteria)
  - "Submit Claim" button
  - "Cancel" link back to task detail

When I fill in both proof fields:
  - Criterion 1: "I joined the Zoom call at 7:02pm EST and stayed for 58 minutes"
  - Criterion 2: "The key insight was about trust networks as social infrastructure"
And I click "Submit Claim"

Then the system executes atomically:
  1. Creates Claim record (status: 'submitted')
  2. Creates 2 Proof records (one per criterion)
  3. Evaluates auto-approve logic (all criteria use auto-approve)
  4. Updates Claim status to 'approved'
  5. Updates Member trust_score_cached (+50 Participation, +10 Innovation = +60 total)
  6. Logs 3 Events: claim.submitted, claim.approved, trust.updated

And I am redirected to my dashboard
And I see a success message: "Claim approved! You earned 60 points."
And my Trust Score now shows 60 points
```

### Scenario 2: Submit Claim on Peer-Review Task

```gherkin
Given I am authenticated as FE-M-00001
And I am viewing task "Design Values Workshop" (peer-review task)
When I submit a claim with proof
Then the system:
  1. Creates Claim (status: 'submitted')
  2. Creates Proof records
  3. Logs claim.submitted event
  4. Does NOT auto-approve (verification_method = 'peer-review')

And I am redirected to my dashboard
And I see: "Claim submitted! A reviewer will evaluate your work soon."
And my Trust Score does NOT increase yet (claim pending)
```

### Scenario 3: Duplicate Claim Prevention

```gherkin
Given I am authenticated as FE-M-00001
And I have already submitted a claim on task "Attend Live Webinar"
When I visit that task's detail page again
Then the "Submit a Claim" button is replaced with:
  - Text: "You have already claimed this task"
  - Status badge showing claim status (e.g., "Approved ✓")
  - Link: "View your claim history"

And if I try to POST to /api/trust-builder/claims with the same task_id
Then I receive a 409 Conflict error: "You have already claimed this task"
```

### Scenario 4: Task Completion Limit Reached

```gherkin
Given task "Attend Live Webinar" has max_completions = 2
And 2 members have already claimed and completed it
When I (FE-M-00003) visit the task detail page
Then I see:
  - Text: "This task has reached its completion limit (2/2)"
  - Disabled "Submit Claim" button
  - Status: "Task Complete"

And if I try to POST to /api/trust-builder/claims
Then I receive a 410 Gone error: "This task has reached its maximum completions"
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] **AC-1 (Claim Creation)**: Authenticated members can submit claims with text proof for each criterion
- [ ] **AC-2 (Auto-Approve Execution)**: Tasks where ALL criteria use `verification_method = 'auto-approve'` are instantly approved upon submission
- [ ] **AC-3 (Trust Score Update)**: Auto-approved claims atomically update member's `trust_score_cached` by summing incentive points
- [ ] **AC-4 (Event Logging)**: All claim submissions log `claim.submitted`; auto-approved claims additionally log `claim.approved` and `trust.updated`
- [ ] **AC-5 (Duplicate Prevention)**: Members cannot submit multiple claims on the same task (enforced via `no_duplicate_claims` constraint)
- [ ] **AC-6 (Atomic Transactions)**: Claim approval, trust update, and event logging happen in a single transaction (all succeed or all rollback)
- [ ] **AC-7 (Manual Review Path)**: Claims on tasks with peer-review or admin-review criteria remain in 'submitted' state (not auto-approved)

### Ontology Compliance

- [ ] **OC-1**: Claims are Connections (linking Members to Tasks, with lifecycle state tracking completion status)
- [ ] **OC-2**: Proofs are Connection details (linking Claims to Criteria with evidence, representing the completion proof per acceptance criterion)
- [ ] **OC-3**: Trust score is Knowledge (derived from events, uses `trust_score_cached` for performance but verifiable from ledger)
- [ ] **OC-4**: All state changes generate Events with proper `event_type` enum values

### Technical Quality

- [ ] **TQ-1**: Use `withTransaction()` helper from S1-01 for atomic operations
- [ ] **TQ-2**: Use TypeScript types from `src/types/trust-builder.ts` (Claim, Proof, ClaimState, EventType enums)
- [ ] **TQ-3**: API endpoints return proper HTTP status codes:
  - `201 Created` for successful claim submission
  - `409 Conflict` for duplicate claims
  - `410 Gone` for completed tasks
  - `400 Bad Request` for missing proofs or invalid UUIDs (apply S1-03 learning)
  - `401 Unauthorized` for unauthenticated requests
- [ ] **TQ-4**: Apply UUID validation pattern from S1-03 retro (return 400, not 500, for malformed UUIDs)

### User Experience

- [ ] **UX-1**: Claim form shows one text field per criterion with clear labels
- [ ] **UX-2**: Success messages differentiate auto-approved ("Claim approved!") vs. pending review ("Claim submitted for review")
- [ ] **UX-3**: Error messages are specific and actionable:
  - "You have already claimed this task. [View your claims →]"
  - "This task has reached its completion limit (X/X)"
  - "You must be signed in to submit a claim. [Sign in →]"
- [ ] **UX-4**: Disabled claim button shows helpful text (not just a non-clickable button)
- [ ] **UX-5**: Mobile-responsive form with proper input focus states

---

## Implementation Notes (AI-Facing)

### File Structure

Create/modify these files:

```
src/
  pages/
    trust-builder/
      tasks/
        [id]/
          claim.astro           # NEW: Claim submission form page
    api/
      trust-builder/
        claims.ts               # NEW: POST submit claim, GET list member claims
  components/
    trust-builder/
      ClaimForm.tsx             # NEW: Form with proof fields per criterion
      ClaimSuccessMessage.tsx   # NEW: Success banner with points earned
  lib/
    contracts/
      claim-engine.ts           # NEW: Auto-approve business logic
      validators.ts             # NEW: UUID validation, claim eligibility checks
  types/
    trust-builder.ts            # EXTEND: Add ClaimSubmissionRequest, ClaimResponse types
```

### Critical Implementation Requirements

**⚠️ Transaction-Safe Event Logging**:
Inside `withTransaction()` callbacks, you **must** use `logEventBatch(client, events)` from `@/lib/events/logger`. The `logEvent({sql, ...})` function uses the HTTP driver and cannot participate in transactions. This ensures events only persist if the entire claim submission succeeds.

```typescript
// ❌ WRONG - bypasses transaction boundary
await logEvent({ sql, ... });

// ✅ CORRECT - transaction-safe
await logEventBatch(client, [{ actor_id, entity_type, ... }]);
```

**⚠️ Dimension Breakdown for Blockchain Migration**:
The `calculateTaskPoints()` function must return both `total` and `dimensions` breakdown. Include dimension data in event metadata for `claim.approved` and `trust.updated` events. This enables on-chain attestations per dimension during migration.

```typescript
// Return shape:
{ total: 60, dimensions: { participation: 50, innovation: 10 } }
```

**⚠️ Auto-Approve Timestamp Handling**:
When auto-approving claims, set:
- `reviewed_at = NOW()` (system review is instant)
- `reviewer_id = NULL` (no human reviewer)
- `review_notes = 'Auto-approved: all criteria use auto-approve verification method'`

This creates a clear audit trail distinguishing system-approved from human-reviewed claims.

---

### API Endpoint: POST /api/trust-builder/claims

**Request Body**:

```typescript
{
  task_id: string; // UUID
  proofs: Array<{
    criterion_id: string; // UUID
    proof_text: string; // Required, min 10 chars
  }>;
}
```

**Response (Auto-Approved)**:

```typescript
{
  claim_id: string;
  status: 'approved';
  points_earned: number;
  new_trust_score: number;
  message: 'Claim approved! You earned 60 points.';
}
```

**Response (Pending Review)**:

```typescript
{
  claim_id: string;
  status: 'submitted';
  message: 'Claim submitted! A reviewer will evaluate your work soon.';
}
```

**Error Responses**:

- `401`: Not authenticated
- `400`: Missing proofs, invalid UUID, empty proof_text
- `404`: Task not found
- `409`: Duplicate claim (member already claimed this task)
- `410`: Task reached max_completions

### Business Logic: Auto-Approve Engine

**Key Functions**:

```typescript
// Returns dimension breakdown for blockchain migration
async function calculateTaskPoints(
  client: PoolClient, 
  taskId: string
): Promise<{ total: number; dimensions: Record<string, number> }> {
  const result = await client.query(
    `SELECT dimension, points FROM task_incentives WHERE task_id = $1`,
    [taskId]
  );
  
  const dimensions: Record<string, number> = {};
  let total = 0;
  
  for (const row of result.rows) {
    dimensions[row.dimension] = row.points;
    total += row.points;
  }
  
  return { total, dimensions };
}
```

**Algorithm** (in `claim-engine.ts`):

```typescript
export async function processClaimSubmission(
  client: PoolClient,
  memberId: string,
  taskId: string,
  proofs: ProofInput[]
): Promise<ClaimResult> {
  // STEP 1: Validate eligibility
  await validateClaimEligibility(client, memberId, taskId);

  // STEP 2: Create claim record
  const claim = await createClaim(client, memberId, taskId);

  // STEP 3: Create proof records
  await createProofs(client, claim.id, proofs);

  // STEP 4: Log claim.submitted event (using transaction-safe batch logger)
  await logEventBatch(client, [{
    actor_id: memberId,
    entity_type: 'claim',
    entity_id: claim.id,
    event_type: EventType.CLAIM_SUBMITTED,
    metadata: { task_id: taskId, proof_count: proofs.length },
  }]);

  // STEP 5: Check if auto-approve eligible
  const isAutoApprove = await checkAutoApproveEligibility(client, taskId);

  if (!isAutoApprove) {
    return {
      claimId: claim.id,
      status: 'submitted',
      message: 'Claim submitted! A reviewer will evaluate your work soon.',
    };
  }

  // STEP 6: Execute auto-approve workflow
  await updateClaimStatus(client, claim.id, ClaimState.APPROVED, {
    reviewed_at: new Date(), // System review happens instantly
    reviewer_id: null, // No human reviewer - system action
    review_notes: 'Auto-approved: all criteria use auto-approve verification method'
  });

  const pointsResult = await calculateTaskPoints(client, taskId);
  const { total: pointsEarned, dimensions: dimensionBreakdown } = pointsResult;

  await updateMemberTrustScore(client, memberId, pointsEarned);

  // Log both events in a single batch (transaction-safe)
  await logEventBatch(client, [
    {
      actor_id: memberId,
      entity_type: 'claim',
      entity_id: claim.id,
      event_type: EventType.CLAIM_APPROVED,
      metadata: {
        task_id: taskId,
        points_earned: pointsEarned,
        dimensions: dimensionBreakdown, // e.g., { participation: 50, innovation: 10 }
        auto_approved: true,
      },
    },
    {
      actor_id: memberId,
      entity_type: 'member',
      entity_id: memberId,
      event_type: EventType.TRUST_UPDATED,
      metadata: { 
        claim_id: claim.id, 
        points_added: pointsEarned,
        dimensions: dimensionBreakdown // Dimension-level attestation for blockchain migration
      },
    }
  ]);

  const newTrustScore = await getMemberTrustScore(client, memberId);

  return {
    claimId: claim.id,
    status: 'approved',
    pointsEarned,
    newTrustScore,
    message: `Claim approved! You earned ${pointsEarned} points.`,
  };
}
```

**Auto-Approve Check**:

```sql
-- Task is auto-approve eligible if ALL criteria use verification_method = 'auto-approve'
SELECT COUNT(*) = COUNT(*) FILTER (WHERE verification_method = 'auto-approve')
FROM task_criteria
WHERE task_id = $1
```

**Eligibility Validation**:

```typescript
async function validateClaimEligibility(
  client: PoolClient,
  memberId: string,
  taskId: string
): Promise<void> {
  // Check 1: Task exists and is Open
  const task = await client.query(
    `SELECT state, max_completions FROM tasks WHERE id = $1`,
    [taskId]
  );
  if (task.rows.length === 0) throw new NotFoundError('Task not found');
  if (task.rows[0].state !== 'open') throw new TaskNotOpenError();

  // Check 2: No duplicate claim (enforced by unique constraint too, but check explicitly for better UX)
  const existingClaim = await client.query(
    `SELECT id FROM claims WHERE member_id = $1 AND task_id = $2`,
    [memberId, taskId]
  );
  if (existingClaim.rows.length > 0) throw new DuplicateClaimError();

  // Check 3: Task not at max completions
  const maxCompletions = task.rows[0].max_completions;
  if (maxCompletions !== null) {
    const completionCount = await client.query(
      `SELECT COUNT(*) FROM claims WHERE task_id = $1 AND status = 'approved'`,
      [taskId]
    );
    if (completionCount.rows[0].count >= maxCompletions) {
      throw new TaskCompleteError();
    }
  }
}
```

### React Component: ClaimForm.tsx

**Pattern** (use `client:load` for form submission):

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { TaskCriterion } from '@/types/trust-builder';

interface ClaimFormProps {
  taskId: string;
  criteria: TaskCriterion[];
}

export function ClaimForm({ taskId, criteria }: ClaimFormProps) {
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate all criteria have proof
    const missingProofs = criteria.filter(
      (c) => !proofs[c.id] || proofs[c.id].trim().length < 10
    );
    if (missingProofs.length > 0) {
      setError('Please provide proof for all criteria (minimum 10 characters)');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/trust-builder/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          proofs: criteria.map((c) => ({
            criterion_id: c.id,
            proof_text: proofs[c.id],
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit claim');
      }

      const result = await response.json();

      // Redirect to dashboard with success message
      window.location.href = `/trust-builder/dashboard?claim=${result.claim_id}&status=${result.status}`;
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {criteria.map((criterion, index) => (
        <div key={criterion.id} className="space-y-2">
          <Label htmlFor={`proof-${criterion.id}`}>
            Criterion {index + 1}: {criterion.description}
          </Label>
          <Textarea
            id={`proof-${criterion.id}`}
            placeholder={`Provide evidence that you met this criterion (minimum 10 characters)`}
            value={proofs[criterion.id] || ''}
            onChange={(e) =>
              setProofs({ ...proofs, [criterion.id]: e.target.value })
            }
            rows={4}
            required
            minLength={10}
            disabled={isSubmitting}
          />
          <p className="text-sm text-muted-foreground">
            Verification: {criterion.verification_method}
          </p>
        </div>
      ))}

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Claim'}
        </Button>
        <Button type="button" variant="outline" asChild disabled={isSubmitting}>
          <a href={`/trust-builder/tasks/${taskId}`}>Cancel</a>
        </Button>
      </div>
    </form>
  );
}
```

### Astro Page: /trust-builder/tasks/[id]/claim.astro

**SSR Pattern**:

```astro
---
import Layout from '@/layouts/Layout.astro';
import { ClaimForm } from '@/components/trust-builder/ClaimForm';
import { getCurrentUser } from '@/lib/auth';

const { id } = Astro.params;
if (!id) return Astro.redirect('/trust-builder/tasks');

// Auth guard
const user = await getCurrentUser(Astro.request);
if (!user) {
  return Astro.redirect(
    `/trust-builder/signin?redirect=/trust-builder/tasks/${id}/claim`
  );
}

// Fetch task with criteria
const response = await fetch(
  `${Astro.url.origin}/api/trust-builder/tasks/${id}`
);
if (!response.ok) return Astro.redirect('/trust-builder/tasks');

const { task } = await response.json();

// Check eligibility (optional - API will also validate, but improves UX)
const existingClaimResponse = await fetch(
  `${Astro.url.origin}/api/trust-builder/claims?task_id=${id}`,
  { headers: { cookie: Astro.request.headers.get('cookie') || '' } }
);
if (existingClaimResponse.ok) {
  const { claims } = await existingClaimResponse.json();
  if (claims.length > 0) {
    return Astro.redirect(`/trust-builder/dashboard?error=duplicate_claim`);
  }
}
---

<Layout title={`Submit Claim: ${task.title}`}>
  <div class="container max-w-3xl py-8">
    <h1 class="text-3xl font-bold mb-2">Submit Claim</h1>
    <p class="text-muted-foreground mb-8">
      Task: <a href={`/trust-builder/tasks/${id}`} class="underline"
        >{task.title}</a
      >
    </p>

    <div class="bg-card p-6 rounded-lg border mb-6">
      <h2 class="text-xl font-semibold mb-4">Acceptance Criteria</h2>
      <p class="text-sm text-muted-foreground mb-4">
        You must provide proof for each criterion below. Be specific and
        honest—your work builds trust.
      </p>
      <ClaimForm taskId={id} criteria={task.criteria} client:load />
    </div>

    <div class="bg-muted p-4 rounded-lg">
      <h3 class="font-semibold mb-2">What happens next?</h3>
      <ul class="text-sm space-y-1 text-muted-foreground">
        <li>• Your claim will be submitted immediately</li>
        <li>
          • If all criteria are auto-approved, you'll earn points instantly
        </li>
        <li>
          • For peer-reviewed tasks, a reviewer will evaluate your work within
          48 hours
        </li>
        <li>• You'll receive a notification when your claim is processed</li>
      </ul>
    </div>
  </div>
</Layout>
```

### Task Detail Page Update

Modify `/trust-builder/tasks/[id].astro` to:

1. Check if user has already claimed this task
2. Check if task is at max_completions
3. Show appropriate CTA:
   - "Submit a Claim" button → links to `/trust-builder/tasks/[id]/claim`
   - "You have already claimed this task" with status badge
   - "Task Complete (X/X)" if max reached

**Code snippet to add**:

```astro
---
// After fetching task data, check claim status
let userClaimStatus = null;
if (user) {
  const claimsResponse = await fetch(
    `${Astro.url.origin}/api/trust-builder/claims?task_id=${id}`,
    { headers: { cookie: Astro.request.headers.get('cookie') || '' } }
  );
  if (claimsResponse.ok) {
    const { claims } = await claimsResponse.json();
    if (claims.length > 0) {
      userClaimStatus = claims[0].status; // 'submitted', 'approved', etc.
    }
  }
}

// Check if task is complete
const isTaskComplete =
  task.max_completions !== null &&
  task.completion_count >= task.max_completions;
---

<!-- CTA Section -->
<div class="mt-8">
  {
    !user ? (
      <Button asChild size="lg">
        <a
          href={`/trust-builder/signin?redirect=/trust-builder/tasks/${id}/claim`}
        >
          Sign In to Claim This Task
        </a>
      </Button>
    ) : userClaimStatus ? (
      <div class="space-y-2">
        <p class="text-muted-foreground">You have already claimed this task</p>
        <Badge
          variant={userClaimStatus === 'approved' ? 'success' : 'secondary'}
        >
          {userClaimStatus === 'approved' ? 'Approved ✓' : 'Under Review'}
        </Badge>
        <Button variant="outline" asChild>
          <a href="/trust-builder/dashboard">View Your Claims →</a>
        </Button>
      </div>
    ) : isTaskComplete ? (
      <div class="space-y-2">
        <p class="text-muted-foreground">
          This task has reached its completion limit ({task.max_completions}/
          {task.max_completions})
        </p>
        <Badge variant="secondary">Task Complete</Badge>
      </div>
    ) : (
      <Button asChild size="lg">
        <a href={`/trust-builder/tasks/${id}/claim`}>Submit a Claim</a>
      </Button>
    )
  }
</div>
```

### Testing Checklist (for QA Engineer)

**Functional Tests**:

- [ ] Submit claim on auto-approve task (2 criteria) → instant approval, points awarded
- [ ] Submit claim on peer-review task → stays in 'submitted' state
- [ ] Try to submit duplicate claim → receive 409 error
- [ ] Try to claim completed task (max_completions reached) → receive 410 error
- [ ] Submit claim while unauthenticated → redirected to sign-in
- [ ] Submit claim with missing proof → receive validation error
- [ ] Submit claim with proof < 10 chars → receive validation error

**Transaction Tests**:

- [ ] Simulate DB error during trust update → entire transaction rolls back (no orphaned claim)
- [ ] Check `events` table has exactly 3 entries for auto-approved claim (submitted, approved, trust.updated)
- [ ] Verify `trust_score_cached` matches SUM of approved claim points

**API Tests**:

```bash
# Happy path: Submit claim
curl -X POST http://localhost:4322/api/trust-builder/claims \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "...",
    "proofs": [
      {"criterion_id": "...", "proof_text": "I attended the webinar..."},
      {"criterion_id": "...", "proof_text": "Key insight was..."}
    ]
  }'

# Expected: 201 Created, claim_id returned, status='approved', points_earned=60

# Duplicate claim
curl -X POST http://localhost:4322/api/trust-builder/claims \
  -H "Cookie: session=..." \
  -d '{ same data }'

# Expected: 409 Conflict, error message
```

**UI Tests**:

- [ ] Claim form shows one textarea per criterion
- [ ] Form validates minimum 10 chars before submit
- [ ] Success message shows points earned (auto-approve) or "Submitted for review" (manual)
- [ ] Mobile: Form is usable on 375px viewport
- [ ] Loading state: Submit button shows "Submitting..." while processing

---

## Definition of Done (DoD)

### Implementation Complete

- [ ] All files created and committed
- [ ] TypeScript compilation successful (`pnpm exec tsc --noEmit`)
- [ ] No ESLint warnings
- [ ] API endpoint tested with curl (both auto-approve and peer-review paths)
- [ ] Transaction rollback tested (simulate DB error mid-transaction)

### QA Validation

- [ ] All 7 functional acceptance criteria validated by `qa-engineer`
- [ ] All 4 ontology compliance checks validated
- [ ] All 4 technical quality checks validated
- [ ] All 5 UX criteria validated
- [ ] QA report created with PASS status
- [ ] No critical or high-severity bugs found

### Product Advisor Review

- [ ] Ontology alignment reviewed by `product-advisor`
- [ ] Quasi-smart contract behavior validated (immutability, atomic execution, event logging)
- [ ] Grade of B+ or higher
- [ ] Feedback documented in advisor-feedback/

### Retrospective

- [ ] `retro-facilitator` creates `story-S1-04-claim-submission-retro.md`
- [ ] Lessons learned captured (especially transaction patterns, business logic testing)
- [ ] Action items identified for S1-05

---

## Dependencies & Blockers

### Depends On (Must Be Complete)

- ✅ S1-01: Schema & Seed Data (DONE - provides tables, transaction helper)
- ✅ S1-02: Email Auth (DONE - provides getCurrentUser, session management)
- ✅ S1-03: Public Task List (DONE - provides task detail pages as entry point)

### Blocks (Cannot Start Until This Is Done)

- S1-05: Member Dashboard (needs claims data to display)

### External Dependencies

- NeonDB transaction support (validated in S1-01, using `withTransaction` helper)
- Astro SSR for auth guards (working from S1-02)

---

## Risks & Mitigations

| Risk                                                     | Probability | Impact | Mitigation                                                                                      |
| -------------------------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------------- |
| Transaction rollback fails mid-claim                     | Low         | High   | Comprehensive testing with simulated DB errors; use proven `withTransaction` pattern from S1-01 |
| Duplicate claim slips through race condition             | Low         | Medium | Database unique constraint `no_duplicate_claims` provides fallback; API-level check improves UX |
| Auto-approve logic incorrectly approves peer-review task | Low         | High   | Write comprehensive test suite; require ALL criteria to be auto-approve (not just majority)     |
| Trust score calculation drifts from events               | Low         | High   | Make trust score derivable from events table; add verification helper in S1-06                  |
| Form submission slow on poor connection                  | Medium      | Low    | Add client-side validation before submit; show progress indicator                               |

---

## Success Metrics (for Product Owner)

After S1-04 is deployed:

- Members can complete the full engagement loop: Browse → Sign In → Claim → Earn Points
- Auto-approve tasks create instant gratification (points awarded in <1 second)
- Event log captures complete audit trail for Season 0 → blockchain migration
- Trust scores begin accumulating, creating visible progression

**Expected Volume** (Season 0 launch week):

- 10-15 founding members
- 30-50 claims on "Attend Live Webinar" (auto-approve)
- 10-20 claims on peer-review tasks (validation for S1-06 review workflow)

---

## Notes

**Key Learnings from S1-03 Retro Applied**:

- ✅ UUID validation helper (return 400 for malformed IDs)
- ✅ Smart UX for disabled states (show helpful text, not just disabled button)
- ✅ Reuse IncentiveBadge component (in success message showing breakdown)

**Transaction Pattern Critical**:
This story demonstrates the quasi-smart contract principle of **atomic execution**. If trust update fails, the entire claim must rollback—no partial state. This mimics on-chain transaction semantics.

**Event Ledger as Source of Truth**:
The `trust_score_cached` field is a performance optimization. The true source of truth is the `sum of points from approved claims` in the events log. S1-06 will implement verification helpers to prove consistency.

**Auto-Approve ≠ No Review**:
Auto-approve is appropriate for low-stakes, easily verified actions (attendance, simple contributions). Complex tasks requiring judgment use peer-review. The criteria's `verification_method` field controls this logic.

---

**Ready for handoff to `fullstack-developer`** 🚀
