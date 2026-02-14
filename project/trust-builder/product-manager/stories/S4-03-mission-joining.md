# Story S4-03: Mission Joining Workflow

**Epic**: Member Experience - Mission Lifecycle  
**Priority**: HIGH (first new member-facing feature since S3-02)  
**Sprint**: 4  
**Estimated Points**: 8  
**Complexity**: Complex  
**Assigned To**: fullstack-developer  
**Strategic Review**: ✅ MANDATORY (90 minutes, Feb 15 AM - new entity validation)

---

## Goal

Enable members to browse available missions, view mission details, and join missions they're eligible for (Trust Score threshold only). This establishes the foundation for mission-based organization and member progression tracking.

**Value for Members**: Clear path to participate, see available opportunities, track mission membership  
**Value for Organization**: Mission-based member organization, eligibility automation, engagement tracking  
**Value for Migration**: Mission join events create portable attestations for "founding member" status

---

## Complexity (for AI)

**Complex** (10-12 hours)

**Rationale**:

- New entity type (Missions) requires schema design and validation
- Multiple ontology dimensions (Groups + People + Connections + Events + Knowledge)
- List + detail UI pattern with filtering/sorting (moderate layout complexity)
- Eligibility logic with Trust Score checking
- Join/leave workflows with event logging
- Navigation integration (mission context throughout app)
- First implementation of Groups dimension beyond Colony root

**Strategic Pre-Review Required**: 90 minutes, Feb 15 morning

- Mission schema validation against ontology
- Eligibility logic review
- Sanctuary culture messaging review
- Event structure for join/leave validation

---

## Ontology Mapping

### Primary Dimensions

- **Groups**: Mission as Groups entity (organizational container for tasks)
- **People**: Member as People entity (actors joining missions)
- **Connections**: `mission_members` as Connection entity (member-mission relationship)
- **Events**: Join event, leave event, eligibility check events
- **Knowledge**: Mission metadata (description, requirements, member count, task count)

### Secondary Dimensions

- **Things**: Mission status (active/paused), membership status (active/left)

### Data Flow

```
Member visits /trust-builder/missions
  → Fetches all active missions with metadata (member count, Trust Score requirement)
  → Displays list with eligibility indicator (checkmark or "X more points needed")
Member clicks "View Details" for Mission A
  → Displays mission description, requirements, current members, associated tasks
  → Shows "Join Mission" button IF eligible (trust_score >= mission.min_trust_score)
Member clicks "Join Mission"
  → POST /api/trust-builder/missions/{id}/join
  → INSERT mission_members (member_id, mission_id, role='Member', joined_at=NOW())
  → INSERT events (mission.member_joined, with metadata)
  → Success message: "Welcome to [Mission Name]! Check out available tasks."
Member clicks "Leave Mission" (on mission detail page)
  → POST /api/trust-builder/missions/{id}/leave
  → UPDATE mission_members SET left_at=NOW(), status='left'
  → INSERT events (mission.member_left, with metadata)
  → Success message: "You've left [Mission Name]. You can rejoin anytime."
```

---

## User Story (Gherkin)

```gherkin
Given I am a Member with 300 Trust Score
When I visit /trust-builder/missions
Then I see a list of active missions with:
  - Mission name
  - Short description
  - Member count (e.g., "42 members")
  - Eligibility indicator (✓ if eligible, "50 more points needed" if not)

When I click "View Details" for "Webinar Series S0"
Then I see:
  - Full mission description
  - Requirements: "250+ Trust Score required"
  - Current members (avatars or list)
  - Associated tasks count: "12 tasks available"
  - "Join Mission" button (enabled, since I have 300 > 250)

When I click "Join Mission"
Then the system creates mission_members record
And logs event: mission.member_joined
And I see success message: "Welcome to Webinar Series S0!"
And the button changes to "Leave Mission"

When I visit the mission detail page again
Then I see "Leave Mission" button
And I see my name in the members list

When I click "Leave Mission"
Then the system updates mission_members (sets left_at)
And logs event: mission.member_left
And I see message: "You've left Webinar Series S0. You can rejoin anytime."

Given I am a Member with 150 Trust Score
When I view a mission requiring 250 Trust Score
Then the "Join Mission" button is disabled
And I see: "You need 100 more Trust Points to join this mission"
And I see: "Keep completing tasks to increase your Trust Score!"
```

