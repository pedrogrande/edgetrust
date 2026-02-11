# Trust Builder Agent Hub

**Purpose**: Quick navigation for AI agents working on Trust Builder  
**Last Updated**: 11 February 2026  
**Doc Whisperer**: Maintained for fast, token-efficient lookups

---

## 🎯 Quick Start (By Role)

### Product Owner

**Quick Start**: Read [Product Vision](00-product-vision-and-goals.md) (10 min) → [User Personas](01-user-personas-and-journeys.md) (15 min) → Check [BACKLOG.md](product-manager/BACKLOG.md)

**Story Planning**:

- [BACKLOG.md](product-manager/BACKLOG.md) - Prioritized stories
- [Sprint 3 Plan](product-manager/SPRINT-3-PLAN.md) - Current sprint goals
- Story examples: [product-manager/stories/](product-manager/stories/)
- Latest learnings: [retros/sprint-2-learnings-and-guidance.md](retros/sprint-2-learnings-and-guidance.md)

**Reference Docs** (check before planning):

- [Functional Requirements](02-functional-requirements.md) - Feature specifications
- [Data Model & API Design](04-data-model-and-api-design.md) - Technical constraints
- [Agent Changelog](meta/agent-prompt-changelog.md) - Latest process improvements

---

### Fullstack Developer

