# Strategic Review: S2-04 Peer Review Workflow

**Review Date**: 2026-02-10  
**Reviewer**: product-advisor (via product-owner)  
**Story**: S2-04 Peer Review Workflow  
**Status**: APPROVED FOR IMPLEMENTATION (with conditions)

---

## Executive Summary

S2-04 introduces human governance into Trust Builder—a critical inflection point where fairness, transparency, and sanctuary culture values must be architecturally enforced. This story transforms the system from auto-approval to community governance, establishing patterns that will define all future decision-making mechanisms.

**Strategic Classification**: HIGH RISK / HIGH VALUE  
**Migration Readiness Impact**: Critical (95% target)  
**Complexity**: 6-8 hours implementation

**APPROVAL**: ✅ Proceed with implementation
**CONDITIONS**: Must implement all 5 MUST items, should prioritize 4+ SHOULD items

---

## Dimensional Analysis

### Groups: Review Context (✅ ADEQUATE)

- Global reviewer queue acceptable for Season 0
- Mission-scoped reviewer pools deferred to future (documented)

### People: Reviewer Eligibility (⚠️ CRITICAL)

**RISK: Collusion & Gaming**

- Two Contributors create reciprocal approval arrangements
- **Mitigation**: Event log creates audit trail for pattern detection
- **Future**: Require 2+ reviewers for high-value tasks (S3)

**RISK: Reviewer Burnout**

- Few Stewards overwhelmed by review queue
- **Mitigation S2-04**: Max 3 active reviews per member (AC27)
- **Future**: Round-robin assignment, max reviews per week

**RISK: Inconsistent Standards**

- Different reviewers apply different criteria
- **Mitigation S2-04**: Display task criteria prominently (AC24)
- **Future**: Calibration exercises, reviewer training

### Things: State Machine Integrity (⚠️ SCHEMA EXTENSION REQUIRED)

**RISK: Infinite Revision Loops**

- Reviewer requests revision 5+ times for same claim
- **MITIGATION REQUIRED**: Add `revision_count` column, max 2 revisions

```sql
ALTER TABLE claims
  ADD COLUMN revision_count INTEGER DEFAULT 0 CHECK (revision_count <= 2),
  ADD COLUMN review_deadline TIMESTAMPTZ;
```

### Connections: Assignment Logic (✅ HYBRID APPROACH)

**Decision**: Self-selection (reviewer claims from queue)

- ✅ Distributed, no admin bottleneck, reviewer agency
- ⚠️ Cherry-picking risk (acceptable for Season 0)
- 📊 Instrumented with events for pattern detection

**Race Condition Protection** (CRITICAL):

```sql
UPDATE claims
SET status = 'under_review', reviewer_id = $1
WHERE id = $2
  AND status = 'submitted'
  AND reviewer_id IS NULL
RETURNING id;
```

### Events: Audit Trail (❌ MISSING EVENT TYPE)

**REQUIRED**: Add `EventType.CLAIM_REVIEW_ASSIGNED` to enum

**Event Metadata Requirements**:

**claim.review_assigned**:

```json
{
  "reviewer_id": "uuid",
  "assignment_method": "self_selected",
  "queue_depth_at_assignment": 7
}
```

**claim.revision_requested**:

```json
{
  "reviewer_id": "uuid",
  "feedback": "explain what needs fixing...",
  "revision_count": 1,
  "previous_submission_hash": "sha256..."
}
```

**claim.approved**:

```json
{
  "reviewer_id": "uuid",
  "verification_notes": "optional",
  "points_awarded": 75,
  "dimensions": { "participation": 50, "innovation": 25 },
  "trust_score_before": 320,
  "trust_score_after": 395
}
```

**claim.rejected**:

```json
{
  "reviewer_id": "uuid",
  "rejection_reason": "required",
  "can_resubmit": false
}
```

### Knowledge: Trust Score Derivation (⚠️ CALCULATION UPDATE)

**Change**: Must filter by `status = 'approved'` (exclude rejected/pending)

**Critical Test**:

```
Member submits claim (50 pts) → pending
Reviewer rejects → trust_score UNCHANGED
Member submits new claim (50 pts) → approved
Expected: trust_score = previous + 50
```

---

## Values Alignment

### 🏛️ Sanctuary Culture (CRITICAL)

**Language Guidelines**:

- ❌ "Rejected" → ✅ "Needs More Information"
- ❌ "Failed" → ✅ "Not Yet Approved"
- ❌ "Revision Required" → ✅ "Revision Suggested"

