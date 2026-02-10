# Sprint 3 — Trust Builder (Season 0)

**Sprint window**: February 12–25, 2026 (2 weeks)  
**Velocity target**: 20 story points  
**Sprint Goal**: Establish **test infrastructure**, deliver **member dashboard with Trust Score visualization**, implement **automated background workflows**, and enable **trust-threshold role promotion**.

**Sprint Grade Target**: A (maintain quality trend from Sprint 2)  
**Migration Readiness Target**: 90%+ average

---

## Sprint 3 Strategic Focus

### Lessons Incorporated from Sprint 2

**Process Improvements Implemented** ✅:

1. **Strategic Review Mandatory**: All Complex stories (6+ points) receive 45-90 min pre-implementation review
2. **Git Workflow Enforcement**: Pre-push hooks prevent direct commits to main (100% compliance target)
3. **Testing Schedule Built-In**: Manual testing allocated Day 5 (1 hour) with device checklist
4. **Test Infrastructure Priority**: S3-01 addresses CRITICAL gap (currently 0 automated tests)
5. **AI-Optimized Story Sizing**: Each story completable in 1-2 focused agent sessions

**Quality Standards**:

- Event sourcing completeness (95%+ migration-ready)
- Defense-in-depth for critical business rules
- Sanctuary culture embedded in architecture
- Character encoding validation (pre-commit hooks)
- Transaction completeness checklist

---

## Sprint 3 Architecture Evolution

### What We're Building On (Sprint 1-2 Foundation ✅)

| Foundation Layer    | Status | Stories                          |
| ------------------- | ------ | -------------------------------- |
| **Identity & Auth** | ✅     | S1-02 (Email Magic Link), S2-01  |
| **Mission/Tasks**   | ✅     | S1-01 (Schema), S2-02 (Admin UI) |
| **Member Claims**   | ✅     | S1-04 (Submission)               |
| **Peer Review**     | ✅     | S2-04 (Workflow)                 |
| **File Proofs**     | ✅     | S2-03 (Upload + SHA-256)         |
| **Event Ledger**    | ✅     | S1-06, S2-02/03/04 (95% ready)   |

### What We're Adding (Sprint 3 New Capabilities)

| New Capability               | Story  | Value Delivery                          |
| ---------------------------- | ------ | --------------------------------------- |
| **Test Infrastructure**      | S3-01  | Quality assurance automation            |
| **Member Dashboard**         | S3-02  | Trust Score visibility, claim history   |
| **Knowledge Derivation**     | S3-02  | Radial chart (5 incentive dimensions)   |
| **Background Jobs**          | S3-03  | Orphaned claim release, timeouts        |
| **Automated Role Promotion** | S3-04  | Trust-threshold Steward upgrades        |
| **Pre-push Git Enforcement** | S3-01  | 100% workflow compliance                |
| **Manual Testing Resources** | S3-all | Mobile devices, accessibility validated |

---

## Dependency Graph

```
S3-01 Test Infrastructure
  │
  ├──► S3-02 Member Dashboard ──┐
  │                             ├──► S3-04 Role Promotion
  ├──► S3-03 Background Jobs ───┘
  │
  └──► (All stories benefit from tests)
```

**Parallelization Strategy**:

- S3-01 starts immediately (CRITICAL path, no blockers)
- S3-02 and S3-03 can begin in parallel after S3-01 test infrastructure ready
- S3-04 waits for S3-02 (depends on dashboard UI for role badge)

---

## Story Complexity & Review Requirements

| Story | Title                        | Complexity | Points | Strategic Review | Estimated Duration |
| ----- | ---------------------------- | ---------- | ------ | ---------------- | ------------------ |
| S3-01 | Test Infrastructure          | Simple     | 3      | Optional         | 4-6 hours          |
| S3-02 | Member Dashboard & Trust Viz | Complex    | 8      | **Mandatory**    | 1.5-2 days         |
| S3-03 | Background Jobs & Workflows  | Moderate   | 5      | **Mandatory**    | 1 day              |
| S3-04 | Trust-Threshold Role Promo   | Simple     | 4      | Optional         | 6-8 hours          |

**Total**: 20 points  
**Strategic Reviews**: 2 mandatory (S3-02, S3-03), 2 optional (S3-01, S3-04)

**Complexity Definitions** (from learnings doc):

- **Simple**: Single ontology dimension, reusing established patterns, <2 hours
- **Moderate**: 2-3 dimensions, some new patterns, 4-8 hours
- **Complex**: 4+ dimensions, new architectural patterns, multiple integrations, 1-2 days

