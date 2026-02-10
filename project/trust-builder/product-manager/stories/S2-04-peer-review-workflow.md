# Story: S2-04 Peer Review Workflow

## Goal

Enable peer review for claims that require human verification, establishing the human governance foundation for Trust Builder. This is a critical inflection point where fairness, transparency, and sanctuary culture values must be architecturally enforced.

**Strategic Value**: HIGH -- establishes social contract architecture for all future governance

## Complexity (for AI)

Complex (6-8 hours implementation)

## Ontology Mapping

- **Groups**: Missions provide review context (global queue for Season 0, mission-scoped deferred)
- **People**: Reviewer eligibility (250+ Contributors, 500+ Stewards), self-review prevention, workload tracking
- **Things**: Claim state machine (submitted → under_review → approved|rejected|revision_requested)
- **Connections**: Reviewer-to-claim assignment with race condition protection, revision cycles (max 2)
- **Events**: All state transitions logged with actor metadata and decision justification
- **Knowledge**: Trust score derivable from approved claims only (rejected claims = 0 points)

## User Story (Gherkin)

```gherkin
Given a claim requires peer review (verification_method = 'peer_review')
When a qualified reviewer (Contributor 250+ or Steward 500+) selects the claim from the queue
Then the claim moves to 'under_review' status atomically (prevent race conditions)
And the reviewer can approve, reject, or request revision with mandatory feedback
And the system logs events for each state transition with full metadata
And approved claims trigger atomic trust score update
And revision requests allow max 2 resubmission cycles
And orphaned claims auto-release after 72-hour timeout
```

## Acceptance Criteria

### Core Functionality
- [ ] AC1: Claims with `verification_method = 'peer_review'` appear in reviewer queue
- [ ] AC2: Reviewer eligibility enforced: trust_score >= 250 for Contributors, >= 500 for Stewards
- [ ] AC3: Reviewers cannot review their own claims (member_id != reviewer_id)
- [ ] AC4: Claim assignment is atomic (prevents two reviewers claiming same claim via race condition)
- [ ] AC5: Claim status transitions follow state machine: submitted → under_review → {approved | rejected | revision_requested}

### Review Actions
- [ ] AC6: APPROVE action atomically updates trust score + logs `claim.approved` event with full metadata
- [ ] AC7: REJECT action requires mandatory feedback (min 20 characters) + logs `claim.rejected` event
- [ ] AC8: REVISION REQUEST increments revision_count + requires feedback + logs `claim.revision_requested` event
- [ ] AC9: Revision requests limited to max 2 cycles (3rd revision auto-escalates to admin)
- [ ] AC10: All review actions log actor_id (reviewer_id) in event metadata

### Trust Score Integrity
- [ ] AC11: Approved claims add points to trust_score_cached atomically in transaction
- [ ] AC12: Rejected claims do NOT update trust score (remain at previous value)
- [ ] AC13: Trust score derivable from events: SUM(approved claims only)
- [ ] AC14: Trust score verification test passes (cached vs derived match)

### Review Lifecycle
- [ ] AC15: Reviewer assignment sets `review_deadline = NOW() + 72 hours`
- [ ] AC16: Orphaned claims (timeout) auto-release: status → submitted, reviewer_id → NULL, log `claim.review_timeout` event
- [ ] AC17: Reviewer can voluntarily release claim before deadline (returns to queue)

### Event Logging
- [ ] AC18: `EventType.CLAIM_REVIEW_ASSIGNED` added to enum and logged on assignment
- [ ] AC19: `claim.approved` event includes: {reviewer_id, verification_notes, points_awarded, dimensions, trust_score_before, trust_score_after}
- [ ] AC20: `claim.rejected` event includes: {reviewer_id, rejection_reason, can_resubmit: false}
- [ ] AC21: `claim.revision_requested` event includes: {reviewer_id, feedback, revision_count, previous_submission_hash}

### UX & Values Alignment (Sanctuary Culture)
- [ ] AC22: Reviewer dashboard includes sanctuary culture reminder: "Your role is to help members succeed, not to gatekeep"
- [ ] AC23: Rejection feedback uses supportive language ("Needs More Information" not "Rejected")
- [ ] AC24: Review interface displays task acceptance criteria prominently
- [ ] AC25: Review feedback form includes helper text guiding constructive feedback
- [ ] AC26: Claim detail shows member effort indicators (time spent, files uploaded, text length)

