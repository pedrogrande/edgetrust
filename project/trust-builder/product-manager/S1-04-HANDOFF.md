# S1-04 Handoff: Claim Submission with Auto-Approve Engine

**From**: product-owner  
**To**: fullstack-developer  
**Date**: 2026-02-09  
**Story**: [S1-04-claim-submission.md](stories/S1-04-claim-submission.md)

---

## Mission

Build the **claim engine**—the heart of Trust Builder's quasi-smart contract system. When members submit proof of task completion, the system must:

1. Validate eligibility (no duplicates, task is Open, not at max completions)
2. Create claim + proof records
3. **Execute auto-approve logic** for qualifying tasks
4. **Atomically update trust scores** and log immutable events
5. Handle both instant approval (auto-approve) and pending review (peer/admin review) paths

This is the most complex story in Sprint 1. It involves writes, transactions, business logic, and serves as the foundation for the entire reward system.

---

## Key Implementation Priorities

### 1. **Transaction Integrity is Non-Negotiable** ⚠️

Use the `withTransaction()` helper from S1-01 for the entire claim workflow:

```typescript
await withTransaction(dbUrl, async (client) => {
  // ALL of these steps must succeed together OR rollback completely:
  await createClaim(client, ...);
  await createProofs(client, ...);
  
  // ⚠️ CRITICAL: Use logEventBatch(client, [...]) inside transactions
  // The logEvent({sql, ...}) function uses HTTP driver and bypasses transactions
  await logEventBatch(client, [
    {
      actor_id: memberId,
      entity_type: 'claim',
      entity_id: claimId,
      event_type: EventType.CLAIM_SUBMITTED,
      metadata: { task_id: taskId, proof_count: proofs.length }
    }
  ]);
  
  if (isAutoApprove) {
    // Auto-approve sets reviewed_at=NOW(), reviewer_id=NULL for audit trail
    await updateClaimStatus(client, claimId, ClaimState.APPROVED, {
      reviewed_at: new Date(),
      reviewer_id: null,
      review_notes: 'Auto-approved: all criteria use auto-approve verification method'
    });
    
    // Calculate points with dimension breakdown for blockchain migration
    const { total, dimensions } = await calculateTaskPoints(client, taskId);
    await updateMemberTrustScore(client, memberId, total);
    
    await logEventBatch(client, [
      {
        actor_id: memberId,
        entity_type: 'claim',
        entity_id: claimId,
        event_type: EventType.CLAIM_APPROVED,
        metadata: { 
          task_id: taskId, 
          points_earned: total,
          dimensions, // Include dimension breakdown
          auto_approved: true 
        }
      },
      {
        actor_id: memberId,
        entity_type: 'member',
        entity_id: memberId,
        event_type: EventType.TRUST_UPDATED,
        metadata: { 
          claim_id: claimId, 
          points_added: total,
          dimensions // Dimension attestations for on-chain migration
        }
      }
    ]);
  }
});
```

**Why**: Partial claim states would corrupt the trust system. If trust update fails, the claim must not exist.

### 2. **Apply S1-03 Learnings** 📚

From the S1-03 retrospective, implement these patterns:

✅ **UUID Validation Helper**
```typescript
// Return 400, not 500, for malformed UUIDs
if (!isValidUUID(taskId)) {
  return new Response('Invalid task ID format', { status: 400 });
}
```

✅ **Smart UX for State Changes**
- Auto-approved: "Claim approved! You earned 60 points."
- Pending review: "Claim submitted! A reviewer will evaluate your work soon."
- Don't just show status—explain what happens next.

✅ **Component Reuse**
- Use `IncentiveBadge` in success message to show point breakdown by dimension
- Follow same mobile-responsive patterns from S1-03 (sm/lg breakpoints)

### 3. **Auto-Approve Logic Must Be Strict** 🔒

A task is auto-approve eligible **only if ALL criteria** use `verification_method = 'auto-approve'`:

```sql
-- Check: ALL criteria must be auto-approve (not just majority)
SELECT COUNT(*) = COUNT(*) FILTER (WHERE verification_method = 'auto-approve')
FROM task_criteria
WHERE task_id = $1
```

**Why**: One peer-review criterion means the entire claim needs human judgment. Don't auto-approve partially.

### 4. **Event Logging Creates Audit Trail** 📝

Every claim generates **minimum 1 event**, auto-approved claims generate **3 events**:

1. `claim.submitted` (always)
2. `claim.approved` (auto-approve only)
3. `trust.updated` (auto-approve only)

**Metadata requirements**:
```typescript
// claim.submitted
{
  task_id: string,
  proof_count: number
}

// claim.approved
{
  task_id: string,
  points_earned: number,
  auto_approved: true
}

// trust.updated
{
  claim_id: string,
  points_added: number
}
```

These events are the **source of truth** for Season 0 → blockchain migration. They must be complete and correct.

### 5. **Error Handling Must Be Specific** 💬

Return precise HTTP status codes with actionable messages:

| Scenario | Status | Message |
|----------|--------|---------|
| Success (auto-approve) | 201 Created | "Claim approved! You earned X points." |
| Success (pending) | 201 Created | "Claim submitted! A reviewer will evaluate your work soon." |
| Not authenticated | 401 Unauthorized | "You must be signed in to submit a claim." |
| Invalid UUID | 400 Bad Request | "Invalid task ID format" |
| Task not found | 404 Not Found | "Task not found" |
| Task not Open | 400 Bad Request | "This task is not currently accepting claims" |
| Duplicate claim | 409 Conflict | "You have already claimed this task. [View your claims →]" |
| Max completions reached | 410 Gone | "This task has reached its completion limit (X/X)" |
| Missing proofs | 400 Bad Request | "You must provide proof for all criteria" |
| Proof too short | 400 Bad Request | "Proof must be at least 10 characters" |