---

## Stories Overview

### S3-01: Test Infrastructure ⭐ CRITICAL

**Why First**: Addresses HIGH-priority action item from Sprint 2. Currently 0 automated tests.

**Complexity**: Simple (2 hours setup + 2 hours initial tests)  
**Migration Impact**: N/A (infrastructure)  
**Ontology**: N/A (infrastructure)

**Scope**:

- Install Vitest + testing utilities
- Configure `vitest.config.ts` for API testing
- Write integration tests for existing API endpoints:
  - `/api/trust-builder/auth/verify-code`
  - `/api/trust-builder/tasks/[id]/claim`
  - `/api/trust-builder/claims/[id]/review`
- Write unit tests for business logic:
  - `claim-engine.ts` (state machine transitions)
  - `trust-score-calculator.ts` (points aggregation)
- Implement pre-push git hooks (prevent commits to main)
- Implement pre-commit hooks (TypeScript + character encoding)
- Target: 40% code coverage (foundation for 60% by end of sprint)

**Deliverables**:

- `vitest.config.ts`
- `src/lib/__tests__/` directory with 8+ test files
- `.husky/` hooks configured
- GitHub Actions workflow for CI (optional, if time allows)

**Success Criteria**:

- [ ] All existing API endpoints have at least 1 integration test
- [ ] Business logic functions have unit tests
- [ ] Tests pass locally (`pnpm test`)
- [ ] Pre-push hook rejects commits to main
- [ ] Pre-commit hook catches TypeScript errors

---

### S3-02: Member Dashboard & Trust Score Visualization

**Why Second**: Delivers high-value member experience. Showcases Trust Score (Knowledge dimension).

**Complexity**: Complex (1.5-2 days)  
**Strategic Review**: **MANDATORY** (45-90 min with product-advisor)  
**Migration Impact**: 90% (trust score derivation from events)  
**Ontology**: People + Knowledge + Events (query-heavy)

**Scope**:

- **Dashboard Page** (`/trust-builder/dashboard`):
  - Display member's current Trust Score (big number, prominent)
  - Incentive breakdown radial chart (5 dimensions: Participation, Collaboration, Innovation, Leadership, Impact)
  - Claim history table (submitted/under review/approved/revised)
  - Mission participation summary
- **Trust Score Derivation**:
  - Query events table for all `claim.approved` events for member
  - Sum `metadata.points_earned` grouped by incentive type
  - Cache result in `members.trust_score_cached` (updated on each approval)
  - Provide "Recalculate from Events" button (admin-only, validates cache accuracy)
- **API Endpoints**:
  - `GET /api/trust-builder/dashboard/me` - Returns member stats
  - `GET /api/trust-builder/members/[id]/trust-score` - Trust score breakdown
  - `POST /api/trust-builder/members/[id]/recalculate-trust-score` - Rebuild from events (admin)
- **UI Components**:
  - `<MemberDashboard />` (page wrapper)
  - `<TrustScoreCard />` (big number + trend)
  - `<IncentiveRadarChart />` (Recharts radial chart)
  - `<ClaimHistoryTable />` (sortable, filterable)

**Acceptance Criteria**:

- [ ] Dashboard displays member's Trust Score within 2s page load
- [ ] Radial chart correctly visualizes 5 incentive dimensions
- [ ] Claim history table shows all claims (submitted → approved/rejected)
- [ ] Trust Score derivation matches event log (verified with test query)
- [ ] Mobile responsive (375px, 768px, 1024px viewports)
- [ ] Keyboard navigable (Tab through all interactive elements)
- [ ] Screen reader announces Trust Score and chart data labels

**Migration Readiness Checklist**:

- [ ] Trust Score derivable from events alone (no dependency on `trust_score_cached`)
- [ ] Recalculation query provided (can rebuild from genesis)
- [ ] Event metadata includes `points_earned` breakdown (per incentive)

**Testing Schedule**:

- Day 1-2: Implementation (fullstack-developer)
- Day 3: Strategic review (product-advisor, 90 min)
- Day 4: Code inspection QA (qa-engineer, 2 hours)
- Day 5: Manual testing (qa-engineer, 1 hour)
  - Mobile: iPhone 12+ (375px), iPad (768px), Desktop (1024px+)
  - Accessibility: VoiceOver navigation, focus indicators
  - Cross-browser: Chrome, Safari
- Day 6: QA report

