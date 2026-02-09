# Story S1-03: Public Task List & Mission Pages

**Sprint**: 1  
**Story ID**: S1-03  
**Depends on**: S1-01 (Schema & Seed)  
**Blocks**: S1-04 (Claim Submission)  
**Created**: 2026-02-09

---

## Goal

Enable **anyone** (authenticated or not) to discover Trust Builder missions and browse available tasks with full transparency about incentives and requirements. This creates immediate visible value for external visitors and webinar attendees, demonstrating the platform's opportunity marketplace before requiring sign-in.

---

## Complexity (for AI)

**Simple** — Pure read operations with straightforward SSR rendering. No auth gates, no writes, minimal business logic.

---

## Ontology Mapping

- **Groups**: Display Mission metadata (name, description, status) from `groups` table where `type = 'mission'`
- **People**: None (public view, no identity required)
- **Things**: Display Task metadata (title, description, state, task_type) from `tasks` table where `state = 'open'`
- **Connections**: Read `task_incentives` join to show value per task; read `memberships` count (future enhancement — not S1)
- **Events**: None (read-only view generates no state changes)
- **Knowledge**: Aggregate incentive totals per task; display mission/task counts

---

## User Story (Gherkin)

### Scenario 1: Browse Available Tasks

```gherkin
Given I visit /trust-builder/tasks (unauthenticated)
When the page loads
Then I see a list of all Open tasks
And each task displays:
  - Task title
  - Parent mission name
  - Task type badge (e.g., "Simple", "Complex")
  - Incentive dimension badges (e.g., "Participation", "Innovation")
  - Total point value (sum of all incentives)
And tasks are sorted by most recent published_at first
And the page renders within 2 seconds on a slow 3G connection
```

### Scenario 2: Filter Tasks by Mission

```gherkin
Given I am viewing the task list
When I select "Webinar Series Season 0" from the mission filter dropdown
Then only tasks belonging to that mission are displayed
And the filter persists in URL query params (?mission=uuid)
And I can click "Clear filters" to see all tasks again
```

### Scenario 3: View Task Details (Read-Only Preview)

```gherkin
Given I click on a task card
When /trust-builder/tasks/[id] loads
Then I see:
  - Full task description
  - All acceptance criteria
  - Incentive breakdown table
  - "Sign in to claim this task" button (for unauthenticated users)
  - "Submit a Claim" button (for authenticated users — actual claim flow is S1-04)
And the button behavior:
  - Unauthenticated: redirects to /trust-builder/signin
  - Authenticated: enables claim submission (S1-04 will implement)
```

### Scenario 4: Mission Hub Page

```gherkin
Given I visit /trust-builder
When the page loads
Then I see:
  - Trust Builder hero section explaining Season 0
  - Active missions grid (cards showing mission name, task count, total points available)
  - "Explore Tasks" CTA button linking to /trust-builder/tasks
And if authenticated, I also see:
  - "View Your Dashboard" button (links to /trust-builder/dashboard)
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] **AC-1 (Data Accuracy)**: `/api/trust-builder/tasks` returns all tasks where `state = 'open'`, joined with mission metadata and incentive totals
- [ ] **AC-2 (Incentive Clarity)**: Each task displays incentive badges for each dimension with point values (e.g., "Participation 50 pts", "Innovation 10 pts")
- [ ] **AC-3 (Mission Filter)**: Tasks can be filtered by mission via dropdown; filter state persists in URL
- [ ] **AC-4 (Public Access)**: All pages load without authentication; no session checks required
- [ ] **AC-5 (Progressive Enhancement)**: Sign-in CTAs adapt based on auth state (read from session cookie if present, show "Submit Claim" for authenticated users)

### Ontology Compliance

- [ ] **OC-1**: `groups` table is queried for mission metadata (no hardcoded mission names)
- [ ] **OC-2**: Task types are rendered from DB enum values, not re-invented client-side
- [ ] **OC-3**: Incentive dimensions use the 5 seeded types (Participation, Collaboration, Innovation, Leadership, Impact) — no new dimensions introduced

### Technical Quality

- [ ] **TQ-1**: TypeScript types imported from `src/types/trust-builder.ts` (no inline type definitions)
- [ ] **TQ-2**: API endpoints return proper HTTP status codes (200 for success, 404 for not found)
- [ ] **TQ-3**: React components use `client:load` directive only where interactivity is required (filter dropdown, not static cards)
- [ ] **TQ-4**: Astro pages use SSR (`output: 'server'` already configured) to fetch data at request time

### User Experience

- [ ] **UX-1**: Mobile-responsive layout (task cards stack on small screens, grid on desktop)
- [ ] **UX-2**: Task cards have hover states and clear clickable areas
- [ ] **UX-3**: Loading states for page navigation (Astro's built-in transitions or simple spinner)
- [ ] **UX-4**: Empty state message if no tasks exist: "No tasks available yet. Check back soon!"

---

## Implementation Notes (AI-Facing)

### File Structure

Create these files:

```
src/
  pages/
    trust-builder/
      index.astro          # Mission hub landing page
      tasks.astro          # Task list page
      tasks/
        [id].astro         # Task detail page
    api/
      trust-builder/
        tasks.ts           # GET: list tasks with filters
        missions.ts        # GET: list active missions
        tasks/
          [id].ts          # GET: single task detail
  components/
    trust-builder/
      TaskCard.tsx         # Display task summary (title, mission, incentives, total)
      TaskFilter.tsx       # Mission dropdown filter (client:load)
      TaskList.tsx         # Grid/list container for TaskCards
      IncentiveBadge.tsx   # Reusable pill for incentive dimensions
      MissionCard.tsx      # Display mission summary on hub page