**Quick Ref**: [quickrefs/developer.md](quickrefs/developer.md) ⭐ **START HERE**  
**Gold Patterns**: [patterns/](patterns/) - Copy-paste implementations  
**Test Infrastructure**: [README Testing section](../../README.md#testing-sprint-3)

**Key Docs**:

- [Data Model & API Design](04-data-model-and-api-design.md) - Database schema, API contracts
- [Smart Contract Spec](05-smart-contract-behaviour-spec.md) - Event sourcing, quasi-smart contracts
- [Developer Standards Checklist](meta/developer-standards-checklist.md) - Pre-commit checklist

**🚀 Quick Patterns** (copy-paste ready):

- API endpoint → [patterns/api-endpoint.md](patterns/api-endpoint.md)
- Event logging → [patterns/event-sourcing.md](patterns/event-sourcing.md)

---

### QA Engineer

**Quick Ref**: [quickrefs/qa.md](quickrefs/qa.md) ⭐ **START HERE**  
**QA Templates**: [product-manager/stories/](product-manager/stories/) (search `*-QA-REPORT.md`)

**Key Docs**:

- [Functional Requirements](02-functional-requirements.md) - Acceptance criteria source
- [Smart Contract Spec](05-smart-contract-behaviour-spec.md) - Quasi-smart contract validation
- [Migration Strategy](08-migration-and-audit-strategy.md) - Migration readiness checks

**🚀 Quick Workflows**:

- Validate story → [quickrefs/qa.md](quickrefs/qa.md) (see validation workflow)
- Check migration readiness → [quickrefs/qa.md](quickrefs/qa.md) (see migration checklist)
- Run tests → `pnpm test` (see README for coverage report)

---

### Product Advisor

**Quick Ref**: [quickrefs/advisor.md](quickrefs/advisor.md) ⭐ **START HERE**  
**Reviews**: [product-manager/advisor-feedback/](product-manager/advisor-feedback/)

**Key Docs**:

- [Product Vision](00-product-vision-and-goals.md) - Strategic alignment
- [Ontology (ONE dimension map)](../../project/platform/ontology/) - 6-dimension framework
- [Migration Strategy](08-migration-and-audit-strategy.md) - Blockchain readiness

**Review Types** (see [quickrefs/advisor.md](quickrefs/advisor.md) for checklists):

- **Pre-implementation**: 30-45 min (feature) or 15 min (infrastructure)
- **Post-implementation**: Grade story (A/B+/B/C), assess migration readiness
- Reviews saved in: [product-manager/advisor-feedback/](product-manager/advisor-feedback/)

---

### Retro Facilitator

**Quick Start**: Read latest [story retro](retros/) → Check [PATTERN-ANALYSIS.md](meta/PATTERN-ANALYSIS.md) for recurring patterns

**Retro Workflow**:

1. Read story + QA report + strategic review
2. Document: What went well? What could improve? Learnings? Action items?
3. Ask: "Were patterns easy to find?" (doc friction feedback)
4. Save to: `retros/story-SX-XX-{title}-retro.md`

**Reference**:

- [Past retros](retros/) - Sprint 1, 2, 3 + all story retros
- [Agent Changelog](meta/agent-prompt-changelog.md) - Process improvements over time

---

## 📚 Core Documentation (Reference Only)

### Project Foundation

- [00: Product Vision & Goals](00-product-vision-and-goals.md) - Why Trust Builder exists
- [01: User Personas & Journeys](01-user-personas-and-journeys.md) - Youth, stewards, admins
- [02: Functional Requirements](02-functional-requirements.md) - Feature specifications
- [03: Non-Functional Requirements](03-nonfunctional-requirements.md) - Performance, security, scalability

### Technical Architecture

- [04: Data Model & API Design](04-data-model-and-api-design.md) - PostgreSQL schema, REST APIs
- [05: Smart Contract Behaviour Spec](05-smart-contract-behaviour-spec.md) - Event sourcing, quasi-smart contracts
- [06: Incentive & Trust Score Rules](06-incentive-and-trust-score-rules.md) - Points, reputation system
- [07: Admin & Reviewer Operations](07-admin-and-reviewer-operations-guide.md) - Steward workflows
- [08: Migration & Audit Strategy](08-migration-and-audit-strategy.md) - Blockchain migration path

---

## 🔍 Common Questions ("How do I...?")

| Question                    | Quick Answer (< 5 min)                                             | Full Reference                                                 |
| --------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| Implement API endpoint?     | [patterns/api-endpoint.md](patterns/api-endpoint.md)               | [04: Data Model & API Design](04-data-model-and-api-design.md) |
| Add event logging?          | [patterns/event-sourcing.md](patterns/event-sourcing.md)           | [05: Smart Contract Spec](05-smart-contract-behaviour-spec.md) |
| Calculate Trust Scores?     | [06: Trust Score Rules](06-incentive-and-trust-score-rules.md)     | —                                                              |
| Validate sanctuary culture? | [quickrefs/advisor.md](quickrefs/advisor.md) (sanctuary checklist) | [00: Product Vision](00-product-vision-and-goals.md)           |
| Check migration readiness?  | [quickrefs/qa.md](quickrefs/qa.md) (migration checklist)           | [08: Migration Strategy](08-migration-and-audit-strategy.md)   |
| Run/write tests?            | [quickrefs/developer.md](quickrefs/developer.md) (testing section) | README.md (Testing section)                                    |

---

## 📊 Living Documents (Updated Regularly)

### Updated Each Sprint

- [BACKLOG.md](product-manager/BACKLOG.md) - Prioritized stories
- [SPRINT-X-PLAN.md](product-manager/SPRINT-3-PLAN.md) - Current sprint goals
- [PATTERN-ANALYSIS.md](meta/PATTERN-ANALYSIS.md) - Recurring patterns, blockers

### Updated Each Story

- [Agent Prompt Changelog](meta/agent-prompt-changelog.md) - Agent instruction improvements
- [Story Retros](retros/) - Lessons learned per story

### Reference (Stable)

- [Developer Standards Checklist](meta/developer-standards-checklist.md) - Pre-commit checklist
- Core docs (00-08) - Rarely change after initial definition

---

## 🎓 Learning Resources

### New to Trust Builder?

1. **Start**: [Product Vision](00-product-vision-and-goals.md) (10 min)
2. **Context**: [User Personas](01-user-personas-and-journeys.md) (15 min)
3. **Technical**: [Data Model](04-data-model-and-api-design.md) (20 min)
4. **Patterns**: [Gold Patterns](patterns/) (5 min each)

**Total onboarding**: ~60 minutes

### New to Event Sourcing?

1. [Smart Contract Spec](05-smart-contract-behaviour-spec.md#event-sourcing-fundamentals)
2. [patterns/event-sourcing.md](patterns/event-sourcing.md)
3. [Sprint 2 Learnings](retros/sprint-2-learnings-and-guidance.md#event-sourcing-patterns)

### Blocked or Confused?

1. Check your role's **Quick Ref** (quickrefs/ directory)
2. Search [PATTERN-ANALYSIS.md](meta/PATTERN-ANALYSIS.md) for similar issue
3. Review recent [Story Retros](retros/) for context

---

## 🔧 Meta Resources (Meta-Coach & Doc-Whisperer)

**Agent Management**:

- [Agent Specs](../../.github/agents/) - All 7 agent specifications
- [Agent Changelog](meta/agent-prompt-changelog.md) - Instruction changes over time (updated after each sprint)

**Process Improvement Sources**:

- [PATTERN-ANALYSIS.md](meta/PATTERN-ANALYSIS.md) - Recurring blockers from S1-S2
- [Sprint Retros](retros/) - Sprint 1, 2, 3 learnings + guidance docs
- [Story Retros](retros/) - Individual story learnings (12+ files)

---

## 📁 Directory Structure

```
trust-builder/
├── AGENT-HUB.md              ← 📍 YOU ARE HERE (start here always!)
│
├── quickrefs/                ← ⚡ Quick references (3-10 min, ~500 tokens)
│   ├── developer.md          ← ✅ Developer patterns + checklist
│   ├── qa.md                 ← ✅ QA workflow + migration checklist
│   └── advisor.md            ← ✅ Review types + grading rubric
│
├── patterns/                 ← 📋 Copy-paste templates (~1000 tokens)
│   ├── api-endpoint.md       ← ✅ REST API with auth + transaction + events
│   └── event-sourcing.md     ← ✅ Event logging with before/after state
│
├── 00-08-*.md                ← 📚 Core specs (reference, read as needed)
│    ├── 00-product-vision-and-goals.md
│    ├── 04-data-model-and-api-design.md
│    ├── 05-smart-contract-behaviour-spec.md
│    └── 06-incentive-and-trust-score-rules.md
│
├── product-manager/          ← 📝 Stories + sprints + reviews
│   ├── stories/              ← User story specs (S3-XX-*.md)
│   ├── advisor-feedback/     ← Strategic reviews (S3-XX-strategic-review.md)
│   ├── BACKLOG.md            ← Prioritized backlog
│   └── SPRINT-3-PLAN.md      ← Current sprint
│
├── retros/                   ← 🔄 Learnings (updated each story/sprint)
│   ├── story-S3-01-*.md      ← Story retrospectives
│   └── sprint-2-learnings-and-guidance.md  ← Sprint learnings (long-form)
│
└── meta/                     ← 🛠️ Agent management
    ├── PATTERN-ANALYSIS.md   ← Recurring patterns/blockers
    ├── agent-prompt-changelog.md  ← Agent instruction updates
    └── developer-standards-checklist.md  ← Pre-commit checklist
```

---

## 🚀 Typical Workflows (With Time Estimates)

### Story Implementation (Fullstack Developer)

**Time**: 2-6 hours (implementation) + 30-60 min (QA back-and-forth)

1. **Read story** → `product-manager/stories/S3-XX-*.md` (5 min)
2. **Check pre-review** (if exists) → `product-manager/advisor-feedback/S3-XX-*.md` (5 min)
3. **Consult quickref** → [quickrefs/developer.md](quickrefs/developer.md) (5 min)
4. **Copy pattern** → [patterns/api-endpoint.md](patterns/api-endpoint.md) or [patterns/event-sourcing.md](patterns/event-sourcing.md) (3 min)
5. **Implement** (test-first recommended: write integration test → implement → refactor)
6. **Run tests** → `pnpm test` (should pass)
7. **Submit for QA** → Handoff to qa-engineer

**💡 Tip**: Quickref + pattern saves 30-45 min orientation vs. reading long-form docs

---

### QA Validation (QA Engineer)

**Time**: 10-15 min (infrastructure) or 30-60 min (features)

1. **Read story ACs** → `product-manager/stories/S3-XX-*.md` (5 min)
2. **Consult quickref** → [quickrefs/qa.md](quickrefs/qa.md) (5 min for validation workflow)
3. **Run tests** → `pnpm test` (check all pass, review coverage)
4. **Check migration readiness** → See migration checklist in [quickrefs/qa.md](quickrefs/qa.md)
5. **Validate ACs** → Manual testing (browsers, mobile, accessibility)
6. **Write report** → `product-manager/stories/S3-XX-QA-REPORT.md` (10 min)
7. **Decision** → PASS (to advisor) or FAIL (back to developer)

**💡 Tip**: Quickref eliminates 15 min "what do I check?" orientation

---

### Strategic Review (Product Advisor)

**Time**: 15 min (infrastructure quick-scan) or 30-45 min (feature deep-dive)

1. **Read story + QA report** → `product-manager/stories/S3-XX-*.md` + QA report (10 min)
2. **Consult quickref** → [quickrefs/advisor.md](quickrefs/advisor.md) (5 min for review checklist)
3. **Dimensional analysis** → Map to ONE framework (Groups/People/Things/Connections/Events/Knowledge)
4. **Check ontology** → [platform/ontology/](../../project/platform/ontology/) if needed
5. **Grade** → A/B+/B/C based on migration readiness + patterns + sanctuary culture
6. **Write review** → `product-manager/advisor-feedback/S3-XX-strategic-review.md` (15 min)
7. **Decision** → Approve for retro (Grade B+ or higher) or return to developer

**💡 Tip**: Quickref focuses review on key dimensions, avoids reading everything

---

## 📝 Notes

- **Token Efficiency**: Quickrefs ~500 tokens (vs 2000+ for long docs), patterns ~1000 tokens
- **Living Document**: Doc-whisperer updates AGENT-HUB after each sprint retro
- **Feedback**: If you can't find something in <2 min, mention in retro → doc-whisperer will fix
- **Incremental**: New patterns added when requested 3+ times (signals common need)

**Last Reorganization**: 11 February 2026 (Post-S3-01, by doc-whisperer)