**State Machine**: N/A (read-only dashboard, no state transitions)

---

### S3-03: Background Jobs & Automated Workflows

**Why Third**: Addresses orphaned claim release (action item from S2-04). Accountability automation.

**Complexity**: Moderate (1 day)  
**Strategic Review**: **MANDATORY** (45 min with product-advisor)  
**Migration Impact**: 85% (timeout events logged, but cron timing not on-chain)  
**Ontology**: Connections (claim assignment) + Events (timeout/release)

**Scope**:

- **Orphaned Claim Release** (Phase 1: Manual trigger, Phase 2: Scheduled):
  - **Manual API Endpoint** (ship in S3-03):
    - `POST /api/trust-builder/admin/release-orphaned-claims`
    - Identifies claims with `status = 'under_review'` AND `updated_at > 7 days ago`
    - Transitions to `status = 'submitted'`, clears `reviewer_id`
    - Logs event: `claim.timeout_released` with metadata (reviewer_id, days_orphaned)
  - **Scheduled Job** (post-deployment, S4):
    - Vercel Cron or GitHub Actions
    - Runs daily at 00:00 UTC
    - Calls manual endpoint
- **Admin UI**:
  - Add "Release Orphaned Claims" button to `/trust-builder/admin/claims` page
  - Display count of orphaned claims (badge notification)
  - Show confirmation dialog with list of affected claims
- **Notification System** (optional, if time allows):
  - Email reminder to reviewer at Day 5 (before timeout)
  - "Your review is almost due" message

**Acceptance Criteria**:

- [ ] Manual endpoint releases claims orphaned >7 days
- [ ] Event log records `claim.timeout_released` with complete metadata
- [ ] Admin UI displays orphaned claim count (updated on page load)
- [ ] Confirmation dialog lists affected claims (title, reviewer, days orphaned)
- [ ] Released claims immediately appear in reviewer queue again
- [ ] Trust Score unaffected (no penalty for timeout in Season 0)
- [ ] Transaction-safe (release + event log atomic)

**Migration Readiness Checklist**:

- [ ] Timeout duration (7 days) stored in smart contract config (not hardcoded)
- [ ] Event metadata sufficient to reconstruct timeout history
- [ ] Release logic pure function (no side effects beyond DB update)

**Testing Schedule**:

- Day 1: Implementation (fullstack-developer, 6 hours)
- Day 2: Strategic review (product-advisor, 45 min)
- Day 3: Code inspection QA (qa-engineer, 1.5 hours)
- Day 4: Manual testing (qa-engineer, 30 min)
  - Create test claim, manually set `updated_at = NOW() - INTERVAL '8 days'`
  - Verify release endpoint transitions state correctly
  - Verify event log includes timeout metadata
- Day 5: QA report

**State Machine** (Claim timeout path):

```
under_review (orphaned >7 days) → timeout_released → submitted (re-queued)
```

**5 State Machine Paths Validation**:

1. **Happy path**: Reviewer approves within 7 days ✅
2. **Failure path**: Reviewer rejects ✅
3. **Retry path**: Reviewer requests revision ✅
4. **Timeout path**: Orphaned >7 days, auto-released ✅ (THIS STORY)
5. **Voluntary exit**: Reviewer releases claim voluntarily ✅ (S2-04)

---

### S3-04: Trust-Threshold Role Promotion

**Why Fourth**: Builds on S3-02 dashboard. Automates Steward role unlock (functional requirement).

**Complexity**: Simple (6-8 hours)  
**Strategic Review**: Optional (pattern established in S2-02)  
**Migration Impact**: 95% (role promotion events logged, threshold on-chain)  
**Ontology**: People (role attribute) + Knowledge (trust score threshold) + Events

**Scope**:

- **Automated Promotion Logic**:
  - After claim approval updates `trust_score_cached`, check if `>= 250`
  - If threshold met AND current `role = 'Member'`, promote to `role = 'Steward'`
  - Log event: `member.role_promoted` with metadata (old_role, new_role, trust_score, threshold)
- **Dashboard Badge**:
  - Display "🌟 Steward" badge on dashboard for promoted members
  - Show "Path to Steward" progress bar for Members <250 points
  - Tooltip: "At 250 Trust Score, you unlock Steward abilities (claim review)"
- **Promotion Notification**:
  - Congratulations message on next dashboard visit
  - "You've earned the Steward role! You can now review claims from other members."
