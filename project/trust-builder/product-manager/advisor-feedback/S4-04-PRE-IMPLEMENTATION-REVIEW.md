# S4-04 Pre-Implementation Review: Mission Task Management

**Story**: S4-04 - Mission Task Management UI  
**Date**: 2026-02-13  
**Reviewer**: product-advisor (AI)  
**Review Type**: Pre-Implementation Strategic Validation (45 minutes)  
**Complexity**: Moderate (5 points)  
**Context**: Builds on S4-03B (Mission Joining), integrates with existing claim workflow (S1-04, S2-04)

---

## Executive Summary

**Grade**: **B (Approved with Critical Schema Fix Required)**

S4-04 is **CONDITIONALLY APPROVED** with one **CRITICAL BLOCKER** that must be resolved before implementation. The story has excellent ontology alignment, clear integration strategy, and strong sanctuary culture messaging. However, there is a **schema constraint mismatch** that will break existing non-mission tasks.

**Critical Blocker**:

- ❌ **Schema Constraint Conflict**: `tasks.group_id` is defined as `NOT NULL` in schema.sql, but story assumes it can be NULL for backward compatibility
- **Impact**: All existing tasks without missions will fail constraint, breaking S1-03, S1-04 workflows
- **Required Fix**: Make `group_id` nullable OR create default "General Tasks" group

**Key Strengths**:

- ✅ Zero new entities (leverages existing tasks.group_id field)
- ✅ Clean integration with existing claim workflow
- ✅ Mission-scoped authorization well-designed (memberships check)
- ✅ Enhanced event metadata for migration readiness
- ✅ Strong sanctuary culture messaging (encouraging, member-focused)
- ✅ Component reuse maximized (TaskCard, tabs, Cards)

**Migration Readiness Impact**: 96% → **98%** (+2 points: mission-scoped task attestations)

**Time Estimate After Fix**: 6-8 hours (on target for 5 points)

---

## CRITICAL ISSUE: Schema Constraint Mismatch

### Problem

**Current Schema** (schema.sql line 53):

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,  -- ❌ NOT NULL
  ...
);
```

**Story Assumption** (lines 24, 387-388):

- "Tasks already have `group_id` field. This story is UI + API layer only."
- "Backward compatible: Non-mission tasks (group_id = NULL) still work"

**Impact**:

- All existing tasks in seed.sql have `group_id` values (must reference valid groups)
- Any new task creation without mission context will FAIL constraint violation
- Existing task list (S1-03) and claim submission (S1-04) will break if they don't specify group_id

### Solution Options

**Option A: Make group_id Nullable (RECOMMENDED)**

Add migration before S4-04:

```sql
-- Migration: 011_make_tasks_group_id_nullable.sql
ALTER TABLE tasks ALTER COLUMN group_id DROP NOT NULL;
CREATE INDEX idx_tasks_group_null ON tasks(group_id) WHERE group_id IS NOT NULL;
```

**Rationale**:

- Preserves backward compatibility (tasks can exist without missions)
- Allows gradual adoption (missions are optional, not required)
- Sanctuary-aligned: doesn't force all work into mission structure
- Minimal code changes (all NULL checks in story already written)

**Option B: Create Default "General Tasks" Group**

Add seed data:

```sql
-- Seed: Add "General Tasks" default group
INSERT INTO groups (id, name, type, description, status, stable_id, min_trust_score)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'General Tasks',
  'colony',
  'Tasks not associated with a specific mission',
  'active',
  'FE-G-000',
  0
);