---

## Acceptance Criteria

### Database Schema

- [ ] **AC1**: `missions` table created with columns:
  - `id` (UUID PRIMARY KEY)
  - `mission_id` (TEXT UNIQUE, format: FE-M-XXXXX, stable identifier)
  - `name` (TEXT NOT NULL)
  - `description` (TEXT)
  - `status` (TEXT DEFAULT 'active', values: active/paused/completed)
  - `min_trust_score` (INTEGER DEFAULT 0, eligibility threshold)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

- [ ] **AC2**: `mission_members` table created (Connection entity):
  - `id` (UUID PRIMARY KEY)
  - `mission_id` (UUID REFERENCES missions, NOT NULL)
  - `member_id` (UUID REFERENCES members, NOT NULL)
  - `role` (TEXT DEFAULT 'Member', values: Member/Leader)
  - `joined_at` (TIMESTAMPTZ DEFAULT NOW())
  - `left_at` (TIMESTAMPTZ NULL)
  - `status` (TEXT DEFAULT 'active', values: active/left)
  - UNIQUE constraint on (mission_id, member_id) WHERE status='active'

- [ ] **AC3**: Seed data includes 2-3 missions:
  - "Webinar Series S0" (min_trust_score: 0, starter mission)
  - "Content Creation" (min_trust_score: 250, intermediate)
  - "Platform Development" (min_trust_score: 500, advanced)

### Functional Behavior

- [ ] **AC4**: Member can browse all active missions (list view)
- [ ] **AC5**: Member can view mission details (detail view)
- [ ] **AC6**: Member can join mission IF trust_score >= mission.min_trust_score
- [ ] **AC7**: Member cannot join mission if ineligible (button disabled, helpful message shown)
- [ ] **AC8**: Member can leave mission voluntarily (no questions, no penalty)
- [ ] **AC9**: Member cannot join same mission twice (UI prevents, API validates)
- [ ] **AC10**: Join/leave actions are atomic (transaction with event logging)

### Event Logging

- [ ] **AC11**: Event `mission.member_joined` logged with metadata:
  - `mission_id`, `mission_name`, `member_id`, `member_trust_score`, `joined_at`
- [ ] **AC12**: Event `mission.member_left` logged with metadata:
  - `mission_id`, `mission_name`, `member_id`, `left_at`, `days_active` (duration)
- [ ] **AC13**: Event `mission.eligibility_checked` logged when member views mission details:
  - `mission_id`, `member_id`, `trust_score`, `required_score`, `eligible` (boolean)

### Layout & UX (refer to `/project/trust-builder/patterns/UI-layout-pattern.md`)

- [ ] **AC14**: List + detail pattern applied:
  - List view (left/top): Mission cards with key info (name, member count, eligibility)
  - Detail view (right/bottom): Full description, members, tasks, join button
- [ ] **AC15**: One clear primary action per screen: "Join Mission" button (`variant="default"`)
- [ ] **AC16**: Related elements visually grouped: Mission metadata in Card sections (description, requirements, members)
- [ ] **AC17**: Information hierarchy obvious: Mission name and eligibility status visible without scrolling
- [ ] **AC18**: Mobile responsive (375px): List view and detail view stack vertically, cards don't overflow
- [ ] **AC19**: Sanctuary feel: Comfortable spacing, ineligibility messages encouraging (not harsh)

### Sanctuary Culture

- [ ] **AC20**: Ineligibility messaging supportive:
  - ✓ "You need 100 more Trust Points to join. Keep completing tasks!"
  - ✗ "You don't qualify for this mission."
- [ ] **AC21**: Leave action non-punitive:
  - No Trust Score deduction
  - Can rejoin immediately if eligible
  - Message: "You can rejoin anytime" (not "Are you sure?")
- [ ] **AC22**: Progress indicators motivational:
  - "You're 80% of the way there!" if 200/250 points
  - Show path to eligibility clearly

### Quality