**Reviewer Training Prompt** (must appear in UI):

> "Your role is to help members succeed, not to gatekeep. When requesting revisions, explain what's missing and HOW to fix it. Remember: you were once a new member too."

### ⚖️ Fairness & Transparency

**REQUIREMENT**: Make feedback mandatory

```typescript
if (decision === 'rejected' || decision === 'revision_requested') {
  if (!feedback || feedback.trim().length < 20) {
    throw new Error('Feedback required when not approving (min 20 characters)');
  }
}
```

### 🌱 Member Empowerment

**Enhancement**: Turn review into learning opportunity

- Show task criteria explicitly
- Provide constructive feedback templates
- Allow revision and resubmission (max 2 cycles)

---

## Technical Risks & Mitigations

### RISK 1: Race Conditions (HIGH)

**Mitigation**: Atomic UPDATE with WHERE conditions + optimistic locking

### RISK 2: Orphaned Claims (MEDIUM)

**Mitigation**: 72-hour timeout + background job to auto-release

```sql
ALTER TABLE claims ADD COLUMN review_deadline TIMESTAMPTZ;

-- Auto-release query
UPDATE claims
SET status = 'submitted', reviewer_id = NULL
WHERE status = 'under_review'
  AND review_deadline < NOW();
```

### RISK 3: Trust Score Drift (HIGH)

**Mitigation**: Add verification test

```sql
-- Verification query
SELECT m.id, m.trust_score_cached,
       COALESCE(SUM(ti.points), 0) as derived_score
FROM members m
LEFT JOIN claims c ON c.member_id = m.id AND c.status = 'approved'
LEFT JOIN task_incentives ti ON ti.task_id = c.task_id
GROUP BY m.id
HAVING m.trust_score_cached != COALESCE(SUM(ti.points), 0);
```

---

## Implementation Requirements

### MUST Address (Grade Blockers) — 5 Items

1. ✅ Add `EventType.CLAIM_REVIEW_ASSIGNED` to enum
2. ✅ Add `revision_count` and `review_deadline` columns to claims table
3. ✅ Implement revision count limit (max 2 cycles, CHECK constraint)
4. ✅ Make rejection feedback mandatory (min 20 characters validation)
5. ✅ Implement race condition protection (atomic claim assignment)

### SHOULD Address (Quality Enhancements) — 9 Items

6. ✅ Add reviewer workload tracking (max 3 active reviews) — AC27
7. ✅ Include sanctuary culture reminder in reviewer UI — AC22
8. ✅ Add trust score verification test (cached vs derived) — AC14
9. ✅ Template revision feedback prompts (guide constructive feedback) — AC25
10. ✅ Show task criteria prominently in review interface — AC24
11. ✅ Implement 72-hour review timeout mechanism — AC15-16
12. ✅ Add voluntary claim release endpoint — AC17
13. ✅ Display member effort indicators in review UI — AC26
14. ✅ Use supportive language in rejection messages — AC23

### COULD Defer (Future Enhancements)

15. Mission-scoped reviewer pools (S2-05 or S3)
16. Multi-signature approval for high-value tasks (S3)
17. Reviewer calibration exercises (S3)
18. Member appeal/dispute mechanism (S3)
19. Automated collusion detection via event pattern analysis (S3)

---

## Migration Readiness Assessment

### Target: 95% (from current 92%)

**What S2-04 Adds**:
✅ Human governance audit trail (DAO transition ready)  
✅ Multi-actor decision provenance (who decided what, when)  
✅ Rejection justification (on-chain dispute resolution precedent)  
✅ State machine integrity (prevents tampering)

**Blockchain Mapping**:

```
claim.review_assigned → Reviewer oracle assigned to claim contract
claim.approved → State transition signed by oracle with attestation
claim.rejected → Challenge event with justification hash (IPFS)
revision_requested → Amendment request requiring new submission hash
```

**Export Considerations**:

- All review events include `reviewer_id` (maps to wallet address in Web3)
- `review_notes` and `feedback` are IPFS candidates (hashed justifications)
- `review_deadline` simulates time-lock contracts
- Event sequence preserves decision chronology for on-chain replay

**Gap Analysis** (remaining 5% to Web3):

- Multi-signature approval (2-of-3 for high-value tasks)
- Slashing mechanics (penalize malicious reviewers)
- On-chain appeal mechanism (dispute resolution DAO)

---

## Implementation Sequence

1. **Schema Extensions** (5% of work, 30 min)
   - Add columns: `revision_count`, `review_deadline`
   - Add event type: `CLAIM_REVIEW_ASSIGNED`, `CLAIM_REVIEW_TIMEOUT`, `CLAIM_REVIEW_RELEASED`