-- Set existing tasks without mission to General Tasks group
UPDATE tasks SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;
```

**Rationale**:

- Maintains NOT NULL constraint (stricter data model)
- All tasks have organizational context (groups dimension integrity)
- "General Tasks" group acts as catch-all for non-mission work

**Recommendation**: **Option A (Nullable)** - More flexible, less forced categorization, sanctuary-aligned.

---

## 1. Prerequisite Validation

### S4-03B Mission Joining: **✅ VERIFIED**

**From PR #12** (feature/S4-03B-mission-joining-ui):

- Members can join missions via POST /api/trust-builder/missions/[id]/join
- Mission membership tracked in memberships table (status='active')
- Mission detail UI shows member list

**Schema Elements Available for S4-04**:

- ✅ `groups` table with missions (type='mission')
- ✅ `memberships` table tracks active members per mission
- ✅ `tasks` table has group_id field (⚠️ currently NOT NULL, needs fix)
- ✅ Claims workflow exists (S1-04, S2-04)

**Assessment**: All prerequisites met **after schema fix applied**.

---

## 2. Ontology Correctness

### 2.1 Groups Dimension: **Grade A** ✅

**Mapping**: Missions as organizational containers for tasks.

**Implementation**:

- Tasks filtered by `group_id` to show mission-specific work
- Authorization checks via memberships (member must be active in mission)
- Mission context preserved through claim workflow

**Validation**:

- ✓ Query: `SELECT * FROM tasks WHERE group_id = mission_id AND state = 'open'`
- ✓ Authorization: `SELECT 1 FROM memberships WHERE member_id = ? AND group_id = ? AND status = 'active'`
- ✓ Index exists: `idx_tasks_group` (schema.sql line 68)

**Strategic Note**: Mission as "work container" aligns with organizational structure, validates Groups dimension as coordination layer.

---

### 2.2 Connections Dimension: **Grade A** ✅

**Mapping**: Member ↔ Mission ↔ Tasks relationship via memberships + claims.

**Connection Types**:

1. **Membership Connection**: Member to Mission (memberships table, from S4-03A)
2. **Task Assignment**: Mission to Tasks (tasks.group_id)
3. **Claim Connection**: Member to Task (claims table, from S1-04)

**Three-way relationship**:

```
Member --[memberships]--> Mission --[tasks.group_id]--> Tasks --[claims]--> Member
```

**Validation**:

- ✓ Membership required to view mission tasks (AC2, AC18)
- ✓ Claim creation validates membership (AC10, AC20)
- ✓ Privacy: Other members' claims not exposed (AC21)

**Strategic Note**: Clean three-way connection without introducing new junction tables. Existing tables compose well.

---

### 2.3 Events Dimension: **Grade A** ✅

**Event Enhancement**: claim.created event gains mission context (AC12).

**Enhanced Metadata Structure**:

```typescript
{
  entity_type: 'claim',
  entity_id: claim_id,
  event_type: 'claim.created',
  metadata: {
    task_id,
    task_title,
    member_id,
    member_stable_id,  // ✓ From S4-03B enhancement
    group_id,          // ✓ NEW: Mission context
    group_stable_id,   // ✓ NEW: Portable mission ID
    group_name         // ✓ NEW: Human-readable mission
  }
}
```

**Append-Only Integrity**: ✓ Only INSERT statements (no UPDATE/DELETE on events)

**Conditional Metadata**: Story correctly handles tasks with/without group_id (lines 273-275):

```typescript
// Event logging conditional: only add group metadata if group_id exists
if (task.group_id) {
  metadata.group_id = task.group_id;
  metadata.group_stable_id = mission.stable_id;
  metadata.group_name = mission.name;
}
```

**Migration Readiness**: Mission-scoped events enable blockchain attestations like:

- "Contributed to Webinar Series S0 mission"
- "Founding member of Platform Development initiative"
- Granular proof of specialized participation

**Assessment**: Event structure excellent. Mission context adds **+2% migration readiness** (96% → 98%).

---

### 2.4 Things Dimension: **Grade A** ✅

**Mapping**: Tasks as contracts (existing), now with mission scope.

**No Schema Changes**: ✓ Story correctly leverages existing tasks.group_id field.

**Task States**: No changes to existing state machine (draft → open → complete, etc.).

**Task Types**: No changes to task_type or verification_method fields.

**Assessment**: Clean extension of existing Things dimension. No new entities, no breaking changes (after schema fix).

---

### 2.5 People & Knowledge Dimensions: **Grade A** ✅

**People**: Members as actors, no changes to member model.

**Knowledge**: New aggregation—mission progress tracking (AC11):

```typescript
// GET /api/trust-builder/missions/me
{
  missions: [
    {
      id,
      name,
      stable_id,
      tasks_completed: 3, // ✓ Member's completed tasks in this mission
      tasks_available: 2, // ✓ Open tasks member hasn't claimed
    },
  ];
}
```

**Assessment**: Knowledge dimension enriched with mission-scoped contribution metrics. Supports "My Missions" dashboard section.

---

## 3. Quasi-Smart Contract Integrity

### 3.1 Immutability: **Grade A** ✅

**Claims Remain Immutable**: Claim records not changed by this story, only creation context enhanced.

**Events Append-Only**: ✓ Event logging adds mission context without modifying existing events table structure.

**Task Immutability**: Published tasks (state='open') remain immutable as per S2-02 contract.

**Assessment**: No violations of quasi-smart contract principles.

---

### 3.2 Authorization Boundaries: **Grade A** ✅

**Mission Membership as Access Control**: Story correctly uses memberships table as authorization layer.

**Authorization Checks** (pseudo-code from story lines 297-303):

```typescript
// Check membership before showing tasks
const membership = await db.query(
  'SELECT 1 FROM memberships WHERE member_id = $1 AND group_id = $2 AND status = 'active'
);
if (!membership) return 403;
```

**Privacy Protection** (AC21):

- Members see "Claimed" status for other members' claims
- Claimant identity not exposed (sanctuary culture: focus on work, not competition)

**Assessment**: Authorization well-designed. Membership requirement enforced at API layer.

---

### 3.3 Backward Compatibility: **Grade B** ⚠️

**Current Status**: Conditionally compatible after schema fix.

**Risk Areas**:

1. ✅ **Claims workflow**: Story correctly integrates with existing S1-04 flow (AC22)
2. ✅ **Review workflow**: No changes to S2-04 peer review (AC23)
3. ⚠️ **Task creation**: Non-mission tasks require group_id = NULL support (blocked by schema)
4. ✅ **Trust score**: Mission task completions counted same as non-mission tasks (AC24)

**Schema Fix Required**: See "Critical Issue" section above.

**After Fix, Assessment**: Full backward compatibility. Non-mission tasks continue to work.

---

## 4. Sanctuary Culture Validation

### 4.1 Messaging: **Grade A** ✅

**Encouraging Language** (AC17, AC19):

**Task Discovery** (story line 126):

```tsx
<p className="text-muted-foreground">
  Contribute to mission goals and build trust together!
