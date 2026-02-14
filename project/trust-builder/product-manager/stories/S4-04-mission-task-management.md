# Story S4-04: Mission Task Management UI

**Epic**: Member Experience - Mission Lifecycle  
**Priority**: HIGH (completes mission participation flow)  
**Sprint**: 4  
**Estimated Points**: 5  
**Complexity**: Moderate  
**Assigned To**: fullstack-developer  
**Strategic Review**: ✅ RECOMMENDED (45 minutes - validates mission-scoped task workflows)

---

## Prerequisites

**MUST COMPLETE FIRST**: S4-03B (Mission Joining UI)

This story builds on the mission joining capability to enable members to contribute to mission work. The following must exist:

- ✅ Members can join missions (S4-03B)
- ✅ `memberships` table tracks active mission members (S4-03A)
- ✅ `tasks.group_id` links tasks to missions (original schema)
- ✅ Claims system for task completion (S1-04, S2-04)

**Schema Note**: Tasks already have `group_id` field. This story is UI + API layer only.

---

## Goal

Enable members to view and work on tasks within missions they've joined. Display mission-scoped task lists, filter by member's active missions, and integrate with existing claim submission workflow.

**Value for Members**: Clear path from mission membership to contribution, see mission-specific work  
**Value for Organization**: Mission-based work organization, track contribution by mission context  
**Value for Migration**: Mission-scoped events create granular attestations for specific initiatives

---

## Complexity (for AI)

**Moderate** (6-8 hours)

**Rationale**:

- Schema already supports tasks with `group_id` (zero schema changes)
- Need mission context filtering in existing task list/detail UIs
- Extend existing claim submission to preserve mission context
- Event logging for mission-scoped task actions
- Reuse: TaskCard, TalentCard patterns from S1-03, S2-04

**Why Not Complex**:

- No new entities (tasks + missions already exist)
- Claim workflow unchanged (just adds mission context)
- Pattern reuse: List + filter from S1-03, Cards from existing components

**Strategic Pre-Review Recommended**: 45 minutes (validate mission-task relationship, event structure)

---

## Ontology Mapping

### Primary Dimensions

- **Groups**: Missions as organizational containers for tasks
- **People**: Members contributing to mission-specific work
- **Things**: Tasks scoped to missions (`tasks.group_id`)
- **Connections**: Member ↔ Mission ↔ Tasks (via memberships + group_id)
- **Events**: Mission-scoped task events (claim.created with mission context)
- **Knowledge**: Mission progress (tasks completed by mission, member contribution by mission)

### Data Flow

```
Member visits /trust-builder/missions/[id]/tasks
  → GET /api/trust-builder/missions/[id]/tasks
  → Validates: member is active member of mission (via memberships check)
  → Returns: tasks WHERE group_id = mission_id AND state = 'open'
  → Displays: List of available mission tasks with claim button

Member clicks "Claim Task" on a mission task
  → POST /api/trust-builder/tasks/[task_id]/claims
  → Creates claim with mission context in metadata
  → Logs event: claim.created (includes group_id, group_stable_id in metadata)
  → Redirects to claim submission form (existing S1-04 flow)

Member views "My Missions" on dashboard
  → GET /api/trust-builder/missions/me
  → Returns: joined missions with task progress (completed/available)
  → Shows: Mission participation overview with contribution counts
```

---

## User Story (Gherkin)

```gherkin
Given I am a Member who has joined "Webinar Series S0" mission
And that mission has 5 open tasks
When I visit /trust-builder/missions/[mission-id]
Then I see a "Tasks" tab showing the 5 mission tasks
And each task card shows:
  - Task title
  - Task description (truncated)
  - Status ("Available" or "Already Claimed")
  - "Claim Task" button (enabled if available, disabled if claimed)

When I click "Claim Task" for "Create Welcome Video"
Then the system creates a claim record with mission context
And logs event: claim.created (with group_id metadata)
And redirects me to /trust-builder/claims/[claim-id]/submit
And I complete the claim using existing submission flow (S1-04)

When I return to the mission tasks page
Then "Create Welcome Video" shows status "Claimed by You"
And the "Claim Task" button is replaced with "View My Claim"

Given I have NOT joined a mission
When I try to access /trust-builder/missions/[other-mission-id]/tasks
Then I see an informative message: "Join this mission to view available tasks"
And a "Join Mission" button linking to mission details

Given I am on my dashboard (/trust-builder/dashboard)
When I view my "My Missions" section
Then I see a list of joined missions with:
  - Mission name
  - My contributions: "3 tasks completed"
  - Available tasks: "2 tasks available"
  - Link to mission task list

# Integration with existing claim workflow
When I submit a claim for a mission task
Then the claim submission page works exactly as before (S1-04)
And the claim metadata stores group_id for mission context
And completing the claim contributes to mission progress tracking
```