**Why**: Clear error messages reduce support burden and improve member experience.

---

## Architecture Guidance

### Files to Create

**Core Business Logic** (most important):
- `src/lib/contracts/claim-engine.ts` - Auto-approve engine, eligibility validation
- `src/lib/contracts/validators.ts` - UUID validation, proof validation

**API Layer**:
- `src/pages/api/trust-builder/claims.ts` - POST submit claim, GET list claims

**UI Layer**:
- `src/pages/trust-builder/tasks/[id]/claim.astro` - Claim submission form page
- `src/components/trust-builder/ClaimForm.tsx` - Form with criterion fields (client:load)
- `src/components/trust-builder/ClaimSuccessMessage.tsx` - Success banner with points

**Modifications**:
- `src/pages/trust-builder/tasks/[id].astro` - Update CTA logic (check existing claim, max completions)
- `src/types/trust-builder.ts` - Add ClaimSubmissionRequest, ClaimResponse types

### Testing Strategy

**Unit Tests** (claim-engine.ts):
- `validateClaimEligibility()` catches all error states
- `checkAutoApproveEligibility()` requires ALL criteria to be auto-approve
- `calculateTaskPoints()` sums incentives correctly

**Integration Tests** (API):
- Auto-approve path: claim → approve → trust update → 3 events logged
- Peer-review path: claim → remain submitted → 1 event logged
- Duplicate claim: 409 error, no database changes
- Transaction rollback: simulate DB error mid-transaction, verify no partial state

**UI Tests** (browser):
- Form shows one field per criterion
- Submit button disabled during submission
- Success message shows correct points earned
- Error messages are specific and helpful

---

## Success Criteria (Definition of Done)

Before marking S1-04 complete, verify:

- [ ] **Functional**: All 7 acceptance criteria pass QA validation
- [ ] **Transaction Safety**: Rollback test confirms no partial claim states
- [ ] **Ontology**: Claims are Connections (linking Members to Tasks), Events are logged, Trust is Knowledge (derived)
- [ ] **Performance**: Auto-approve completes in <1 second
- [ ] **UX**: Mobile-responsive, clear error messages, success feedback
- [ ] **Documentation**: QA report shows PASS, product-advisor grades B+ or higher

---

## Known Complexity Areas

### 1. Transaction Scope

The auto-approve workflow touches 4 tables in one transaction:
- `claims` (INSERT + UPDATE)
- `proofs` (INSERT multiple)
- `members` (UPDATE trust_score_cached)
- `events` (INSERT 3 times)

**Test this carefully**. Simulate DB errors at each step to confirm rollback behavior.

### 2. Race Conditions

Two members could theoretically submit claims simultaneously when the task is at `max_completions - 1`. The database constraint `no_duplicate_claims` prevents double-claims by the same member, but you need logic to check completion count **inside the transaction** to prevent exceeding max.

### 3. Trust Score Derivation

`trust_score_cached` is updated for performance, but the **true score** is always `SUM(points) FROM events WHERE event_type = 'claim.approved'`. S1-06 will add verification helpers. For S1-04, just ensure the update logic is:

```typescript
// CORRECT (increment)
UPDATE members 
SET trust_score_cached = trust_score_cached + $1
WHERE id = $2

// WRONG (set absolute value - loses concurrency safety)
UPDATE members 
SET trust_score_cached = $1
WHERE id = $2
```

---

## Dependencies Ready

✅ **From S1-01**:
- `withTransaction()` helper - tested and working
- `logEventBatch()` utility - transaction-safe event logging (use this, NOT logEvent)
- All tables created (claims, proofs, events, members)
- EventType enum includes CLAIM_SUBMITTED, CLAIM_APPROVED, TRUST_UPDATED

✅ **From S1-02**:
- `getCurrentUser()` - auth guard for claim submission
- Session management - identifies member submitting claim
- Member ID format - stable identifier for claim ownership

✅ **From S1-03**:
- Task detail pages - entry point for "Submit Claim" button
- IncentiveBadge component - reusable for success message
- TypeScript types - Task, Criterion interfaces complete

---

## Estimated Complexity

**Implementation**: 6-8 hours (complex business logic, transaction handling)  
**Testing**: 3-4 hours (comprehensive transaction + rollback + UI testing)  
**QA Validation**: 2-3 hours (all acceptance criteria + edge cases)  
**Total**: ~12-15 hours (1.5-2 days for AI agent)

**Recommendation**: Build incrementally:
1. **Day 1 AM**: API endpoint + basic claim creation (no auto-approve)
2. **Day 1 PM**: Auto-approve engine + transaction logic
3. **Day 2 AM**: UI components + form submission
4. **Day 2 PM**: Error handling + testing + QA handoff

---

## Questions? Blockers?

If you encounter:
- **Transaction issues**: Review S1-01 implementation, check Pool vs sql usage
- **Type errors**: Extend `src/types/trust-builder.ts`, don't create inline types
- **Business logic confusion**: Refer to `05-smart-contract-behaviour-spec.md`
- **Auth patterns**: Reference S1-02 implementation

Remember: S1-04 is the **most important story in Sprint 1**. It closes the core engagement loop (Browse → Sign In → Claim → Earn Points). Take time to get transactions right—this is the foundation for all future claim workflows.

---

**Story Reference**: [S1-04-claim-submission.md](stories/S1-04-claim-submission.md) (44 KB, comprehensive spec)

**Ready to begin!** 🚀