</p>
```

**Non-Member Message** (story line 384):

```tsx
<Alert>
  <AlertDescription>
    Join this mission to view available tasks and start contributing!
  </AlertDescription>
  <Button variant="default">Join Mission</Button>
</Alert>
```

**Assessment**:

- ✓ Positive framing ("contribute", "start contributing")
- ✓ No exclusionary language ("you're not allowed")
- ✓ Clear path forward (Join Mission button)
- ✓ Focus on opportunity, not restriction

---

### 4.2 Privacy & Non-Competition: **Grade A** ✅

**Other Members' Claims Hidden** (AC21):

From story lines 310-311:

```typescript
claimStatus: task.is_claimed
  ? task.claimed_by_me
    ? 'claimed_by_me'
    : 'claimed_by_other'
  : 'unclaimed';
```

**UI Treatment**:

- **Claimed by me**: "View My Claim" link (empowering)
- **Claimed by other**: "Claimed" badge (neutral, no competition)
- **Unclaimed**: "Claim Task" button (inviting)

**Assessment**:

- ✓ No leaderboards or competitive elements
- ✓ Focus on individual contribution, not comparison
- ✓ Privacy-respecting (claimant identity protected)

---

### 4.3 Autonomy & Voluntary Participation: **Grade A** ✅

**No Task Assignment**: Story correctly keeps task claiming voluntary (lines 450-452):

> **Open Question 2**: Should admins be able to assign tasks to specific mission members?  
> **Recommendation**: Keep voluntary for Season 0 (sanctuary culture: autonomy)

**Assessment**:

- ✓ Members choose which tasks to work on
- ✓ No forced assignments or quotas
- ✓ Supports self-directed learning and contribution
- ✓ Sanctuary-aligned: trust members to self-organize

---

## 5. UX & Human-Centeredness

### 5.1 Information Architecture: **Grade A** ✅

**Tab Navigation** (AC13):

From story lines 341-356:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="tasks">Tasks</TabsTrigger>
    <TabsTrigger value="members">Members</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* Mission description, join button (S4-03B) */}
  </TabsContent>

  <TabsContent value="tasks">
    <MissionTaskList missionId={id} />
  </TabsContent>

  <TabsContent value="members">{/* Members list (S4-03B) */}</TabsContent>
</Tabs>
```