- [ ] **AC23**: Keyboard navigation works (tab order: list → detail → join button)
- [ ] **AC24**: Error handling: Network errors show friendly messages ("Couldn't load missions. Try again?")
- [ ] **AC25**: Loading states: Skeleton cards while fetching missions
- [ ] **AC26**: Optimistic UI: Join button disabled immediately on click (prevents double-join)

---

## Testing Schedule (for UI stories)

**Day 5 Manual Testing** (Feb 17, 1 hour allocated):

- Desktop: Chrome at 375px, 768px, 1024px (responsive breakpoints)
- iOS: Safari on iPhone 13+ (actual device, not simulator)
- Android: Chrome on Pixel 6+ (actual device)

**Validation**:

- Mission list and detail reachable without scrolling (laptop viewport)
- No horizontal scroll at 375px (mobile)
- Join button ≥44px touch target (mobile accessibility)
- Focus order matches visual order: List → Detail → Join button
- Eligibility messages readable on mobile (no text cutoff)

---

## Environment Setup

**Before implementation, verify**:

1. Run `echo $DATABASE_URL` in terminal where dev server runs
2. Confirm database matches expected environment (dev branch vs production)
3. Document which database is being used for this story

**Expected**: Production database for dev server (per S3 learnings)

---

## Reusable Components (from prior stories)

- `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>` (S1-05): Layout structure
- `<Button>` (S1-04): Primary action, secondary actions
- `<Badge>` (S3-02): Eligibility indicators, member count
- `<Separator>` (S2-02): Visual grouping in detail view
- `useToast` hook (S1-04): Success/error notifications
- List + detail layout skeleton (S2-04 review queue): Adapt for missions

---

## Implementation Notes (AI-facing)

### Tech Stack Specifics

**Database Migration** (`src/lib/db/migrations/009_missions.sql`):

```sql
-- Missions table (Groups entity)
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id TEXT UNIQUE NOT NULL, -- FE-M-00001 format
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  min_trust_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mission members junction table (Connection entity)
CREATE TABLE IF NOT EXISTS mission_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Member' CHECK (role IN ('Member', 'Leader')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'left')),
  UNIQUE (mission_id, member_id) -- Prevent duplicate active memberships
);

-- Index for queries
CREATE INDEX idx_mission_members_member ON mission_members(member_id) WHERE status = 'active';
CREATE INDEX idx_mission_members_mission ON mission_members(mission_id) WHERE status = 'active';

-- Seed missions
INSERT INTO missions (mission_id, name, description, min_trust_score, status) VALUES
  ('FE-M-00001', 'Webinar Series S0', 'Participate in the 8-week webinar series. Attend sessions, complete reflections, engage with peers.', 0, 'active'),
  ('FE-M-00002', 'Content Creation', 'Create educational content for Future''s Edge. Write articles, produce videos, design graphics.', 250, 'active'),
  ('FE-M-00003', 'Platform Development', 'Contribute to Trust Builder development. Code features, write tests, review PRs.', 500, 'active')
ON CONFLICT (mission_id) DO NOTHING;
```

**API Routes**:

`GET /api/trust-builder/missions` - List all active missions with metadata

```typescript
export async function GET({ locals }: APIContext) {
  const member = locals.member;

  const { rows: missions } = await db.query(
    `
    SELECT 
      m.id,
      m.mission_id,
      m.name,
      m.description,
      m.min_trust_score,
      (SELECT COUNT(*) FROM mission_members mm WHERE mm.mission_id = m.id AND mm.status = 'active') as member_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.mission_id = m.id AND t.status = 'open') as task_count,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM mission_members mm 
          WHERE mm.mission_id = m.id AND mm.member_id = $1 AND mm.status = 'active'
        ) THEN true 
        ELSE false 
      END as is_member
    FROM missions m
    WHERE m.status = 'active'
    ORDER BY m.min_trust_score ASC, m.name ASC
  `,
    [member.id]
  );

  return new Response(JSON.stringify({ missions }), { status: 200 });
}
```

`GET /api/trust-builder/missions/[id]` - Mission detail with members

