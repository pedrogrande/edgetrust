# Sanctuary Messaging Patterns

**Purpose**: Reusable language templates for supportive, non-punitive system messaging  
**Status**: Extracted from Sprint 3 gold standard implementations (S3-03, S3-04)  
**Last Updated**: 12 February 2026

---

## TL;DR

Sanctuary culture is **architectural**, not just copy. Every automated decision (timeout, failure, correction) is an opportunity to demonstrate values through:
- Language choices (orphaned not overdue)
- System behavior (release not penalize)
- Teaching moments (explain why, not just what)

**Gold Standard Reference**: S3-03 (Orphaned Claims) - product-advisor rated 9.5/10 sanctuary culture score

---

## 5 Sanctuary Architecture Principles

### 1. Reversible State Transitions

**Anti-Pattern**:
```typescript
// ❌ Permanent deletion (irreversible)
await sql`DELETE FROM claims WHERE id = ${claimId}`;
```

**Sanctuary Pattern**:
```typescript
// ✅ Status change (reversible, preserves history)
await sql`
  UPDATE claims 
  SET status = 'archived', archived_at = NOW(), archived_by = ${adminId}
  WHERE id = ${claimId}
`;

// Can be unarchived later
await sql`
  UPDATE claims 
  SET status = 'submitted', archived_at = NULL, archived_by = NULL
  WHERE id = ${claimId}
`;
```

**Design Checklist**:
- [ ] Can this state be undone without admin intervention?
- [ ] Do we preserve history (not overwrite)?
- [ ] Can member recover from this state through their own actions?

---

### 2. Non-Punitive Defaults

**Anti-Pattern**:
```typescript
// ❌ Automatic penalty on timeout
if (daysSinceReview > 7) {
  await deductTrustScore(reviewerId, -50);  // Punitive
  await addReputation(reviewerId, 'unreliable');  // Stigma
}
```

**Sanctuary Pattern**:
```typescript
// ✅ Release claim, no penalty, Trust Score unchanged
if (daysSinceReview > 7) {
  await releaseClaimToPool(claimId);  // Available for others
  // Reviewer's Trust Score: NO CHANGE
  // No negative reputation markers
  // No "failed review" count
}
```

**Design Checklist**:
- [ ] Do timeouts/failures avoid deducting points?
- [ ] Are thresholds generous (account for life circumstances)?
- [ ] Do we assume good faith (not negligence)?
- [ ] Are "strikes" or "warnings" never stored?

---

### 3. Teaching Moments in System Messaging

**Anti-Pattern**:
```bash
# ❌ Authoritarian error (blocks without explanation)
ERROR: Direct push to main forbidden. Access denied.
```

**Sanctuary Pattern**:
```bash
# ✅ Teaching moment (explains why, provides next steps)
🌱 Let's use a feature branch to keep main stable!

Run: git checkout -b feature/your-feature-name

Why? Feature branches allow code review before merging,
which helps catch issues early and keeps main deployable.
```

**Template**: `[Friendly opener] + [How to fix] + [Why it matters]`

**Design Checklist**:
- [ ] Does error message explain WHY (not just WHAT)?
- [ ] Is tone supportive (coaching, not scolding)?
- [ ] Do we provide next steps (not just block)?
- [ ] Could this moment teach values to new members?

---

### 4. Supportive Language

**Word Replacement Guide**:

| ❌ Avoid | ✅ Use Instead | Rationale |
|---------|----------------|-----------|
| Overdue | Orphaned | Removes time pressure judgment |
| Failed | Needs revision | Implies learning, not failure |
| Violation | Guideline miss | Reduces legal/punitive tone |
| Penalty | Adjustment | Neutral, not punitive |
| Deadline | Target date | Aspirational, not threatening |
| Warning | Reminder | Supportive, not threatening |
| Rejected | Needs another look | Collaborative, not dismissive |
| Expired | Ready for fresh eyes | Reframes timeout positively |

**Proof from Sprint 3**:
- S3-03: "Orphaned Claims" badge (not "Overdue Reviews")
- S3-03: "Life happens!" heading (not "Performance Issue")
- S3-03: "No penalties will be applied" (explicit reassurance)
- S3-04: "You're almost there! (234/250 points)" (encouraging progress)
- S3-04: "Your role is to **help them succeed**, not gatekeep" (defines reviewer values)

**Design Checklist**:
- [ ] Would this language make ME feel supported (not judged)?
- [ ] Are we assuming good faith?
- [ ] Do we remove unnecessary urgency/pressure?
- [ ] Could this be misread as punitive? (If yes, rephrase)

---

### 5. Generous Thresholds