### Security & Fair Use
- [ ] AC27: Reviewer workload tracking: max 3 active reviews per member (configurable)
- [ ] AC28: Queue displays reviewer's current workload count
- [ ] AC29: Racing reviewers receive clear error: "This claim was just assigned to another reviewer"

### Mobile & Accessibility
- [ ] AC30: Review queue responsive on mobile (list view)
- [ ] AC31: Review action buttons accessible via keyboard navigation
- [ ] AC32: ARIA labels for screen readers on all review controls

## Implementation Notes (AI-facing)

### Schema Extensions (MUST)

```sql
-- Add revision tracking and timeout to claims table
ALTER TABLE claims 
  ADD COLUMN revision_count INTEGER DEFAULT 0 CHECK (revision_count <= 2),
  ADD COLUMN review_deadline TIMESTAMPTZ;

-- Add index for timeout query
CREATE INDEX idx_claims_review_timeout ON claims(status, review_deadline) 
  WHERE status = 'under_review';
```

### Event Types (MUST)

Add to `src/types/trust-builder.ts`:
```typescript
CLAIM_REVIEW_ASSIGNED = 'claim.review_assigned',
CLAIM_REVIEW_TIMEOUT = 'claim.review_timeout',
CLAIM_REVIEW_RELEASED = 'claim.review_released',
```

### API Endpoints

1. **GET /api/trust-builder/reviews/queue**
   - Filter: `status = 'submitted'` AND `verification_method = 'peer_review'`
   - Exclude: claims where `member_id = current_user_id` (no self-review)
   - Include: task details, member display_name, submission timestamp, proof preview
   - Sort: oldest first (FIFO fairness)

2. **POST /api/trust-builder/reviews/[id]/assign**
   - Atomic assignment with race condition protection:
   ```sql
   UPDATE claims 
   SET status = 'under_review', 
       reviewer_id = $1,
       review_deadline = NOW() + INTERVAL '72 hours',
       reviewed_at = NOW()
   WHERE id = $2 
     AND status = 'submitted'
     AND reviewer_id IS NULL
   RETURNING id;
   ```
   - Log `claim.review_assigned` event
   - Return 409 Conflict if already assigned

3. **PATCH /api/trust-builder/claims/[id]/review**
   - Body: `{decision: 'approve'|'reject'|'revision', feedback: string}`
   - Validations:
     - decision = 'reject' OR 'revision' → feedback required (min 20 chars)
     - revision_count >= 2 → return error "Max revisions reached, escalating to admin"
     - reviewer_id must match claim.reviewer_id
   - Approve: atomic trust score update + event log (use transaction)
   - Reject: log event + set status
   - Revision: increment revision_count + log event + reset to 'submitted'

4. **POST /api/trust-builder/reviews/[id]/release**
   - Allow reviewer to voluntarily release claim
   - Reset status → submitted, reviewer_id → NULL, review_deadline → NULL
   - Log `claim.review_released` event

### Contract Logic (claim-engine.ts)

Extend `claim-engine.ts` with:
```typescript
export async function approveClaimWithReview(
  client: PoolClient,
  claimId: string,
  reviewerId: string,
  verificationNotes?: string
): Promise<ClaimResult>

export async function rejectClaim(
  client: PoolClient,
  claimId: string,
  reviewerId: string,
  rejectionReason: string
): Promise<void>

export async function requestRevision(
  client: PoolClient,
  claimId: string,
  reviewerId: string,
  feedback: string
): Promise<void>
```

### UI Components

1. **src/pages/trust-builder/reviews/index.astro**
   - Reviewer queue dashboard
   - Filters: All | My Active Reviews
   - Show queue depth and personal workload count
   - Sanctuary culture reminder in header