```typescript
export async function GET({ params, locals }: APIContext) {
  const { id } = params;
  const member = locals.member;

  const {
    rows: [mission],
  } = await db.query(
    `
    SELECT 
      m.*,
      (SELECT COUNT(*) FROM mission_members mm WHERE mm.mission_id = m.id AND mm.status = 'active') as member_count,
      CASE 
        WHEN EXISTS (SELECT 1 FROM mission_members mm WHERE mm.mission_id = m.id AND mm.member_id = $1 AND mm.status = 'active')
        THEN true ELSE false 
      END as is_member,
      CASE WHEN $2 >= m.min_trust_score THEN true ELSE false END as is_eligible
    FROM missions m
    WHERE m.id = $3
  `,
    [member.id, member.trust_score_cached, id]
  );

  // Fetch active members
  const { rows: members } = await db.query(
    `
    SELECT m.id, m.email, m.member_id, mm.joined_at, mm.role
    FROM mission_members mm
    JOIN members m ON mm.member_id = m.id
    WHERE mm.mission_id = $1 AND mm.status = 'active'
    ORDER BY mm.joined_at ASC
  `,
    [id]
  );

  return new Response(JSON.stringify({ mission, members }), { status: 200 });
}
```

`POST /api/trust-builder/missions/[id]/join` - Join mission

```typescript
export async function POST({ params, locals }: APIContext) {
  const { id: missionId } = params;
  const member = locals.member;

  return await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
    // Check eligibility
    const {
      rows: [mission],
    } = await client.query(
      'SELECT id, name, min_trust_score FROM missions WHERE id = $1',
      [missionId]
    );

    if (!mission) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), {
        status: 404,
      });
    }

    if (member.trust_score_cached < mission.min_trust_score) {
      return new Response(
        JSON.stringify({
          error: `You need ${mission.min_trust_score - member.trust_score_cached} more Trust Points to join this mission.`,
        }),
        { status: 403 }
      );
    }

    // Check not already member
    const {
      rows: [existing],
    } = await client.query(
      "SELECT id FROM mission_members WHERE mission_id = $1 AND member_id = $2 AND status = 'active'",
      [missionId, member.id]
    );

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'You are already a member of this mission' }),
        { status: 400 }
      );
    }

    // Create membership
    await client.query(
      `INSERT INTO mission_members (mission_id, member_id, role, joined_at, status)
       VALUES ($1, $2, 'Member', NOW(), 'active')`,
      [missionId, member.id]
    );

    // Log event
    await client.query(
      `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
       VALUES ($1, 'mission', $2, 'mission.member_joined', $3)`,
      [
        member.id,
        missionId,
        {
          mission_id: mission.id,
          mission_name: mission.name,
          member_id: member.id,
          member_trust_score: member.trust_score_cached,
          joined_at: new Date().toISOString(),
        },
      ]
    );

    return new Response(
      JSON.stringify({ success: true, message: `Welcome to ${mission.name}!` }),
      { status: 200 }
    );
  });
}
```

`POST /api/trust-builder/missions/[id]/leave` - Leave mission

```typescript
export async function POST({ params, locals }: APIContext) {
  const { id: missionId } = params;
  const member = locals.member;

  return await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
    // Fetch mission and membership
    const {
      rows: [mission],
    } = await client.query('SELECT id, name FROM missions WHERE id = $1', [
      missionId,
    ]);

    const {
      rows: [membership],
    } = await client.query(
      "SELECT id, joined_at FROM mission_members WHERE mission_id = $1 AND member_id = $2 AND status = 'active'",
      [missionId, member.id]
    );

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'You are not a member of this mission' }),
        { status: 400 }
      );
    }

    // Update membership
    await client.query(
      `UPDATE mission_members 
       SET left_at = NOW(), status = 'left'
       WHERE id = $1`,
      [membership.id]
    );

    // Calculate days active
    const daysActive = Math.floor(
      (Date.now() - new Date(membership.joined_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Log event
    await client.query(
      `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
       VALUES ($1, 'mission', $2, 'mission.member_left', $3)`,
      [
        member.id,
        missionId,
        {
          mission_id: mission.id,
          mission_name: mission.name,
          member_id: member.id,
          left_at: new Date().toISOString(),
          days_active: daysActive,
        },
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `You've left ${mission.name}. You can rejoin anytime!`,
      }),
      { status: 200 }
    );
  });
}
```

**UI Layout** (List + Detail Pattern from UI-layout-pattern.md):

`src/pages/trust-builder/missions.astro`

```astro
---
import Layout from '@/layouts/Layout.astro';
import MissionsView from '@/components/trust-builder/MissionsView';
// ... auth check
---