**Decision Framework**:

| Context | Harsh Threshold | Generous Threshold | Choose Generous |
|---------|-----------------|---------------------|-----------------|
| Review timeout | 3 days | 7 days | ✅ Accounts for weekends, life |
| Claim revision | 24 hours | 72 hours | ✅ Time for thoughtful work |
| Response time | 12 hours | 48 hours | ✅ Async-friendly, global team |
| Trust Score for role | 300 points | 250 points | ✅ Lower barrier to contribution |
| Revision cycles | 1 cycle | 2 cycles | ✅ Room for learning |

**Sprint 3 Examples**:
- S3-03: 7-day orphaned threshold (not 3-day)
- S3-04: 250-point steward threshold (accessible, not elite)

**Design Checklist**:
- [ ] Does this threshold account for weekends/time zones?
- [ ] Would I feel this is fair if I had life circumstances (illness, family)?
- [ ] Are we being generous (not just "industry standard")?
- [ ] Could we add 20% buffer without harming system responsiveness?

---

## Messaging Templates (Copy-Paste Ready)

### Timeout/Orphaned State

**Context**: Claim unreviewed for 7+ days, needs release to pool

**Dialog Heading**:
```
Life happens! 🌱
```

**Body Text**:
```
These claims have been waiting for review for 7+ days. 
No penalties will be applied — we know life gets busy.

Releasing these claims makes them available for other 
reviewers to provide fresh perspective.
```

**Button Text**:
```
Release Claims (Makes available to team)
```

**What NOT to say**:
- ❌ "Overdue Claims - Performance Issue"
- ❌ "Failed to Review in Time"
- ❌ "Abandoned Claims"

---

### Revision Request

**Context**: Reviewer requests changes to claim

**Notification Title**:
```
🔄 Your claim needs another look
```

**Body Text**:
```
Good news: Your reviewer saw potential in your submission!

They've provided feedback to help strengthen your claim:
[Reviewer feedback here]

You have 72 hours to revise (that's 3 full days, no rush!).
```

**Button Text**:
```
View Feedback & Revise
```

**What NOT to say**:
- ❌ "Claim Rejected - Revise ASAP"
- ❌ "Failed Initial Review"
- ❌ "Deadline: 72 hours"

---

### Role Promotion

**Context**: Member reaches 250 Trust Score, promoted to Steward

**Toast Notification**:
```
🎉 You're now a Steward!

Your role is to help members succeed, not gatekeep.
```

**Explanation Page**:
```
## Welcome to the Steward role!

You've earned this through consistent, quality contributions 
(250 Trust Score points).

### What this means

As a Steward, you can now:
- Review member claims
- Provide feedback that helps them improve
- Mentor new members

### Your guiding principle

**Help them succeed.** Your goal isn't to catch mistakes — 
it's to coach members toward excellence.
```

**What NOT to say**:
- ❌ "Congratulations on Passing the Threshold"
- ❌ "You are now authorized to review claims"
- ❌ "Stewards enforce quality standards"

---

### Progress Indicators

**Context**: Member viewing progress toward role promotion

**Progress Bar Label** (current: 234/250 points):
```
You're almost there! Just 16 more points to Stewardship.
```

**What NOT to say**:
- ❌ "16 points remaining"
- ❌ "93.6% complete"
- ❌ "Still need 16 points"

---

### Maintenance/System Messages

**Context**: Scheduled maintenance window

**Announcement**:
```
🛠️ Quick maintenance tonight (11pm-12am EST)

We're improving the platform! Claims/missions will be 
read-only for about an hour.

Don't worry: Your progress is saved, and nothing will be lost.
```

**What NOT to say**:
- ❌ "System downtime scheduled"
- ❌ "All operations suspended 11pm-12am"
- ❌ "Do not submit during maintenance window"

---

### Error Messages

**Template**: `[What happened] + [Why it matters] + [How to fix] + [Support offer]`

**Example**: File upload validation

```typescript
return new Response(JSON.stringify({
  error: "Please upload a PDF, PNG, or JPG file (we can't process [uploaded format] yet). Need a different format? Let us know — we're always expanding what we support!"
}), { status: 400 });
```

**What NOT to say**:
- ❌ "INVALID_FILE_TYPE"
- ❌ "Unsupported format"
- ❌ "File rejected - extension not allowed"

---

## Testing Sanctuary Messaging

**Heuristics** (use during QA review):

1. **Read aloud test**: Does this sound like a supportive coach or a strict authority figure?
2. **Anxious member test**: If I were worried about making mistakes, would this message increase or decrease my anxiety?
3. **Teaching moment test**: Could a new member learn our values from this message?
4. **Reverse test**: What would the opposite (punitive) message sound like? Are we clearly differentiated?

