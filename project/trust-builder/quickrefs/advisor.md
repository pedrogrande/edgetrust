# Product Advisor Quick Reference

**Purpose**: Fast strategic review guide (5-10 min read)  
**Full Details**: [Product Vision](../00-product-vision-and-goals.md) | [Past Reviews](../product-manager/advisor-feedback/)  
**Last Updated**: 11 February 2026

---

## ⚡ Review Types & Time Budget

### Pre-Implementation Review (30-45 min)

**When**: Medium+ complexity stories, before developer starts  
**Focus**: Architecture, ontology alignment, migration readiness  
**Output**: Written report with MUST/SHOULD items

### Post-Implementation Review (30-45 min)

**When**: After QA pass, before merge  
**Focus**: Grade (A-D), dimensional analysis, strategic value  
**Output**: Written review with grade + recommendations

### Infrastructure Quick-Scan (15 min)

**When**: Test infrastructure, git hooks, CI/CD  
**Focus**: Patterns, migration readiness, cultural alignment  
**Output**: Short review (skip deep dimensional analysis)

---

## 🎯 Dimensional Analysis (ONE Framework)

### 6 Dimensions to Check

#### 1. Groups

- Does this create/modify/query Group entities?
- Are Group relationships tracked in events?
- Migration: Group formation logged for on-chain governance?

#### 2. People

- Does this create/modify Member or Steward records?
- Are identity fields stable (FE-M-XXXXX format)?
- Migration: Member actions logged with actor_id?

#### 3. Things

- Does this create/modify Task/Mission artifacts?
- Are completion proofs immutable after approval?
- Migration: Thing ownership tracked in events?

#### 4. Connections

- Does this create relationships (member-group, steward-member)?
- Are implicit connections (reviewer assignments) tracked?
- Migration: Connection events include both entity refs?

#### 5. Events

- Are all state changes logged to events table?
- Is metadata rich (before/after state, actor_id)?
- Migration: Events append-only, complete for Merkle trees?

#### 6. Knowledge

- Are Trust Scores derivable from events?
- Is knowledge contribution tracked (claims, reviews)?
- Migration: Reputation derived, not stored mutably?

---

## 📊 Grading Rubric

### Grade A (4.0) - Exemplary

- ✅ 90%+ migration readiness
- ✅ Gold standard patterns applied correctly
- ✅ Complete event capture (happy path + edge cases)
- ✅ Sanctuary culture in ALL user-facing text
- ✅ Defense-in-depth for critical rules

**Example**: S3-01 (test infrastructure, 95% migration ready)

### Grade B+ (3.3-3.7) - Good

- ✅ 70-89% migration readiness
- ✅ Patterns mostly correct (1-2 gaps)
- ✅ Events capture happy path (some edge cases missing)
- ✅ Sanctuary culture in most places
- ⚠️ Missing some defense-in-depth layers

### Grade B (3.0) - Acceptable

- ✅ 60-69% migration readiness
- ⚠️ Patterns applied inconsistently
- ⚠️ Events incomplete (missing before/after state)
- ⚠️ Sanctuary culture partial
- ❌ Minimal defense-in-depth

### Grade C (2.0) - Needs Improvement

- ⚠️ 40-59% migration readiness
- ❌ Patterns not followed
- ❌ Events missing or incomplete
- ❌ Sanctuary culture missing
- ❌ No defense-in-depth

**Grade D/F**: Not used (return to developer before review)

---

## ✅ Pre-Implementation Review Checklist

### 1. Read Story (5 min)

- [ ] Complexity: Simple/Medium/Complex?
- [ ] Ontology dimensions affected: Which of 6?
- [ ] Critical path: What's migration-essential?

### 2. Check Patterns (10 min)

- [ ] Does story need transactions? (mutations + events)
- [ ] Defense-in-depth? (critical business rules)
- [ ] Immutability? (published tasks, approved claims)
- [ ] Event capture? (before/after state)

### 3. Identify Risks (5 min)

- [ ] Vendor lock-in? (prefer open standards)
- [ ] Security gaps? (auth, authorization, data exposure)
- [ ] Migration blockers? (mutable state, missing events)

### 4. Write MUST/SHOULD Items (10-15 min)

**MUST** (blocking):

- Architectural requirements
- Security requirements
- Migration-critical patterns

**SHOULD** (nice-to-have):

- UX improvements
- Performance optimizations
- Code organization

**Example**:

```markdown
### MUST Items

1. Use withTransaction for claim approval (events + state atomic)
2. Add database CHECK constraint for revision_count <= 2
3. Log before/after trust_score in event metadata

### SHOULD Items

1. Consider caching reviewer queue (performance)
2. Add tooltip explaining revision limit (UX)
```

---

## ✅ Post-Implementation Review Checklist

### 1. Read QA Report (5 min)

- [ ] All ACs passing?
- [ ] Migration readiness score?
- [ ] Any critical issues?

### 2. Dimensional Analysis (15 min)

For each affected dimension:

- [ ] Event capture complete?
- [ ] Stable IDs used?
- [ ] Migration-ready patterns?

### 3. Sanctuary Culture Check (5 min)

- [ ] Error messages educational?
- [ ] UI language inviting?
- [ ] Feedback requirements enforced?

### 4. Grade & Recommend (10 min)

- Calculate migration readiness %
- Assign grade (A/B+/B/C)
- Write 2-3 strategic recommendations

---

## 🚀 Strategic Recommendations Template

### 1. Identify High-Value Improvements

Focus on:

- **Migration readiness gaps**: What's needed for blockchain?
- **Pattern reuse**: Can this be generalized?
- **Velocity multipliers**: What saves time in future stories?

### 2. Prioritize by ROI

- **High Priority**: Migration blockers, security gaps
- **Medium Priority**: Pattern improvements, velocity gains
- **Low Priority**: Polish, optimization, nice-to-haves

### 3. Write Actionable Items

**Bad**: "Consider improving error messages"  
**Good**: "Add 'why' + 'how to fix' to email delivery error (see sanctuary template)"

---

## 🎓 Sanctuary Culture Checklist

### Error Messages

- [ ] **Educational**: Explains why (not just what)
- [ ] **Actionable**: Tells user how to fix
- [ ] **Non-punitive**: "Please..." not "ERROR:"
- [ ] **Specific**: No generic "Something went wrong"

**Template**: `[What happened] + [Why it matters] + [How to fix]`

### UI Language

- [ ] **Inviting**: "Let's..." not "You must..."
- [ ] **Supportive**: Rejection feedback >20 chars
- [ ] **Clear**: Button labels action-oriented
- [ ] **Transparent**: Explain constraints (file size, revision limits)

### Git Hooks (Infrastructure)

- [ ] **Educational**: Explains why branch needed
- [ ] **Supportive**: "🌱 Let's use..." not "ACCESS DENIED"
- [ ] **Helpful**: Provides alternative (`git checkout -b...`)

---

## ⚙️ Infrastructure Review (15-min Quick-Scan)

### Focus Areas (Skip Dimensional Analysis)

1. **Pattern Quality**: Gold standard / Good / Needs work?
2. **Migration Readiness**: What % of architecture validated?
3. **Cultural Alignment**: Sanctuary principles embedded?

### Quick Checks

- [ ] Tests validate quasi-smart contracts?
- [ ] Performance acceptable (<5s suite, <1s files)?
- [ ] Documentation complete (README, comments)?
- [ ] Patterns reusable for future stories?

### Output (Short Review)

```markdown
**Grade**: A/B+/B/C  
**Migration Readiness**: X%  
**Cultural Alignment**: Exemplary/Good/Missing

**Top 3 Recommendations**:

1. [Highest value improvement]
2. [Pattern to generalize]
3. [Velocity multiplier]

**Time**: 15 min (infrastructure quick-scan)
```

---

## 📚 Full References

**Strategic Context**:

- [Product Vision](../00-product-vision-and-goals.md) - North star, values
- [User Personas](../01-user-personas-and-journeys.md) - Member journeys
- [Migration Strategy](../08-migration-and-audit-strategy.md) - Blockchain path

**Technical Depth**:

- [Smart Contract Spec](../05-smart-contract-behaviour-spec.md) - Event sourcing, quasi-smart contracts
- [Trust Score Rules](../06-incentive-and-trust-score-rules.md) - Reputation system

**Past Reviews** (templates):

- [S3-01 Strategic Review](../product-manager/advisor-feedback/S3-01-strategic-review.md) - Grade A example
- [S2-04 Post-Review](../product-manager/advisor-feedback/S2-04-POST-IMPLEMENTATION-REVIEW.md) - Complex feature

**Questions?** Check [PATTERN-ANALYSIS.md](../meta/PATTERN-ANALYSIS.md) for recurring patterns.