<Layout title="Missions">
  <div class="container max-w-6xl mx-auto py-6">
    <h1 class="text-3xl font-bold mb-6">Available Missions</h1>
    <MissionsView client:load memberTrustScore={member.trust_score_cached} />
  </div>
</Layout>
```

`src/components/trust-builder/MissionsView.tsx`

```tsx
export function MissionsView({
  memberTrustScore,
}: {
  memberTrustScore: number;
}) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trust-builder/missions')
      .then((res) => res.json())
      .then((data) => {
        setMissions(data.missions);
        setLoading(false);
      });
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* List */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Missions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              memberTrustScore={memberTrustScore}
              onClick={() => setSelectedMission(mission)}
              isActive={selectedMission?.id === mission.id}
            />
          ))}
        </CardContent>
      </Card>

      {/* Detail */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{selectedMission?.name || 'Select a mission'}</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedMission ? (
            <MissionDetail
              missionId={selectedMission.id}
              memberTrustScore={memberTrustScore}
            />
          ) : (
            <p className="text-muted-foreground">
              Select a mission to view details
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Definition of Done (DoD)

- [ ] All acceptance criteria met (AC1-AC26)
- [ ] Database migrations applied (missions, mission_members tables seeded)
- [ ] API routes functional (GET missions, GET detail, POST join, POST leave)
- [ ] UI implements list + detail pattern (responsive at 375px, 768px, 1024px)
- [ ] Event logging works (join/leave events in ledger)
- [ ] Eligibility checking accurate (Trust Score threshold enforced)
- [ ] Sanctuary culture messaging validated (supportive, non-punitive)
- [ ] Day 5 manual testing completed (iOS, Android, Desktop - 1 hour)
- [ ] QA report: PASS with Layout & UX validation
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Strategic pre-review completed (Feb 15, 90 min)
- [ ] Migration readiness: 85-90% (mission events portable)
- [ ] Retro file created: `/project/trust-builder/retros/story-S4-03-mission-joining-retro.md`

---

## Sanctuary Culture Validation

- [ ] **Reversibility**: Members can leave and rejoin missions without penalty
- [ ] **Non-punitive defaults**: No Trust Score deduction for leaving, no harsh messaging
- [ ] **Teaching moments**: Ineligibility messages show path to eligibility ("100 more points needed")
- [ ] **Supportive language**: "You can rejoin anytime" (not "Are you sure?")
- [ ] **Generous thresholds**: Starter mission has 0 threshold (everyone can participate)

---

## Risk Assessment

**Complex** story - Moderate-High risk:

**Risk 1: Schema design misalignment with ontology**

- Mitigation: 90-minute strategic pre-review (Feb 15 AM) validates mission schema
- Fallback: Adjust schema during review if ontology mapping incorrect

**Risk 2: Eligibility logic complexity**

- Mitigation: Simple Trust Score threshold only (no prerequisite missions in S4)
- Fallback: If complex prerequisites needed, defer to S5 story

**Risk 3: Layout complexity (list + detail responsive behavior)**

- Mitigation: Reuse S2-04 review queue pattern (proven responsive)
- Fallback: Simplify to single-column if responsive issues at 375px

**Risk 4: Event structure for join/leave**

- Mitigation: Strategic pre-review validates event metadata structure
- Fallback: Adjust event metadata if migration needs differ

---

**Story Created**: 2026-02-12  
**Ready for Strategic Pre-Review**: ✅ YES (Feb 15, 90 min)  
**Ready for Implementation**: After pre-review approval  
**Prerequisites**: S4-01 complete (no blocking dependencies, config table optional for this story)  
**Enables**: Mission-based task filtering (S5), advanced eligibility (S5), mission analytics (S6)