**Example** (S3-03, passed all 4 tests):

| Test | Message | Pass? |
|------|---------|-------|
| Read aloud | "Life happens! No penalties will be applied." | ✅ Coach, not authority |
| Anxious member | Explicit "no penalties" reduces anxiety | ✅ Decreases anxiety |
| Teaching moment | Shows that timeouts are understandable, not failures | ✅ Values taught |
| Reverse test | "Performance Issue: Claims overdue" would be punitive | ✅ Clear differentiation |

---

## Integration with Code

### In React Components

```typescript
// ❌ Hardcoded (not reusable)
<AlertDialogTitle>Overdue Claims</AlertDialogTitle>

// ✅ Sanctuary constant (reusable, auditable)
import { SANCTUARY_MESSAGES } from '@/lib/sanctuary-messages';

<AlertDialogTitle>{SANCTUARY_MESSAGES.orphanedClaims.heading}</AlertDialogTitle>
<AlertDialogDescription>{SANCTUARY_MESSAGES.orphanedClaims.body}</AlertDialogDescription>
```

**Benefits**:
- Single source of truth (change once, applies everywhere)
- QA can audit messaging against sanctuary principles
- Can A/B test different phrasings
- Internationalization ready (translate constants, not inline text)

### In API Responses

```typescript
// ❌ Technical error codes
return new Response(JSON.stringify({ 
  error: 'ERR_THRESHOLD_EXCEEDED' 
}), { status: 400 });

// ✅ Sanctuary error messages
import { SANCTUARY_ERRORS } from '@/lib/sanctuary-messages';

return new Response(JSON.stringify({ 
  error: SANCTUARY_ERRORS.revisionLimitReached(claim.revision_count) 
}), { status: 400 });

// sanctuary-messages.ts
export const SANCTUARY_ERRORS = {
  revisionLimitReached: (count: number) => 
    `This claim has reached the maximum revision limit (${count}). ` +
    `Further review cycles would delay feedback for other members. ` +
    `Need help improving your submission? Reach out to a Steward!`
};
```

---

## Sanctuary Culture Scorecard

Use this checklist during strategic review or QA validation:

**Reversibility** (Can states be undone?):
- [ ] State changes use status updates (not deletions)
- [ ] Status enums include recovery paths
- [ ] No permanent penalties in logic
- [ ] Member can self-recover (not admin-dependent)

**Non-Punitive Defaults** (Do timeouts/failures avoid penalties?):
- [ ] Timeouts don't deduct Trust Score
- [ ] No automatic negative reputation markers
- [ ] "Strikes" or "warnings" count not stored
- [ ] Thresholds are generous (account for life)

**Teaching Moments** (Do system messages explain values?):
- [ ] Error messages explain WHY (not just WHAT)
- [ ] Tone is supportive (coaching, not scolding)
- [ ] Next steps provided (not just "no")
- [ ] Cultural values taught through messaging

**Supportive Language** (Is language judgment-free?):
- [ ] No words: overdue, failed, violation, penalty, deadline, rejected
- [ ] Use: orphaned, needs revision, guideline miss, adjustment, target, needs another look
- [ ] Explicit reassurances ("No penalties", "Life happens")
- [ ] Encouraging progress ("You're almost there!", "Just 16 more points")

**Generous Thresholds** (Are expectations reasonable?):
- [ ] Timeouts account for weekends/holidays
- [ ] Async-friendly (48+ hour response times)
- [ ] Role progression accessible (not elite)
- [ ] Grace periods before automation
- [ ] Could add 20% buffer without harm

**Score**: 20/20 checks = Gold Standard (S3-03 level)  
**Score**: 15-19/20 = Excellent  
**Score**: 10-14/20 = Good (room for improvement)  
**Score**: <10/20 = Needs sanctuary culture review

---

## Next Steps

- **Product Owner**: Reference this doc when writing story ACs involving timeouts, failures, or system automation
- **Fullstack Developer**: Use messaging templates, create `sanctuary-messages.ts` constants file
- **QA Engineer**: Use Sanctuary Culture Scorecard during validation (20-point checklist)
- **Product Advisor**: Grade sanctuary culture using scorecard (S3-03 scored 19/20, gold standard)

**Read Next**:
- [Sprint 3 Learnings](../retros/sprint-3-learnings-and-guidelines.md#sanctuary-culture-playbook) for detailed examples
- [Strategic Review Quick Reference](../quickrefs/strategic-review.md) for sanctuary culture checklist in review context
