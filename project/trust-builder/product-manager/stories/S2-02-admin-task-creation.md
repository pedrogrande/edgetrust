# Story: Admin Task Creation (Draft to Open)

## Goal

Allow admins to create tasks in Draft state and publish them to Open with immutability locking of core fields.

## Complexity (for AI)

Complex

## Ontology Mapping

- Groups: Assign task to a Mission (group_id foreign key restricted to type='mission')
- People: Admin actor (Guardian role) creates and publishes tasks, actor_id tracked in events
- Things: Task, Criteria, Incentives (new records with version=1)
- Connections: TaskIncentives and Criteria associations (atomic creation in transaction)
- Events: `task.created` (on draft save), `task.published` (on state transition), both include actor_id and task metadata
- Knowledge: None

## User Story (Gherkin)

Given a Guardian is signed in
When they create a task in Draft state with criteria and incentives
Then the task is saved but not visible to members
And a `task.created` event is logged with Guardian's actor_id
And when the Guardian publishes the task
Then it transitions to Open state and immutable core fields are locked
And a `task.published` event is logged with Guardian's actor_id and task metadata
And any attempt to edit immutable fields returns HTTP 409 with sanctuary-aligned explanation

## Acceptance Criteria

- [ ] Guardian can create a task in Draft state with title, rationale, description, criteria, and incentives
- [ ] Draft tasks are not visible in public task lists (filtered by state != 'draft')
- [ ] Guardian can publish a Draft task to Open (draft → open state transition)
- [ ] Once Open, immutable fields are locked: title, rationale, description, task_type, verification_method, criteria (all fields), task_incentives (all rows)
- [ ] Mutable fields after Open: state (open → expired/cancelled only), max_completions (increase only), updated_at (automatic)
- [ ] Attempts to edit immutable fields on Open tasks return HTTP 409 with sanctuary-aligned message explaining contract integrity
- [ ] `task.created` event logged when draft is first saved (POST /admin/tasks)
- [ ] `task.published` event logged when draft transitions to open (PATCH /admin/tasks/:id/publish)
- [ ] Events include actor_id and metadata: {task_id, title, group_id, criteria_count, total_points, state}
- [ ] Publish operation checks current state and returns 409 if already published (race condition protection)
- [ ] Role guard middleware protects admin endpoints (Guardian role only, returns HTTP 403 for non-Guardians)
- [ ] Transaction ensures atomic creation (task + criteria + task_incentives together or rollback)
- [ ] Validation errors use sanctuary-aligned language with explanations and actionable guidance
- [ ] Mobile and basic accessibility checks pass

## Implementation Notes (AI-facing)

### API Endpoints

- `POST /api/trust-builder/admin/tasks` — Create draft task with criteria and incentives
- `PATCH /api/trust-builder/admin/tasks/[id]/publish` — Publish draft to open (state transition only)
- `GET /api/trust-builder/admin/tasks` — List all tasks including drafts (Guardian-only)

### Admin UI

- Add admin UI under `src/pages/trust-builder/admin/tasks`.
- UI can be minimal for S2-02 (single form with dynamic criteria/incentive rows).
- Enhanced task builder with templates is future enhancement.
- Show state clearly: "This task is in Draft. It is not visible to members yet."
- Show immutability warning before publish: "Once published, this task becomes a contract. Title, criteria, and incentives cannot be changed."
- Add preview button: "Preview as member would see it"
- Add publish confirmation: "Are you sure? This cannot be undone."

### Technical Requirements

**EventType Enum**: Check `src/lib/events/types.ts` and add if missing:
- `EventType.TASK_CREATED`
- `EventType.TASK_PUBLISHED`

**Transaction Pattern**: Use `withTransaction()` for atomic task creation:
```typescript
await withTransaction(dbUrl, async (client) => {
  // 1. INSERT task (with created_by = current member.id)
  // 2. INSERT criteria[] (with task_id foreign key)
  // 3. INSERT task_incentives[] (with task_id foreign key)
  // 4. INSERT task.created event (with actor_id, task metadata)
  return task;
});
```

**Role Guard Middleware**: Create `requireRole('guardian')` helper:
```typescript
export async function requireRole(request: Request, sql: any, role: string) {
  const member = await getCurrentUser(request, sql);
  if (!member || member.role !== role) {
    throw new Error('Insufficient permissions');
  }
  return member;
}
```
Apply to all admin API endpoints. Return HTTP 403 with sanctuary-aligned message.