---

## Acceptance Criteria

### Functional Behavior

- [ ] **AC1**: Member can view tasks for missions they've joined
- [ ] **AC2**: Member cannot view tasks for missions they haven't joined (authorization check)
- [ ] **AC3**: Task list filtered by mission shows only tasks WHERE group_id = mission_id
- [ ] **AC4**: Member can claim mission tasks using existing claim workflow
- [ ] **AC5**: Claimed tasks show "Claimed by You" status and link to claim detail
- [ ] **AC6**: Tasks claimed by other members show "Claimed" status (but not claimant name for privacy)
- [ ] **AC7**: Mission task claim creates event with group_id and group_stable_id in metadata
- [ ] **AC8**: Dashboard "My Missions" section shows task progress per mission

### API Routes

- [ ] **AC9**: `GET /api/trust-builder/missions/[id]/tasks` returns mission tasks:
  - Validates member is active member (via memberships check)
  - Returns tasks WHERE group_id = mission_id AND state = 'open'
  - Includes claim status: unclaimed, claimed_by_me, claimed_by_other

- [ ] **AC10**: `POST /api/trust-builder/tasks/[id]/claims` enhanced with mission context:
  - Validates member is active member of task's mission
  - Creates claim with group_id in metadata (if task has group_id)
  - Logs event: claim.created with mission context

- [ ] **AC11**: `GET /api/trust-builder/missions/me` returns joined missions:
  - Returns missions WHERE member has active membership
  - Includes task counts: tasks_completed, tasks_available
  - Includes member's contribution count within each mission

### Event Logging

- [ ] **AC12**: Event `claim.created` enhanced with mission metadata:
  - `entity_type: 'claim'`
  - `entity_id: <claim_id>`
  - `event_type: 'claim.created'`
  - `metadata: { task_id, task_title, member_id, member_stable_id, group_id, group_stable_id, group_name }`
  - Note: Only if task has group_id (backward compatible with non-mission tasks)

### Layout & UX (refer to `/project/trust-builder/patterns/UI-layout-pattern.md`)

- [ ] **AC13**: Mission detail page has "Tasks" tab navigation
- [ ] **AC14**: Task list uses Card grid layout (similar to mission list S4-03B)
- [ ] **AC15**: Primary action: "Claim Task" button (`variant="default"`)
- [ ] **AC16**: Mobile responsive: Cards stack on narrow screens (375px)
- [ ] **AC17**: Sanctuary messaging: Encouraging language for task selection ("Contribute to mission goals!")

### Authorization & Security

- [ ] **AC18**: Mission task list requires active membership (memberships.status = 'active')
- [ ] **AC19**: Non-members see helpful message: "Join this mission to view tasks"
- [ ] **AC20**: Claiming task validates member is active in task's mission
- [ ] **AC21**: Privacy: Other members' claim details not exposed (only show "Claimed" status)

### Integration with Existing Flows

- [ ] **AC22**: Claim submission flow (S1-04) works identically for mission tasks
- [ ] **AC23**: Review workflow (S2-04) works identically for mission task claims
- [ ] **AC24**: Trust score calculation includes mission task completions
- [ ] **AC25**: Dashboard "Recent Activity" shows mission task claims
- [ ] **AC26**: Member profile history includes mission context for claims

### Quality

- [ ] **AC27**: Keyboard navigation works (tab order: mission nav → task cards → claim buttons)
- [ ] **AC28**: Loading states: Skeleton cards while fetching mission tasks
- [ ] **AC29**: Error handling: Network errors show toast, authorization errors show helpful message

---

## Testing Schedule

**Day 5 Manual Testing** (1 hour allocated):

- Desktop: Chrome at 375px, 768px, 1024px (responsive breakpoints)
- iOS: Safari on iPhone 13+ (actual device, not simulator)
- Android: Chrome on Pixel 6+ (actual device)

**Validation**:

- All primary actions reachable without scrolling (laptop viewport baseline)
- No horizontal scroll at 375px
- Mission task flow: join mission → view tasks → claim task → complete claim
- Authorization: Cannot access mission tasks without membership

---

## Environment Setup

**Before implementation, verify**:

1. S4-03B merged to main (mission joining complete)
2. Tasks table has group_id column (check schema.sql)
3. Memberships table tracks active members (S4-03A migration)
4. Claim submission workflow functional (S1-04, S2-04)

