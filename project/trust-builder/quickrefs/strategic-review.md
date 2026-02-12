# Strategic Review Quick Reference

**Purpose**: Fast decision matrix for when strategic review is mandatory vs optional  
**Proven ROI**: 2.7-3.7x time savings (Sprint 3 data)  
**Last Updated**: 12 February 2026

---

## ⚡ Decision Matrix (< 30 seconds)

| Story Complexity | Points | Review Required | Expected ROI | Time Budget           |
| ---------------- | ------ | --------------- | ------------ | --------------------- |
| **Simple**       | ≤4     | Optional        | Break-even   | 30 min (if conducted) |
| **Moderate**     | 5-7    | **Recommended** | 2-3x         | 45 min                |
| **Complex**      | ≥8     | **MANDATORY**   | 3-4x         | 90 min                |

**Rule of thumb**: If story touches 3+ ontology dimensions or introduces new architectural patterns → Recommended or Mandatory.

---

## 📊 Proven ROI Data (Sprint 3)

| Story | Complexity | Review Time | Critical Finding                                         | Prevented Rework         | ROI      |
| ----- | ---------- | ----------- | -------------------------------------------------------- | ------------------------ | -------- |
| S3-02 | Complex    | 90 min      | Missing composite index (performance bug)                | 4 hours emergency hotfix | **3.7x** |
| S3-03 | Moderate   | 45 min      | Threshold hardcoding clarity, atomic transaction pattern | 2 hours mid-dev refactor | **3.0x** |
| S3-04 | Simple     | Skipped     | Pattern reuse, no architecture changes                   | N/A                      | N/A      |

**Lesson**: S3-02 would have passed QA and shipped to production with critical performance bug. Strategic review caught it at 0 cost (pre-implementation).

---

## 🎯 When to Skip Review (Simple Stories)

**Skip if ALL true**:

- ≤4 points estimated
- Touches 1-2 ontology dimensions only
- Reuses existing patterns (no new architecture)
- No database schema changes
- UI-only or read-only feature

**Examples**:

- "Member sees their Member ID on dashboard" (People + UI)
- "Add tooltip explaining Trust Score" (Knowledge + UI)
- "Format dates in ISO 8601 on leaderboard" (UI polish)

---

## 🚨 When Review is Mandatory (Complex Stories)

**Conduct review if ANY true**:

- ≥8 points estimated
- Touches 3+ ontology dimensions
- Introduces new database tables/indexes
- New architectural pattern (authentication, background jobs, real-time)
- First story in new domain (e.g., first mission story, first payment story)

**Examples**:

- "Member submits claim and Trust Score updates" (Things + Events + Knowledge + scoring logic)
- "Mission joining workflow" (Groups + People + Connections + Events)
- "Email magic link authentication" (People + new auth pattern)

---

## 📋 Review Agenda (45-90 min)

### Part 1: Ontology Validation (15-20 min)

**Questions**:

- Which dimensions does this story touch?
- Are entities mapped to correct dimensions?
- Are relationships modeled as Connection entities (not foreign keys)?
- What events need to be logged?

### Part 2: Architecture Review (20-30 min)

**Questions**:

- **Performance**: What indexes are needed? Any n+1 query risks?
- **Transactions**: What must be atomic? (Use CTE pattern?)
- **Pattern reuse**: Which existing patterns apply? (CTE, config table, event logging)
- **New patterns**: If introducing new pattern, is it reusable?

### Part 3: Migration Readiness (10-15 min)

**Questions**:

- Which patterns are blockchain-compatible?
- What gaps exist? (5-10% acceptable, >10% flag for discussion)
- Is event metadata complete for Merkle root generation?

### Part 4: Sanctuary Culture (10-15 min)

**Checklist** (see [sanctuary-messaging.md](../patterns/sanctuary-messaging.md)):

- [ ] Are state changes reversible?
- [ ] Do timeouts/failures avoid penalties?
- [ ] Is language supportive (not judgmental)?
- [ ] Are thresholds generous?

### Part 5: Implementation Guidance (10-20 min)

**Document**:

- **MUST items**: Non-negotiable for story acceptance
- **SHOULD items**: Recommended, can defer if time-constrained
- **NICE-TO-HAVE items**: Explicitly marked for future stories
- **Decisions made**: Why we chose X over Y

---

## 📝 Review Output Template