**Assessment**:

- ✓ Clear navigation between mission facets
- ✓ "Tasks" tab logical next step after joining (Overview → Join → Tasks)
- ✓ Related content grouped (all mission context in one page)

---

### 5.2 Task Discovery Flow: **Grade A** ✅

**Member Journey**:

1. Browse missions → Join mission (S4-03B)
2. View mission Overview tab (mission description, members)
3. Click "Tasks" tab → See available mission tasks
4. Claim task → Redirected to claim submission (S1-04)
5. Complete claim → Return to mission tasks → See "Claimed by You" status

**Assessment**:

- ✓ Linear flow with clear next actions
- ✓ No backtracking or confusing navigation
- ✓ Claim submission reuses familiar S1-04 flow (consistency)

---

### 5.3 Dashboard Integration: **Grade A** ✅

**"My Missions" Section** (AC8, AC11):

From story lines 409-432:

```tsx
<Card>
  <CardHeader>
    <CardTitle>My Missions</CardTitle>
  </CardHeader>
  <CardContent>
    {missions.map((mission) => (
      <div key={mission.id}>
        <h4>{mission.name}</h4>
        <p>
          {mission.tasks_completed} tasks completed • {mission.tasks_available}{' '}
          available
        </p>
        <Button
          variant="outline"
          href={`/trust-builder/missions/${mission.id}/tasks`}
        >
          View Tasks
        </Button>
      </div>
    ))}
  </CardContent>
</Card>
```

**Assessment**:

- ✓ Progress visibility (tasks completed, tasks available)
- ✓ Quick navigation to mission tasks (View Tasks button)
- ✓ Motivating (shows contribution per mission)
- ✓ Integrates with existing dashboard (S3-02)

---

### 5.4 Mobile Responsive: **Grade A** ✅

**Responsive Breakpoints** (AC16):

From story line 393:

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {tasks.map((task) => (
    <TaskCard key={task.id} task={task} />
  ))}