---

## Reusable Components (from prior stories)

- **TaskCard** (S1-03): Task display with title, description, claim button
- **Card, CardHeader, CardTitle, CardContent** (S1-05): Layout containers
- **Button** (S1-04): Primary actions (`variant="default"`)
- **Badge** (S2-04): Status indicators ("Available", "Claimed")
- **Tabs** (shadcn/ui): Mission detail navigation (Overview, Tasks, Members)
- **Skeleton** (S3-02): Loading states for task list
- **Toast** (S1-04): Success/error feedback

**New Components** (if needed):

- **MissionTaskCard**: Extended TaskCard with mission context indicators

---

## Implementation Notes (AI-facing)

### Backend

**API Route**: `GET /api/trust-builder/missions/[id]/tasks`

```typescript
// Pseudo-code
1. Extract mission_id from URL params
2. Validate member is authenticated (getCurrentUser)
3. Check membership: SELECT FROM memberships WHERE member_id AND group_id AND status='active'
4. If not member: return 403 with helpful message
5. Query tasks: SELECT * FROM tasks WHERE group_id = mission_id AND state = 'open'
6. For each task, check claim status:
   - Unclaimed: No active claim
   - Claimed by me: Active claim by current member
   - Claimed by other: Active claim exists (don't expose claimant)
7. Return tasks with claim_status field
```

**Enhanced Claim Creation**: `POST /api/trust-builder/tasks/[id]/claims`

```typescript
// Pseudo-code (enhance existing endpoint from S1-04)
1. Extract task_id from URL params
2. Fetch task: SELECT group_id FROM tasks WHERE id = task_id
3. If task.group_id IS NOT NULL:
   a. Check membership: SELECT FROM memberships WHERE member_id AND group_id AND status='active'
   b. If not member: return 403 "Must join mission to claim this task"
4. Create claim (existing logic)
5. Log event with mission context if task.group_id exists:
   - metadata includes: group_id, group_stable_id, group_name
6. Return claim
```

### Frontend

**Mission Detail Page Enhancement**: Add tab navigation

```tsx
// /trust-builder/missions/[id].astro or .tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="tasks">Tasks</TabsTrigger>
    <TabsTrigger value="members">Members</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* Existing mission description, join button (S4-03B) */}
  </TabsContent>

  <TabsContent value="tasks">
    <MissionTaskList missionId={id} />
  </TabsContent>

  <TabsContent value="members">
    {/* Existing members list (S4-03B) */}
  </TabsContent>
</Tabs>
```

**MissionTaskList Component**: Fetch and display mission tasks

```tsx
// src/components/trust-builder/MissionTaskList.tsx
export function MissionTaskList({ missionId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    fetch(`/api/trust-builder/missions/${missionId}/tasks`)
      .then((res) => {
        if (res.status === 403) {
          setIsMember(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setTasks(data.tasks);
          setIsMember(true);
        }
      })
      .finally(() => setLoading(false));
  }, [missionId]);

  if (loading) return <SkeletonCards count={4} />;

  if (!isMember) {
    return (
      <Alert>
        <AlertDescription>
          Join this mission to view available tasks and start contributing!
        </AlertDescription>
        <Button variant="default" href={`/trust-builder/missions/${missionId}`}>
          Join Mission
        </Button>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClaim={() => handleClaim(task.id)}
          claimStatus={task.claim_status}
        />
      ))}
    </div>
  );
}
```

**Dashboard "My Missions" Section**: Show mission participation

```tsx
// src/components/trust-builder/MyMissions.tsx (new component)
export function MyMissions() {
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    fetch('/api/trust-builder/missions/me')
      .then((res) => res.json())
      .then((data) => setMissions(data.missions));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Missions</CardTitle>
      </CardHeader>
      <CardContent>
        {missions.map((mission) => (
          <div
            key={mission.id}
            className="flex justify-between items-center py-2"
          >
            <div>
              <h4 className="font-medium">{mission.name}</h4>
              <p className="text-sm text-muted-foreground">
                {mission.tasks_completed} tasks completed •{' '}
                {mission.tasks_available} available
              </p>
            </div>
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
  );
}
```

---

## Definition of Done (DoD)

- [ ] All 29 acceptance criteria met
- [ ] QA report: PASS (all ACs validated)
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Retro file created: `/project/trust-builder/retros/story-S4-04-mission-task-management-retro.md`
- [ ] Day 5 manual testing completed (mission task flow on real devices)
- [ ] No regression in existing claim submission workflow (S1-04, S2-04)