2. **Review Queue API** (25% of work, 1.5 hours)
   - `GET /api/trust-builder/reviews/queue` with eligibility filtering
   - `POST /api/trust-builder/reviews/[id]/assign` with atomic lock

3. **Review Decision API** (30% of work, 2 hours)
   - `PATCH /api/trust-builder/claims/[id]/review` with approve/reject/revision logic
   - Atomic trust score update on approval
   - Revision count increment with validation
   - Mandatory feedback enforcement

4. **Reviewer Dashboard UI** (30% of work, 2 hours)
   - Queue list with task preview
   - Claim detail with acceptance criteria display
   - Review action form with sanctuary culture prompts
   - Workload indicator (X/3 active reviews)

5. **Timeout Mechanism** (10% of work, 30 min)
   - Background job to auto-release orphaned claims
   - Event logging for accountability

---

## Quality Gates

### Code Quality

- [ ] TypeScript compilation clean (no errors)
- [ ] Character encoding correct (straight quotes, double-hyphens)
- [ ] All database queries use parameterized inputs (SQL injection prevention)
- [ ] Transaction boundaries explicit for atomic operations

### Functional Testing (QA Engineer)

- [ ] Full review cycle: assign → approve → verify trust score updated
- [ ] Rejection cycle: assign → reject → verify no trust score change
- [ ] Revision cycle: assign → revise (2x) → approve → verify points awarded
- [ ] Race condition: Two reviewers attempt same claim (one succeeds, one gets 409)
- [ ] Timeout: Claim assigned → 72 hours pass → auto-released to queue
- [ ] Self-review prevention: Member cannot see their own claims in queue

### Values Testing (Product Advisor)

- [ ] Sanctuary culture language evident in UI
- [ ] Rejection feedback required and constructive
- [ ] Task criteria visible to reviewer
- [ ] Member context shown to build empathy

### Migration Readiness (Product Advisor)

- [ ] All events have complete metadata
- [ ] Trust score derivable from event log
- [ ] State transitions irreversible (quasi-smart contract behavior)
- [ ] Export to JSON preserves decision chronology

---

## Grade Criteria

| Grade | Requirements                                                                | Migration Readiness |
| ----- | --------------------------------------------------------------------------- | ------------------- |
| **A** | All 5 MUSTs + 6+ SHOULDs, sanctuary culture evident, flawless state machine | 95%+                |
| **B** | All 5 MUSTs + 3-5 SHOULDs, functional but less polished UX                  | 90-94%              |
| **C** | All 5 MUSTs + 0-2 SHOULDs, rough edges but core logic sound                 | 85-89%              |
| **F** | Missing MUSTs, broken trust score, or state machine violations              | <85%                |

**Target Grade**: A- or higher

---

## Approval Conditions

✅ **APPROVED FOR IMPLEMENTATION** with the following:

1. Developer must implement all 5 MUST items before QA handoff
2. Developer should prioritize SHOULDs 6-10 (highest quality impact)
3. QA must run trust score verification test (AC14)
4. Product Advisor will review final UX language for sanctuary alignment
5. Retro must capture learnings on human governance patterns

---

## Strategic Context

S2-04 is the **social contract architecture** of Future's Edge. The patterns established here—reviewer assignment, state machine rigor, mandatory justification, revision cycles—will define governance quality for all future features.

This is not merely adding a review button. This is designing trust itself.

**Critical Success Factor**: Every line of code must reinforce that reviews are about helping members grow, not gatekeeping access.

Build with empathy. Code with accountability. Ship with integrity. 🏛️

---

## Handoff Notes

**For fullstack-developer**:

- Start with schema migrations (foundation)
- Implement APIs with transaction safety (claim-engine.ts patterns)
- UI should mirror sanctuary values (language, layout, feedback prompts)
- Test race conditions manually (two browser tabs, same claim)

**For qa-engineer**:

- Focus on AC13-14 (trust score integrity tests)
- Test revision limit edge case (3rd revision attempt)
- Verify orphaned claim timeout (simulate by manually updating review_deadline)
- Check sanctuary culture language in all UI strings

**For product-advisor (final review)**:

- Grade on migration readiness (95% target)
- Assess sanctuary culture integration (not just functional)
- Verify event metadata completeness (exportable to Web3)
- Confirm state machine prevents gaming

---

**Review Completed**: 2026-02-10  
**Status**: READY FOR IMPLEMENTATION ✅