2. **src/pages/trust-builder/reviews/[id].astro**
   - Claim detail view
   - Task acceptance criteria (prominent display)
   - Proof content (text + file previews)
   - Member context (trust score, submission history)
   - Review action form with:
     - Approve button (green, primary)
     - Request Revision button (yellow, with feedback textarea)
     - Reject button (red, with required reason textarea)
     - Release Claim button (gray, secondary)

3. **src/components/trust-builder/ReviewActionForm.tsx**
   - Client component with React Hook Form
   - Conditional feedback fields based on action
   - Character count for feedback (min 20)
   - Confirmation dialog for reject action

### Background Job (SHOULD)

Create `src/lib/cron/release-orphaned-claims.ts`:
```typescript
// Run daily or hourly
export async function releaseOrphanedClaims() {
  const result = await db.query(`
    UPDATE claims 
    SET status = 'submitted',
        reviewer_id = NULL,
        review_deadline = NULL
    WHERE status = 'under_review'
      AND review_deadline < NOW()
    RETURNING id, reviewer_id;
  `);
  
  // Log timeout events for accountability
  for (const claim of result.rows) {
    await logEvent({
      event_type: EventType.CLAIM_REVIEW_TIMEOUT,
      actor_id: claim.reviewer_id,
      entity_type: 'claim',
      entity_id: claim.id,
      metadata: { reason: 'Review deadline exceeded 72 hours' }
    });
  }
}
```

### Risk Mitigations

1. **Race Condition**: Use `WHERE status = 'submitted' AND reviewer_id IS NULL` in UPDATE
2. **Infinite Revisions**: CHECK constraint `revision_count <= 2`
3. **Orphaned Claims**: Auto-release via review_deadline + background job
4. **Trust Score Drift**: Add verification test comparing cached vs derived
5. **Collusion**: Event log creates audit trail for pattern detection (future analysis)

### Testing Focus

- **Integration Test**: Full revision cycle (submit → review → revise → review → approve)
- **Integration Test**: Rejected claim does NOT update trust score
- **Unit Test**: Race condition protection (concurrent assignment attempts)
- **Unit Test**: Mandatory feedback validation (reject/revision)
- **Unit Test**: Trust score derivation matches cached value

## Definition of Done (DoD)

### Implementation Complete
- [ ] All 32 acceptance criteria implemented and testable
- [ ] Schema migration executed on NeonDB
- [ ] All 3 API endpoints functional with error handling
- [ ] Reviewer dashboard and claim detail pages rendering
- [ ] Event types added and logging correctly

### Quality Validation
- [ ] QA engineer validates all ACs (especially AC13, AC14 trust score tests)
- [ ] Character encoding correct (use straight quotes, double-hyphens)
- [ ] TypeScript compilation clean (no errors)
- [ ] Manual test: Full review cycle (assign → approve → verify trust score)
- [ ] Manual test: Revision cycle (request revision → resubmit → approve)
- [ ] Manual test: Race condition (two reviewers try to claim same item)

### Documentation & Handoff
- [ ] QA report created in `product-manager/stories/S2-04-QA-REPORT.md`
- [ ] Product Advisor review: Grade B+ or higher (target: A-)
- [ ] Retro file created in `trust-builder/retros/story-S2-04-peer-review-retro.md`
- [ ] Migration readiness >= 95% (human governance audit trail complete)

### Values Alignment Checklist
- [ ] Sanctuary culture evident in UX language (supportive, not punitive)
- [ ] Transparency: Review decisions visible to member with reasons
- [ ] Fairness: Same criteria applied consistently via explicit display
- [ ] Empowerment: Revision mechanism helps members learn and improve

## Strategic Success Metrics

- **Migration Readiness**: 95%+ (human governance audit trail for DAO transition)
- **Ontology Integrity**: All 6 dimensions correctly integrated
- **Social Contract**: Review patterns establish future governance precedents
- **Code Quality**: A- grade (implements all MUSTs + 4+ SHOULDs)

## Grade Target: A- or Higher

**A Grade**: All MUSTs + 4+ SHOULDs, migration 95%+, sanctuary culture evident  
**B Grade**: All MUSTs + 2 SHOULDs, migration 90%+, functional  
**C Grade**: All MUSTs only, migration 85%, rough edges  
**F Grade**: Missing MUSTs or broken trust score calculation