```

### API Endpoint Details

#### `GET /api/trust-builder/tasks`

Query params:

- `mission` (optional UUID): filter by mission
- `sort` (optional): default `published_at DESC`

Response schema:

```typescript
{
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    task_type: 'simple' | 'moderate' | 'complex';
    max_completions: number | null;
    mission: {
      id: string;
      name: string;
    };
    incentives: Array<{
      name: string;
      points: number;
    }>;
    total_points: number;
    published_at: string;
  }>;
}
```

SQL hint:

```sql
SELECT
  t.id, t.title, t.description, t.task_type, t.max_completions, t.published_at,
  g.id AS mission_id, g.name AS mission_name,
  json_agg(json_build_object('name', i.name, 'points', ti.points)) AS incentives,
  SUM(ti.points) AS total_points
FROM tasks t
JOIN groups g ON t.group_id = g.id
LEFT JOIN task_incentives ti ON t.id = ti.task_id
LEFT JOIN incentives i ON ti.incentive_id = i.id
WHERE t.state = 'open'
  AND ($1::uuid IS NULL OR t.group_id = $1)
GROUP BY t.id, g.id
ORDER BY t.published_at DESC;
```

#### `GET /api/trust-builder/missions`

Response schema:

```typescript
{
  missions: Array<{
    id: string;
    name: string;
    description: string;
    task_count: number;
    total_points_available: number;
  }>;
}
```

SQL hint: Aggregate task counts and points per mission.

#### `GET /api/trust-builder/tasks/[id]`

Response schema:

```typescript
{
  task: {
    id: string;
    title: string;
    description: string;
    task_type: 'simple' | 'moderate' | 'complex';
    max_completions: number | null;
    state: 'open' | 'draft' | 'complete';
    mission: {
      id: string;
      name: string;
    }
    criteria: Array<{
      id: string;
      description: string;
      proof_type: 'text' | 'url' | 'file';
      verification_method: 'auto-approve' | 'peer-review' | 'admin-review';
      sort_order: number;
    }>;
    incentives: Array<{
      name: string;
      points: number;
    }>;
    total_points: number;
  }
}
```

### Component Patterns

**TaskCard.tsx** (static, no `client:load` needed):

```tsx
export function TaskCard({ task }: { task: TaskSummary }) {
  return (
    <a href={`/trust-builder/tasks/${task.id}`} className="...">
      <h3>{task.title}</h3>
      <p className="text-muted-foreground">{task.mission.name}</p>
      <div className="flex gap-2">
        {task.incentives.map((inc) => (
          <IncentiveBadge key={inc.name} name={inc.name} points={inc.points} />
        ))}
      </div>
      <div className="font-semibold">{task.total_points} points total</div>
    </a>
  );
}
```

**TaskFilter.tsx** (interactive, needs `client:load`):

```tsx
export function TaskFilter({ missions, selected }: FilterProps) {
  const handleChange = (missionId: string) => {
    const url = new URL(window.location.href);
    if (missionId) {
      url.searchParams.set('mission', missionId);
    } else {
      url.searchParams.delete('mission');
    }
    window.location.href = url.toString(); // Simple, no SPA routing needed
  };

  return (
    <Select value={selected} onValueChange={handleChange}>
      {/* shadcn Select component */}
    </Select>
  );
}
```

### Styling Guidelines

- Use existing shadcn components: `Card`, `Badge`, `Button`, `Select`
- Color tokens:
  - Participation: `bg-blue-500`
  - Collaboration: `bg-green-500`
  - Innovation: `bg-purple-500`
  - Leadership: `bg-orange-500`
  - Impact: `bg-red-500`
- Responsive breakpoints: `sm:grid-cols-2 lg:grid-cols-3` for task grid

### Testing Checklist (for QA Engineer)

- [ ] Visit `/trust-builder` while logged out → see mission hub
- [ ] Visit `/trust-builder/tasks` while logged out → see all Open tasks
- [ ] Filter by "Webinar Series Season 0" → only those tasks show
- [ ] Click on "Attend Live Webinar" task → see full details with 2 criteria
- [ ] Verify "Sign in to claim" button appears when not authenticated
- [ ] Sign in, then revisit task detail → verify button text changes to "Submit Claim" (but clicking does nothing yet — S1-04 will add the form)
- [ ] Mobile test: responsive breakpoints work on 375px viewport

---

## Definition of Done (DoD)

### Implementation Complete

- [ ] All files created and committed
- [ ] TypeScript compilation successful (`pnpm exec tsc --noEmit`)
- [ ] No ESLint warnings
- [ ] All API endpoints return correct responses (validated with curl or Postman)

### QA Validation

- [ ] All 5 acceptance criteria validated by `qa-engineer`
- [ ] QA report created in `/project/trust-builder/product-manager/` with PASS status
- [ ] No critical or high-severity bugs found

### Product Advisor Review

- [ ] Ontology alignment reviewed by `product-advisor`
- [ ] Grade of B+ or higher
- [ ] Feedback documented in `/project/trust-builder/product-manager/advisor-feedback/`

### Retrospective

- [ ] `retro-facilitator` creates `story-S1-03-public-task-list-retro.md` in `/project/trust-builder/retros/`
- [ ] Lessons learned captured
- [ ] Action items identified for S1-04

---

## Dependencies & Blockers

### Depends On (Must Be Complete)

- ✅ S1-01: Schema & Seed Data (DONE)

### Blocks (Cannot Start Until This Is Done)

- S1-04: Claim Submission (needs task detail pages and "Submit Claim" entry point)

### External Dependencies

- None — uses existing DB, Astro SSR, React components, shadcn UI

---

## Risks & Mitigations

| Risk                                       | Probability | Impact | Mitigation                                                              |
| ------------------------------------------ | ----------- | ------ | ----------------------------------------------------------------------- |
| NeonDB query performance on JOIN-heavy SQL | Low         | Medium | Use `LEFT JOIN` only where needed; test with 50+ tasks to verify speed  |
| Mission filter URL state gets out of sync  | Low         | Low    | Use simple page reload on filter change (no client-side routing needed) |
| Empty state confuses users                 | Medium      | Low    | Add clear empty state message with CTA to "Check back soon"             |
| Task card overflow with long titles        | Low         | Low    | Use `line-clamp-2` on titles, full text on detail page                  |
| Auth state detection fails in SSR          | Low         | Medium | Use `getCurrentUser()` helper from S1-02; handle null gracefully        |

---

## Success Metrics (for Product Owner)

After S1-03 is deployed:

- Webinar attendees can browse tasks **before** signing in (reduces friction)
- Task list page becomes the primary discovery surface (SEO-friendly, public)
- "Attend Live Webinar" task becomes the most-viewed task (validate with future analytics)
- Member acquisition: "Sign in to claim" CTA drives sign-ups from task detail pages

---

## Notes

- This story intentionally does **not** implement claim submission (that's S1-04)
- The "Submit Claim" button on task detail pages will show for authenticated users but won't open a form until S1-04
- Mission join flow is deferred to S2 — S1 members can claim tasks without joining missions (membership entries created implicitly on first claim)
- No member-specific data displayed on public pages (leaderboards, recent claims, etc. — those are dashboard features in S1-05)

---

**Ready for handoff to `fullstack-developer`** 🚀