</div>
```

**Assessment**:

- ✓ 375px (mobile): Single column, cards stack
- ✓ 768px (tablet): 2 columns
- ✓ 1024px (desktop): 3 columns
- ✓ Matches S4-03B pattern (consistent responsive behavior)

---

## 6. Layout & Component Reuse

### 6.1 Pattern Alignment: **Grade A** ✅

**List + Detail Pattern**: Not used for tasks (using grid instead). Correct decision.

**Rationale**:

- Tasks don't need detail view (claim submission is separate page)
- Grid layout better for browsing multiple tasks at once
- Matches S1-03 public task list pattern (consistency)

**Card Grid Layout** (AC14):

- Reuses TaskCard component from S1-03
- Grid responsive (stacks on mobile, 2-3 columns on desktop)
- Sanctuary spacing (gap-4, space-y-4)

---

### 6.2 Component Reuse: **Grade A** ✅

**Reused Components** (story lines 212-221):

- **TaskCard** (S1-03): Task display with claim button
- **Tabs** (shadcn/ui): Mission detail navigation
- **Card, CardHeader, CardTitle** (S1-05): Layout containers
- **Button** (S1-04): Primary actions
- **Badge** (S2-04): Status indicators
- **Alert** (S2-04): Non-member message
- **Skeleton** (S3-02): Loading states

**New Components**: None required (excellent reuse)

**Assessment**: Component library maturity validated. Zero new UI primitives needed.

---

### 6.3 Primary Action Clarity: **Grade A** ✅

**Primary Action** (AC15): "Claim Task" button with `variant="default"`

**Visual Hierarchy**:

- **Primary**: Claim Task (blue, prominent)
- **Secondary**: View My Claim (outline, link)
- **Disabled**: Already Claimed (gray, disabled state)

**Assessment**:

- ✓ One clear action per task card
- ✓ Visual hierarchy obvious (primary stands out)
- ✓ Disabled states clear (not clickable when unavailable)

---

## 7. Integration Quality

### 7.1 Existing Workflows: **Grade A** ✅

**Claim Submission** (AC22):

- Redirects to existing S1-04 claim submission form
- Mission context stored in claim metadata (group_id)
- No UI changes to claim submission (consistency)

**Peer Review** (AC23):

- Mission task claims reviewed identically to non-mission claims
- Reviewers see mission context in claim detail (if implemented)
- No changes to S2-04 review workflow

**Trust Score** (AC24):

- Mission task completions count toward trust score
- No special weighting for mission vs non-mission tasks (fair)
- Trust score calculation unchanged (S3-02 background job)

**Assessment**: Clean integration. No breaking changes to existing flows.

---

### 7.2 API Design: **Grade A** ✅

**New Endpoints** (AC9, AC10, AC11):

1. `GET /api/trust-builder/missions/[id]/tasks`
   - Returns mission-scoped tasks with claim status
   - Authorization: Active membership required

2. `POST /api/trust-builder/tasks/[id]/claims` (enhanced)
   - Adds mission context to metadata
   - Backward compatible: Only if task has group_id

3. `GET /api/trust-builder/missions/me`
   - Returns joined missions with task progress
   - New aggregation query (performant with existing indexes)

**Assessment**:

- ✓ RESTful endpoints follow existing patterns
- ✓ Authorization consistent with S4-03B (memberships check)
- ✓ Response shapes match existing API conventions

---

## 8. Testing Strategy

### 8.1 Test Coverage: **Grade B+** ✅

**Acceptance Criteria**: 29 ACs (comprehensive)

**Test Types**:

- API authorization (AC2, AC18, AC20)
- Mission-scoped filtering (AC3, AC9)
- Event logging enhancement (AC12)
- Backward compatibility (AC22, AC23, AC24)
- Integration flows (AC4, AC5, AC6)

**Manual Testing** (Day 5):

- Mobile responsive (375px, 768px, 1024px)
- Keyboard navigation (tab order, focus states)
- Mission join → task claim flow

**Gap**: No mention of integration tests for new API endpoints.

**Recommendation**: Add integration tests similar to S4-03B missions.test.ts:

```typescript
// tests/missions-tasks.test.ts
describe('Mission Task Management API', () => {
  it('AC9: Returns mission tasks for active members');
  it('AC2: Rejects non-members with 403');
  it('AC10: Enhances claim with mission context');
  it('AC12: Logs event with mission metadata');
});
```

---

## 9. Migration Readiness

### Pre-S4-04: **96%**

**Post-S4-04**: **98%** (+2 points)

**Enhancements**:

1. **Mission-Scoped Task Attestations** (+1 point):
   - Events now include group_stable_id for portable mission identity
   - Blockchain can prove: "Completed Task X within Mission Y"
   - Granular proof of specialized contribution

2. **Mission Contribution History** (+1 point):
   - Member profile can reconstruct mission participation
   - Query: `SELECT DISTINCT group_stable_id FROM events WHERE entity_type='claim' AND actor_id=member`
   - Supports "Founding Member" badges for early mission contributors

**Remaining 2%**:

- Merkle root derivation from event log (deferred to Season 1)
- On-chain verification smart contracts (deferred to blockchain migration)

**Assessment**: S4-04 advances migration readiness meaningfully. Mission context makes attestations more specific and valuable.

---

## 10. Open Questions Resolution

### Question 1: Task Visibility Before Joining

**Story Question** (line 439):

> Should members see mission tasks before joining (read-only), or only after joining?

**Strategic Answer**: **Show read-only preview before joining**

**Rationale**:

- Transparency: Members should know what work is available before committing
- Informed decision: Task preview helps members choose missions aligned with skills/interests
- Sanctuary culture: Openness, no hidden information
- Engagement: Seeing interesting tasks motivates joining

**Implementation Guidance**:

```typescript
// GET /api/trust-builder/missions/[id]/tasks should return tasks even for non-members
// But disable claim buttons and show "Join mission to claim tasks" message
```

---

### Question 2: Task Assignment

**Story Question** (line 445):

> Should admins assign tasks to specific mission members, or keep voluntary?

**Strategic Answer**: **Keep voluntary for Season 0** (story recommendation correct)

**Rationale**:

- Sanctuary culture: Self-directed, trust-based participation
- Autonomy: Members choose work that interests them
- Season 0 learning: Observe natural task claiming patterns before adding constraints
- Season 1 consideration: If mission leaders need assignment for coordination, add then

---

### Question 3: Mission Task Limits

**Story Question** (line 450):

> Should there be limits on mission tasks a member can claim at once?

**Strategic Answer**: **Reuse existing global claim limits** (story recommendation correct)

**Rationale**:

- Simplicity: One limit system, not mission-specific + global
- Fairness: Same rules for all tasks (mission or non-mission)
- Prevents: Member claiming all mission tasks and blocking others
- If limit doesn't exist yet: Set reasonable default (e.g., 3 active claims)

---

### Question 4: Non-Mission Tasks

**Story Question** (line 455):

> How to handle existing tasks without group_id?

**Strategic Answer**: **Show in "General Tasks" section** (story recommendation correct)

**Implementation** (after schema fix to allow NULL):

```tsx
<Tabs>
  <TabsTrigger value="mission-tasks">Mission Tasks</TabsTrigger>
  <TabsTrigger value="general-tasks">General Tasks</TabsTrigger>