```markdown
# Strategic Review: [Story ID] - [Story Title]

**Date**: YYYY-MM-DD  
**Reviewer**: product-advisor  
**Developer**: fullstack-developer  
**Complexity**: Simple/Moderate/Complex  
**Review Duration**: [minutes]

## Ontology Assessment

- Dimensions touched: [Groups? People? Things? Connections? Events? Knowledge?]
- Entity mapping: [Correct / Needs adjustment]
- Relationships: [Connection entities or foreign keys?]

## Architecture Recommendations

### MUST (Non-Negotiable)

1. [Critical finding with rationale - e.g., "Add composite index on (mission_id, status) for dashboard query"]

### SHOULD (Recommended)

1. [Recommended pattern - e.g., "Use CTE atomic pattern for claim approval + Trust Score update"]

### NICE-TO-HAVE (Future Story)

1. [Enhancement deferred - e.g., "Real-time notifications for claim status (defer to S4)"]

## Migration Readiness Forecast

- Initial estimate: [85-95%]
- Gaps identified: [e.g., "Foreign key instead of Connection entity for reviewer assignment"]
- Mitigation plan: [e.g., "Refactor in S4-02"]

## Sanctuary Culture Check

- Reversibility: [Yes - claims released to 'submitted', not deleted]
- Non-punitive: [Yes - Trust Score unchanged on timeout]
- Language: [Supportive - 'orphaned' not 'overdue']

## Implementation Notes

- Patterns to reuse: [CTE atomic transactions, config table thresholds]
- Performance considerations: [Add index before testing with 10k+ claims]
- Testing guidance: [Test timeout path separately - create claim 8 days ago]

## Decision Log

- **Decision**: Use 7-day timeout (not 3-day)
- **Rationale**: Life happens - generous threshold aligns with sanctuary values
- **Alternatives considered**: 3-day (too aggressive), 14-day (too long for system responsiveness)
```

---

## 🚀 How to Request Review

### For Product Owner

In story file, add at top if Moderate or Complex:

```markdown
## Strategic Review Request

**Complexity**: Moderate  
**Review Type**: Pre-implementation (45 min)  
**Reviewer**: product-advisor  
**Focus Areas**: Database indexes, CTE atomic pattern, migration readiness

**Questions for Review**:

1. Should reviewer assignment use Connection entity or foreign key?
2. What indexes needed for dashboard query (1000+ members)?
3. Is 7-day timeout generous enough for sanctuary culture?
```

### For Fullstack Developer

Before starting implementation:

1. Read story complexity marking (Simple/Moderate/Complex)
2. If Moderate or Complex → Tag `@product-advisor` in story PR/discussion
3. Wait for review before implementing schema changes
4. Review typically scheduled within 4 hours (async, not blocking)

### For Product Advisor

When conducting review:

1. Use [advisor.md quickref](advisor.md) for detailed review checklist
2. Time-box: 45 min (Moderate) or 90 min (Complex)
3. Document MUST vs SHOULD vs NICE-TO-HAVE explicitly
4. Save review output to: `/project/trust-builder/product-manager/advisor-feedback/S#-##-strategic-review.md`

---

## 📈 Metrics to Track

**Per Story**:

- Review duration (actual vs time-boxed)
- Number of MUST items identified
- Estimate of prevented rework hours

**Per Sprint**:

- % of Moderate stories that received review
- % of Complex stories that received review (target: 100%)
- Average ROI (prevented hours / review hours)
- Review findings that became action items

**Sprint 3 Baseline**:

- Complex stories reviewed: 100% (1/1)
- Moderate stories reviewed: 50% (1/2)
- Average ROI: 3.4x

**Sprint 4 Target**:

- Complex stories reviewed: 100%
- Moderate stories reviewed: 75%+
- Average ROI: 2.5-3.5x

---

## ❓ FAQ

### Q: What if developer disagrees with MUST item?

**A**: Discuss in review session. If still disagree, escalate to product-owner. MUST items should be non-negotiable based on ontology correctness, migration readiness, or sanctuary values (not style preferences).

### Q: Can SHOULD items be deferred?

**A**: Yes. If time-constrained, SHOULD items can become action items for future stories. Document in story retro which items were deferred and why.

### Q: What if story is already implemented?

**A**: Conduct post-implementation review (product-advisor grading). Less effective (can't prevent issues) but still catches ontology gaps before QA. Sprint 2-3 pattern: strategic review = pre-implementation, grading = post-implementation.

### Q: Is 45-90 min review time realistic for AI agents?

**A**: Yes. Sprint 3 data shows product-advisor can conduct thorough review in 45-90 min. Key: Time-box strictly. Focus on MUST items, defer NICE-TO-HAVE discussion.

---

## Next Steps

- **Product Owner**: Add strategic review requirement to story template (Moderate+ complexity)
- **Fullstack Developer**: Check story complexity before starting, request review if Moderate+
- **Product Advisor**: Use this quickref + [advisor.md](advisor.md) for review guidance
- **Read**: [sanctuary-messaging.md](../patterns/sanctuary-messaging.md) for sanctuary culture checklist details