---

## Success Metrics

### Functional

- Member can navigate: mission list → join mission → view mission tasks → claim task → complete claim
- Authorization enforced: Only active mission members can view/claim mission tasks
- Mission context preserved through entire claim workflow
- Events logged with mission metadata (group_id, group_stable_id)

### UX

- Task discovery improved: Members see relevant tasks scoped to their missions
- Progress visibility: Dashboard shows contribution per mission
- Sanctuary culture: Encouraging messaging for task selection and contribution

### Technical

- Zero schema changes (leverages existing tasks.group_id)
- Backward compatible: Non-mission tasks (group_id = NULL) still work
- Event system enhanced: Mission context captured without breaking existing events
- Component reuse: TaskCard, Card, Button, Badge all reused from prior stories

---

## Migration Readiness Impact

**Pre-S4-04**: 96%  
**Post-S4-04**: **98%** (+2 points)

**Enhancements**:

- Mission-scoped events enable granular attestations ("Contributed to Webinar Series S0")
- Task completion attestations include mission context for blockchain portability
- Member contribution history segmented by mission (clearer proof of specialized work)

---

## Risks & Mitigation

### Risk 1: Authorization Complexity

**Risk**: Checking memberships for every task access could be slow or error-prone.

**Mitigation**:

- Index on memberships(member_id, group_id, status) already exists (S4-03A)
- Authorization check is single query: `SELECT 1 FROM memberships WHERE...`
- Cache membership status in JWT claims if performance becomes issue

### Risk 2: Backward Compatibility

**Risk**: Existing tasks without group_id (non-mission tasks) might break.

**Mitigation**:

- API gracefully handles tasks.group_id IS NULL (skip mission validation)
- Event logging conditional: only add group metadata if group_id exists
- UI shows "General tasks" section for non-mission tasks

### Risk 3: UX Confusion

**Risk**: Members might not understand mission-scoped tasks vs general tasks.

**Mitigation**:

- Clear tab navigation: "Mission Tasks" vs "All Tasks"
- Badge indicators: "Mission: Webinar Series S0" on task cards
- Onboarding tooltip: "Join missions to access mission-specific tasks"

---

## Dependencies

### Upstream (Must Complete Before S4-04)

- ✅ **S4-03B**: Mission joining complete (members can join missions)
- ✅ **S4-03A**: Memberships table tracks active members
- ✅ **S1-04**: Claim submission workflow exists
- ✅ **S2-04**: Peer review workflow exists
- ✅ **Original Schema**: tasks.group_id field exists

### Downstream (Unblocked by S4-04)

- **S4-05: Mission Activity Feed** (3 points) - Show mission-scoped event stream
- **S4-06: Mission Completion/Archival** (2 points) - Admin workflow to close missions
- **S5-02: Peer Recognition within Missions** (5 points) - Mission-scoped kudos

---

## Open Questions for Strategic Review

1. **Task Visibility**: Should members see mission tasks before joining (read-only), or only after joining?
   - **Recommendation**: Show read-only preview to encourage joining (transparency)

2. **Task Assignment**: Should admins be able to assign tasks to specific mission members, or keep it voluntary claim?
   - **Recommendation**: Keep voluntary for Season 0 (sanctuary culture: autonomy), add assignment in Season 1

3. **Mission Task Limits**: Should there be a limit on how many mission tasks a member can claim at once?
   - **Recommendation**: Reuse existing claim limits (if any), no mission-specific limits yet

4. **Non-Mission Tasks**: How should we handle existing tasks without group_id?
   - **Recommendation**: Show in separate "General Tasks" section, clearly distinguished from mission tasks

---

## Notes for Retro-Facilitator

**Key Patterns to Evaluate**:

- Mission-scoped authorization (memberships check for task access)
- Event metadata enhancement (adding group context without breaking existing events)
- Tab navigation pattern for multi-faceted mission views
- Backward compatibility handling (tasks with/without group_id)

**Success Indicators**:

- Zero schema changes (validates existing design decisions)
- Smooth integration with existing claim workflow (no regression)
- Clear UX for mission vs general tasks (user feedback)

**Process Observations**:

- Did S4-03A/S4-03B schema foundation work pay off? (tasks.group_id usable immediately)
- How effective was component reuse? (TaskCard, Card, Button patterns)
- Was story complexity estimate accurate? (5 points = 6-8 hours?)

---

**Story Status**: 📝 DRAFTED  
**Next Step**: Pre-implementation strategic review (product-advisor, 45 minutes)  
**Handoff**: fullstack-developer (after review approval)