</Tabs>

// Filter:
// Mission tasks: WHERE group_id = mission_id
// General tasks: WHERE group_id IS NULL
```

**Assessment**: All open questions resolved with sanctuary-aligned decisions.

---

## 11. Risks & Mitigation

### Risk 1: Schema Constraint (CRITICAL) ❌

**Status**: **BLOCKER** - Must fix before implementation

**Mitigation**: Apply Option A (make group_id nullable) before starting S4-04.

---

### Risk 2: Authorization Performance ⚠️

**Risk**: Checking memberships on every task access could slow API.

**Mitigation**:

- ✅ Index exists: `idx_memberships_member_group` (from S4-03A)
- ✅ Query is simple: `SELECT 1 FROM memberships WHERE...` (fast)
- If needed: Cache membership status in JWT claims (future optimization)

**Assessment**: Low risk. Index + simple query = <1ms overhead.

---

### Risk 3: Backward Compatibility ⚠️

**Risk**: Non-mission tasks might break after changes.

**Mitigation**:

- ✅ Story correctly handles NULL group_id (conditional metadata)
- ✅ Existing claim workflow unchanged (just enhances metadata)
- ✅ Trust score calculation unaffected

**Assessment**: Low risk after schema fix. Story design is backward compatible.

---

### Risk 4: UX Confusion 🟡

**Risk**: Members might not understand mission vs general tasks.

**Mitigation**:

- ✅ Clear tab labels ("Mission Tasks" vs "General Tasks")
- ✅ Badge indicators on task cards ("Mission: X")
- ✅ Onboarding tooltip explaining mission-scoped work
- Consider: Walkthrough first time member joins mission

**Assessment**: Moderate risk. UX design reduces confusion, but user testing recommended.

---

## 12. Decision Matrix

### Should S4-04 Proceed?

**✅ YES - with schema fix**

**Rationale**:

- Strong ontology alignment (all 6 dimensions correct)
- Clean integration with existing workflows
- Excellent sanctuary culture messaging
- Mission-scoped events advance migration readiness (+2%)
- Component reuse validates library maturity
- Zero new entities (leverages existing schema)

**Conditional**: Fix schema constraint (make group_id nullable) before implementation.

**Estimated Time**: 6-8 hours (on target for 5 points after schema fix)

---

## Final Recommendations

### Before Implementation Starts

1. **CRITICAL: Fix Schema Constraint** (15 minutes)
   - Create migration: `011_make_tasks_group_id_nullable.sql`
   - Test migration on dev database
   - Verify existing tasks not affected

2. **Add Integration Tests** (30 minutes)
   - Create `missions-tasks.test.ts` with API authorization tests
   - Test mission-scoped filtering (AC3, AC9)
   - Test event metadata enhancement (AC12)

3. **Update Seed Data** (10 minutes, optional)
   - Add 2-3 tasks per mission with group_id set
   - Keep some tasks with group_id = NULL (test backward compatibility)

### During Implementation

4. **Task Visibility Preview**
   - Show mission tasks to non-members (read-only)
   - Disable claim button with "Join mission" message
   - Aligns with transparency value

5. **"My Missions" Dashboard Section**
   - Implement as separate component (MyMissions.tsx)
   - Cache mission task counts (don't recalculate on every dashboard load)
   - Consider: Link to mission detail page, not just tasks tab

6. **Event Metadata Conditional Logic**
   - Only add group metadata if task.group_id IS NOT NULL
   - Test with both mission and non-mission tasks
   - Verify existing events unaffected

### After Implementation (Post-QA)

7. **Manual Testing Focus**
   - Mission join → task claim → complete flow on mobile (375px)
   - Keyboard navigation through tabs and task cards
   - Non-member experience (should see tasks read-only)

8. **Retrospective Questions**
   - Did schema fix cause any issues?
   - Was component reuse as straightforward as expected?
   - How effective was mission-scoped authorization?
   - User feedback: Do members understand mission vs general tasks?

---

## Grade Breakdown

| Dimension                | Grade | Notes                                      |
| ------------------------ | ----- | ------------------------------------------ |
| **Ontology Correctness** | A     | All 6 dimensions correctly mapped          |
| **Quasi-Smart Contract** | A     | Immutability + authorization clean         |
| **Migration Readiness**  | A     | +2% from mission-scoped events             |
| **Sanctuary Culture**    | A     | Encouraging messaging, privacy, autonomy   |
| **UX Design**            | A     | Clear flows, good information architecture |
| **Layout Patterns**      | A     | Component reuse, responsive design         |
| **Integration Quality**  | A     | Backward compatible, clean API design      |
| **Testing Strategy**     | B+    | Comprehensive ACs, needs integration tests |
| **Schema Design**        | B     | ❌ Critical constraint issue (fixable)     |
| **Risk Management**      | A     | All risks identified with mitigations      |

**Overall Grade**: **B (Approved with Critical Fix)**

**Rationale**: Excellent story design across all dimensions except schema constraint. Once constraint fixed, this is an A-grade story. The constraint issue prevents A grade because it's a **blocker** that will break existing functionality if not addressed.

---

## Handoff Decision

### ✅ CONDITIONALLY APPROVED FOR IMPLEMENTATION

**Requirements Before Starting**:

1. **MUST FIX**: Apply schema migration to make tasks.group_id nullable
2. **SHOULD ADD**: Integration tests for new API endpoints
3. **CAN IMPROVE**: Seed data with mission tasks

**After Schema Fix**:

- Story is **READY FOR IMPLEMENTATION**
- Estimated time: 6-8 hours (on target for 5 points)
- Expected grade: A (B+ minimum)

**Next Steps**:

1. fullstack-developer creates migration 011_make_tasks_group_id_nullable.sql
2. Test migration on dev database (verify no errors)
3. Proceed with S4-04 implementation following story ACs
4. qa-engineer validates all 29 ACs + backward compatibility
5. product-advisor conducts post-implementation review (if requested)

---

## Signature

**Product Advisor**: product-advisor (AI Agent)  
**Date**: 2026-02-13  
**Recommendation**: **CONDITIONALLY APPROVED** (schema fix required)  
**Strategic Grade**: **B** (will be A after fix)

This story completes the Mission lifecycle vertical slice (S4-03A → S4-03B → S4-04), advancing Trust Builder toward Season 0 MVP. The schema constraint issue is the only blocker—once resolved, this is an excellent story ready for implementation.

---

**Story**: S4-04 Mission Task Management  
**Status**: ⚠️ Approved with Critical Fix Required  
**Blocker**: Schema constraint (tasks.group_id NOT NULL)  
**Fix Time**: ~15 minutes  
**Implementation Time After Fix**: 6-8 hours  
**Next Reviewer**: fullstack-developer (apply schema fix) → qa-engineer (after implementation)