- **Steward Permissions** (already implemented in S2-04):
  - Access to `/trust-builder/review` page (claim queue)
  - Ability to approve/reject/request revision

**Acceptance Criteria**:

- [ ] Member promoted to Steward when trust score reaches 250
- [ ] Event log records `member.role_promoted` with complete metadata
- [ ] Dashboard displays Steward badge after promotion
- [ ] Progress bar shows path to Steward (0-250 points)
- [ ] Promotion happens atomically with claim approval (same transaction)
- [ ] Congratulations message appears on next dashboard visit (dismissible)
- [ ] Manual promotion still possible (admin can promote at any score)

**Migration Readiness Checklist**:

- [ ] Threshold (250) stored in smart contract config table (not hardcoded)
- [ ] Promotion event includes threshold value (auditable if threshold changes)
- [ ] Promotion logic pure function (deterministic, no external state)

**Testing Schedule**:

- Day 1: Implementation (fullstack-developer, 6 hours)
- Day 2: Code inspection QA (qa-engineer, 1 hour)
- Day 3: Manual testing (qa-engineer, 30 min)
  - Create test member with 240 points
  - Approve claim worth 10+ points
  - Verify promotion to Steward
  - Verify event log
  - Verify dashboard badge appears
- Day 4: QA report

**State Machine** (Member role progression):

```
Member (trust_score < 250) → Steward (trust_score >= 250) → Guardian (manual, future)
```

---

## Sprint 3 Quality Targets

### Code Quality Standards (from learnings doc)

**All Stories Must Meet**:

- [ ] TypeScript strict mode (no `any` types)
- [ ] Character encoding validated (no smart quotes, en-dashes)
- [ ] Transaction completeness (withTransaction wrapper, events inside tx)
- [ ] Defense-in-depth (database constraints + sanctuary error messages)
- [ ] Event logging complete (metadata sufficient for reconstruction)
- [ ] Sanctuary culture (error messages educational, button labels inviting)

### Testing Coverage Targets

| Story | Unit Tests | Integration Tests | Manual Tests  |
| ----- | ---------- | ----------------- | ------------- |
| S3-01 | 8+ files   | 3+ API endpoints  | N/A           |
| S3-02 | 3 files    | 2 API endpoints   | Mobile + A11y |
| S3-03 | 2 files    | 1 API endpoint    | Timeout test  |
| S3-04 | 2 files    | 1 API endpoint    | Promotion     |

**Sprint 3 Target**: 60% code coverage (measured by Vitest)

### Migration Readiness Targets

| Story | Target | Rationale                                      |
| ----- | ------ | ---------------------------------------------- |
| S3-01 | N/A    | Infrastructure (no migration impact)           |
| S3-02 | 90%    | Trust score derivable from events              |
| S3-03 | 85%    | Timeout events logged (cron timing off-chain)  |
| S3-04 | 95%    | Role promotion deterministic, threshold stored |

**Sprint Average Target**: 90%+

### Git Workflow Compliance Target

**100%** (enforced by pre-push hooks in S3-01)

---

## Action Items from Learnings Doc (Sprint 2)

### HIGH Priority (Addressed in Sprint 3)

- [x] **Test Infrastructure** → S3-01
- [x] **Pre-push hooks** → S3-01
- [x] **Pre-commit hooks** → S3-01
- [x] **Manual testing resources** → Allocated in testing schedules
- [x] **Testing schedule in stories** → All stories include Day 5 manual testing
- [x] **Background job (orphaned claims)** → S3-03

### MEDIUM Priority (Sprint 4+)

- [ ] **Document atomic assignment pattern** → S4-01 (pattern library)
- [ ] **Create architectural patterns library** → S4-01
- [ ] **Publish grade rubric** → S4 planning phase
- [ ] **Define story complexity tags** → Applied in this sprint plan

### LOW Priority (Post-Deployment)

- [ ] **Vercel Cron scheduled job** → Post-S3 deployment
- [ ] **Migration readiness validation** → S4-02
- [ ] **Strategic review process doc** → S4 planning phase

---

## Sprint 3 Success Metrics

**Quantitative Targets**:

- ✅ 4 stories delivered (all production-ready)
- ✅ Sprint grade: A (maintain S2 quality)
- ✅ Migration readiness: 90%+ average
- ✅ Git workflow: 100% compliance (pre-push enforcement)
- ✅ Test coverage: 60% code coverage
- ✅ Manual testing: 100% AC validation (0 "NEEDS TEST" items)

**Qualitative Targets**:

- ✅ Strategic review ROI: Maintain 3-4x time savings
- ✅ Test infrastructure unblocks future velocity
- ✅ Member dashboard delivers visible value (Trust Score)
- ✅ Background jobs reduce admin burden
- ✅ Role promotion feels rewarding (motivational UX)

**Team Process Targets**:

- ✅ Zero architectural rework (strategic review effectiveness)
- ✅ Zero character encoding bugs (pre-commit hooks)
- ✅ Zero git workflow violations (pre-push hooks)
- ✅ Faster QA cycles (automated tests catch regressions)

---

## Sprint 3 Timeline

| Week | Day | Activities                                         |
| ---- | --- | -------------------------------------------------- |
| 1    | Mon | S3-01 kickoff (test infrastructure)                |
| 1    | Tue | S3-01 delivery, S3-02 strategic review             |
| 1    | Wed | S3-02 implementation begins                        |
| 1    | Thu | S3-02 implementation continues                     |
| 1    | Fri | S3-02 QA validation, S3-03 strategic review        |
| 2    | Mon | S3-03 implementation (background jobs)             |
| 2    | Tue | S3-03 QA validation, S3-04 implementation begins   |
| 2    | Wed | S3-04 implementation + QA                          |
| 2    | Thu | Manual testing all stories, integration validation |
| 2    | Fri | Sprint 3 retrospective, grade reports, S4 planning |

---

## Risk Assessment

### Known Risks

| Risk                               | Likelihood | Impact | Mitigation                                 |
| ---------------------------------- | ---------- | ------ | ------------------------------------------ |
| Test setup takes longer than 2h    | Medium     | Low    | Timebox setup, deploy basic tests first    |
| Dashboard chart library issues     | Low        | Medium | Recharts already installed, examples exist |
| Background job complexity grows    | Low        | Medium | Ship manual trigger first, schedule later  |
| Mobile testing devices unavailable | Medium     | Medium | Allocate budget early, order Day 1         |

### De-Risking Actions

1. **S3-01 timeboxing**: If test setup exceeds 2 hours, ship minimal viable tests (3 API endpoints only)
2. **S3-02 chart fallback**: If Recharts has issues, ship simple bar chart (degraded but functional)
3. **S3-03 phased rollout**: Ship manual trigger in S3-03, schedule cron job post-deployment
4. **Mobile testing**: If devices unavailable, use browser DevTools responsive mode (document limitation in QA report)

---

## Lessons Applied from Sprint 2

### Process Improvements

1. **Strategic Review ROI Proven**: Mandatory for S3-02, S3-03 (3-4x time savings expected)
2. **Git Workflow Enforcement**: Pre-push hooks in S3-01 prevent violations (100% compliance)
3. **Testing Schedule Built-In**: Every story has Day 5 manual testing (1 hour allocated)
4. **AI-Optimized Sizing**: Stories sized for 1-2 day completion by fullstack-developer agent
5. **Complexity Transparency**: Simple/Moderate/Complex tags guide review depth

### Technical Patterns Reused

1. **Event Sourcing**: All state changes log events with complete metadata
2. **Defense-in-Depth**: Database constraints + sanctuary error messages
3. **Atomic Operations**: Use `UPDATE ... RETURNING` for competitive actions
4. **Transaction Boundaries**: `withTransaction()` wrapper, events inside tx
5. **Fail-Closed Errors**: Clear messages, 503 for config issues (not 500)

### Sanctuary Culture Embedded

1. **Dashboard UX**: Progress bar to Steward feels motivational (not gatekeeping)
2. **Promotion Message**: Congratulations tone (not "unlocked achievement")
3. **Timeout Release**: No penalty for Season 0 (learning environment)
4. **Error Messages**: "Your review is almost due" (reminder, not threat)

---

## Next Sprint Preview (Sprint 4)

**Likely Focus**:

- Admin operations (cancel tasks, slashing, disputes)
- Mission joining workflow (currently deferred)
- Public event ledger view (transparency feature)
- Pattern documentation library (scaling team knowledge)
- Performance optimization (sub-2s page loads)
- Accessibility audit (WCAG 2.1 AA compliance)

**Migration Prep**:

- Export scripts (database → JSON → IPFS format)
- Merkle root derivation from event log
- Trust score reconstruction validation
- Smart contract config table (thresholds, timeouts, point values)

---

_This sprint plan incorporates learnings from Sprint 2 retrospective and prioritizes test infrastructure, member experience, and automated workflows._