**Immutability Checks**: Before any UPDATE on tasks table:
```typescript
if (existingTask.state === 'open' && isImmutableFieldChanged(existingTask, updates)) {
  return new Response(JSON.stringify({
    error: 'This task has been published and cannot be edited. Core contract terms are locked to ensure fairness for members who already claimed it.',
  }), { status: 409 });
}
```

**Race Condition Protection**: Publish endpoint:
```typescript
const result = await sql`
  UPDATE tasks 
  SET state = 'open', published_at = NOW(), updated_at = NOW()
  WHERE id = ${taskId} AND state = 'draft'
  RETURNING *
`;
if (result.length === 0) {
  return new Response(JSON.stringify({
    error: 'This task has already been published or does not exist.',
  }), { status: 409 });
}
```

**Event Metadata Structure**:
```typescript
{
  task_id: task.id,
  title: task.title,
  group_id: task.group_id,
  criteria_count: criteria.length,
  total_points: sumOf(taskIncentives.points),
  actor_id: member.id,
  state: task.state
}
```

**Version Field**: Set `version = 1` for all new tasks. Versioning is future enhancement.

**Group Type Restriction**: Validate `group_id` references a Mission:
```typescript
const group = await sql`SELECT type FROM groups WHERE id = ${groupId}`;
if (group[0]?.type !== 'mission') {
  throw new Error('Tasks must be assigned to a Mission, not a Colony.');
}
```

## Immutability Policy

### Fields Immutable Once Open (Contract Terms)

- `title` — Task name cannot change (members rely on it)
- `rationale` — Purpose/context cannot change (contract basis)
- `description` — Implementation details locked (fairness)
- `task_type` — Simple/complex designation locked
- `verification_method` — Auto-approve/peer-review/admin-review locked
- `criteria.*` — All acceptance criteria fields locked (contract terms)
- `task_incentives.*` — All incentive allocations locked (promised rewards)
- `created_by` — Original author locked (audit trail)
- `created_at` — Creation timestamp locked (historical record)
- `published_at` — Publication timestamp locked (contract start)

### Fields Mutable Even When Open (Operational)

- `state` — Can transition: open → expired (time-based) or open → cancelled (admin only)
- `max_completions` — Can increase (expand supply) but never decrease (preserve existing claims)
- `updated_at` — Automatically updated on any change

### Forbidden State Transitions

- open → draft (cannot unpublish)
- Any state → in_progress (only claims can be in_progress, not tasks)

---

## Sanctuary-Aligned Error Message Examples

### Role Permission Errors

❌ **Technical**: "Forbidden: role check failed"  
✅ **Sanctuary**: "Only Guardians can create tasks. Your role is Explorer. Contact a Guardian if you'd like to discuss task ideas for the community."

❌ **Technical**: "403 Unauthorized"  
✅ **Sanctuary**: "This area is for Guardians who coordinate community activities. Your current role doesn't include task creation. Reach out to a Guardian for access."

### Validation Errors

❌ **Technical**: "Invalid input: criteria array cannot be empty"  
✅ **Sanctuary**: "Tasks need at least one acceptance criterion to be meaningful. This helps members know what success looks like. Please add criteria before saving."

❌ **Technical**: "Constraint violation: incentives must sum to positive value"  
✅ **Sanctuary**: "Tasks should offer at least some points in one of the five dimensions (Participation, Collaboration, Innovation, Leadership, Impact). This recognizes member contributions. Please add incentive points."

### Immutability Errors

❌ **Technical**: "Invalid: state transition not allowed"  
✅ **Sanctuary**: "This task has been published and cannot be edited. Core contract terms are locked to ensure fairness for members who already claimed it. If you need to make changes, consider cancelling this task and creating a new version."

❌ **Technical**: "Constraint violation: immutable field modified"  
✅ **Sanctuary**: "Once published, task titles and criteria cannot change. This protects members who are already working on this task. The field you tried to edit ('title') is part of the contract terms."

### Race Condition Errors

❌ **Technical**: "Conflict: resource already modified"  
✅ **Sanctuary**: "This task has already been published by another Guardian. Refresh the page to see the current state."

### Business Logic Errors

❌ **Technical**: "FK constraint: invalid group_id"  
✅ **Sanctuary**: "Tasks must be assigned to a Mission, not a Colony. Colonies are organizational containers, while Missions have specific goals where tasks belong. Please select a Mission from the dropdown."

---

## Definition of Done (DoD)

- All acceptance criteria met
- QA report: PASS
- Product Advisor review: Grade B+ or higher
- Retro file created in `/trust-builder/retros/`
