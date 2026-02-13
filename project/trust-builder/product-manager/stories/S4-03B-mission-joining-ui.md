# Story S4-03B: Mission Joining UI Implementation

**Epic**: Member Experience - Mission Lifecycle  
**Priority**: HIGH (first new member-facing feature since S3-02)  
**Sprint**: 4  
**Estimated Points**: 5  
**Complexity**: Moderate  
**Assigned To**: fullstack-developer  
**Strategic Review**: ✅ RECOMMENDED (45 minutes - UI/event validation only, schema validated in S4-03A)

---

## Prerequisites

**MUST COMPLETE FIRST**: S4-03A (Mission Schema Foundation)

This story builds the UI layer on top of the schema foundation established in S4-03A. The following must exist before starting:

- ✅ `groups` table with `stable_id` and `min_trust_score` columns
- ✅ `memberships` table with `left_at` and `status` columns
- ✅ Helper functions: `get_active_missions()`, `get_mission_members()`
- ✅ 3 seeded missions (Webinar S0, Content Creation, Platform Dev)

**Schema Confirmed**: S4-03A completes all database work. This story is pure UI + API + events.

---

## Goal

Build the member-facing UI for browsing missions, viewing mission details, and joining/leaving missions. Use existing schema from S4-03A (enhanced `groups` + `memberships` tables). Implement list + detail pattern with mobile-responsive layout and sanctuary culture messaging.

**Value for Members**: Clear path to participate, see available opportunities, track mission membership  
**Value for Organization**: Mission-based member organization, eligibility automation, engagement tracking  
**Value for Migration**: Membership events create portable attestations for "founding member" status

---

## Complexity (for AI)

**Moderate** (6-8 hours)

**Rationale**:

- Schema work complete in S4-03A (zero schema uncertainty)
- List + detail UI pattern with filtering/sorting (moderate layout complexity)
- Mobile responsive implementation (375px, 768px, 1024px breakpoints)
- Join/leave workflows with event logging
- Sanctuary culture messaging validation

**Why Not Complex**:

- No new entities (uses existing Groups + Connections dimensions from S4-03A)
- API queries use S4-03A helper functions (no complex SQL in UI code)
- Pattern reuse: List + detail from S2-04, Cards from S1-05, Buttons from S1-04

**Strategic Pre-Review Recommended**: 45 minutes (reduced from 90 min, focus on event structure and sanctuary messaging)

---

## Ontology Mapping

### Primary Dimensions

- **Groups**: Missions as Groups entities (`groups` table with `type='mission'`)
- **People**: Members as People entities (actors joining missions)
- **Connections**: Memberships as Connection entities (`memberships` table with member-group relationships)
- **Events**: Membership created event, membership ended event
- **Knowledge**: Mission metadata (description, requirements, member count, task count)

### Secondary Dimensions

- **Things**: Mission status (active/archived), membership status (active/left)

### Data Flow

```
Member visits /trust-builder/missions
  → GET /api/trust-builder/missions
  → Calls get_active_missions(member.id, member.trust_score_cached)
  → Returns all active groups WHERE type='mission' with eligibility
  → Displays list with eligibility indicator (checkmark or "X more points needed")

Member clicks "View Details" for Mission A
  → GET /api/trust-builder/missions/[id]
  → Fetches group details + members (via get_mission_members)
  → Shows "Join Mission" button IF eligible (trust_score >= min_trust_score)

Member clicks "Join Mission"
  → POST /api/trust-builder/missions/[id]/join
  → INSERT memberships (member_id, group_id, role='Member', joined_at=NOW(), status='active')
  → INSERT events (entity_type='membership', event_type='membership.created')
  → Success toast: "Welcome to [Mission Name]! Check out available tasks."

Member clicks "Leave Mission"
  → POST /api/trust-builder/missions/[id]/leave
  → UPDATE memberships SET left_at=NOW(), status='left'
  → INSERT events (entity_type='membership', event_type='membership.ended')
  → Success toast: "You've left [Mission Name]. You can rejoin anytime."
```

---

## User Story (Gherkin)

```gherkin
Given I am a Member with 300 Trust Score
And S4-03A is complete (schema foundation exists)
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
Then the system creates memberships record (status='active')
And logs event: membership.created (entity_type='membership')
And I see success toast: "Welcome to Webinar Series S0!"
And the button changes to "Leave Mission"

When I visit the mission detail page again
Then I see "Leave Mission" button
And I see my name in the members list

When I click "Leave Mission"
Then the system updates memberships (sets left_at, status='left')
And logs event: membership.ended
And I see toast: "You've left Webinar Series S0. You can rejoin anytime."

Given I am a Member with 150 Trust Score
When I view a mission requiring 250 Trust Score
Then the "Join Mission" button is disabled
And I see: "You need 100 more Trust Points to join this mission"
And I see: "Keep completing tasks to increase your Trust Score!"
```

---

## Acceptance Criteria

### Functional Behavior

- [ ] **AC1**: Member can browse all active missions (list view)
- [ ] **AC2**: Member can view mission details (detail view)
- [ ] **AC3**: Member can join mission IF trust_score >= groups.min_trust_score
- [ ] **AC4**: Member cannot join mission if ineligible (button disabled, helpful message shown)
- [ ] **AC5**: Member can leave mission voluntarily (no questions, no penalty)
- [ ] **AC6**: Member cannot join same mission twice (UI prevents, API validates)
- [ ] **AC7**: Join/leave actions are atomic (transaction with event logging)
- [ ] **AC8**: Re-join after leaving works (memberships unique index allows this)

### API Routes

- [ ] **AC9**: `GET /api/trust-builder/missions` returns all active missions:
  - Uses S4-03A helper: `get_active_missions(member.id, member.trust_score_cached)`
  - Returns: mission data + member_count + task_count + is_member + is_eligible

- [ ] **AC10**: `GET /api/trust-builder/missions/[id]` returns mission detail:
  - Uses S4-03A helper: `get_mission_members(group_id)`
  - Returns: mission details + active members

- [ ] **AC11**: `POST /api/trust-builder/missions/[id]/join` creates membership:
  - Validates eligibility (trust_score >= min_trust_score)
  - INSERT memberships (status='active')
  - Logs event: membership.created

- [ ] **AC12**: `POST /api/trust-builder/missions/[id]/leave` ends membership:
  - UPDATE memberships (left_at=NOW(), status='left')
  - Logs event: membership.ended

### Event Logging

- [ ] **AC13**: Event `membership.created` logged with metadata:
  - `entity_type: 'membership'`
  - `entity_id: <membership_id>`
  - `event_type: 'membership.created'`
  - `metadata: { group_id, group_name, member_id, member_trust_score, joined_at }`

- [ ] **AC14**: Event `membership.ended` logged with metadata:
  - `entity_type: 'membership'`
  - `entity_id: <membership_id>`
  - `event_type: 'membership.ended'`
  - `metadata: { group_id, group_name, member_id, left_at, days_active }`

### Layout & UX (refer to `/project/trust-builder/patterns/UI-layout-pattern.md`)

- [ ] **AC15**: List + detail pattern applied:
  - List view (left/top): Mission cards with key info (name, member count, eligibility)
  - Detail view (right/bottom): Full description, members, tasks, join button

- [ ] **AC16**: One clear primary action per screen: "Join Mission" button (`variant="default"`)

- [ ] **AC17**: Related elements visually grouped: Mission metadata in Card sections (description, requirements, members)

- [ ] **AC18**: Information hierarchy obvious: Mission name and eligibility status visible without scrolling

- [ ] **AC19**: Mobile responsive (375px): List view and detail view stack vertically, cards don't overflow

- [ ] **AC20**: Sanctuary feel: Comfortable spacing (space-y-6), ineligibility messages encouraging

### Sanctuary Culture

- [ ] **AC21**: Ineligibility messaging supportive:
  - ✓ "You need 100 more Trust Points to join. Keep completing tasks!"
  - ✗ "You don't qualify for this mission."

- [ ] **AC22**: Leave action non-punitive:
  - No Trust Score deduction
  - Can rejoin immediately if eligible
  - Toast message: "You can rejoin anytime" (not "Are you sure?")

- [ ] **AC23**: Progress indicators motivational:
  - "You're 80% of the way there!" if 200/250 points
  - Show path to eligibility clearly

### Quality

- [ ] **AC24**: Keyboard navigation works (tab order: list → detail → join button)
- [ ] **AC25**: Error handling: Network errors show toast ("Couldn't load missions. Try again?")
- [ ] **AC26**: Loading states: Skeleton cards while fetching missions
- [ ] **AC27**: Optimistic UI: Join button disabled immediately on click (prevents double-join)

---

## Testing Schedule (for UI stories)

**Day 5 Manual Testing** (Feb 19, 1 hour allocated):

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

**API Routes**:

`GET /api/trust-builder/missions` - List all active missions with metadata

```typescript
// src/pages/api/trust-builder/missions.ts
import type { APIContext } from 'astro';
import { db } from '@/lib/db';

export async function GET({ locals }: APIContext) {
  const member = locals.member;

  // Use S4-03A helper function
  const { rows: missions } = await db.query(
    `SELECT * FROM get_active_missions($1::UUID, $2::INTEGER)`,
    [member.id, member.trust_score_cached]
  );

  return new Response(JSON.stringify({ missions }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

`GET /api/trust-builder/missions/[id]` - Mission detail with members

```typescript
// src/pages/api/trust-builder/missions/[id].ts
import type { APIContext } from 'astro';
import { db } from '@/lib/db';

export async function GET({ params, locals }: APIContext) {
  const { id } = params;
  const member = locals.member;

  // Fetch mission (from groups table WHERE type='mission')
  const {
    rows: [mission],
  } = await db.query(
    `
    SELECT 
      g.*,
      (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id AND m.status = 'active') as member_count,
      CASE 
        WHEN EXISTS (SELECT 1 FROM memberships m WHERE m.group_id = g.id AND m.member_id = $1 AND m.status = 'active')
        THEN true ELSE false 
      END as is_member,
      CASE WHEN $2 >= g.min_trust_score THEN true ELSE false END as is_eligible
    FROM groups g
    WHERE g.id = $3 AND g.type = 'mission'
    `,
    [member.id, member.trust_score_cached, id]
  );

  if (!mission) {
    return new Response(JSON.stringify({ error: 'Mission not found' }), {
      status: 404,
    });
  }

  // Fetch active members (use S4-03A helper)
  const { rows: members } = await db.query(
    `SELECT * FROM get_mission_members($1::UUID)`,
    [id]
  );

  return new Response(JSON.stringify({ mission, members }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

`POST /api/trust-builder/missions/[id]/join` - Join mission

```typescript
// src/pages/api/trust-builder/missions/[id]/join.ts
import type { APIContext } from 'astro';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db/transaction';

export async function POST({ params, locals }: APIContext) {
  const { id: groupId } = params;
  const member = locals.member;

  return await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
    // Check eligibility (fetch from groups table)
    const {
      rows: [group],
    } = await client.query(
      `SELECT id, stable_id, name, min_trust_score 
       FROM groups 
       WHERE id = $1 AND type = 'mission' AND status = 'active'`,
      [groupId]
    );

    if (!group) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), {
        status: 404,
      });
    }

    if (member.trust_score_cached < group.min_trust_score) {
      const pointsNeeded = group.min_trust_score - member.trust_score_cached;
      return new Response(
        JSON.stringify({
          error: `You need ${pointsNeeded} more Trust Points to join this mission. Keep completing tasks!`,
        }),
        { status: 403 }
      );
    }

    // Check not already member (use memberships table)
    const {
      rows: [existing],
    } = await client.query(
      `SELECT id FROM memberships 
       WHERE group_id = $1 AND member_id = $2 AND status = 'active'`,
      [groupId, member.id]
    );

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'You are already a member of this mission' }),
        { status: 400 }
      );
    }

    // Create membership (insert into memberships table)
    const {
      rows: [membership],
    } = await client.query(
      `INSERT INTO memberships (member_id, group_id, role, joined_at, status)
       VALUES ($1, $2, 'Member', NOW(), 'active')
       RETURNING id`,
      [member.id, groupId]
    );

    // Log event (entity_type='membership', event_type='membership.created')
    await client.query(
      `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
       VALUES ($1, 'membership', $2, 'membership.created', $3)`,
      [
        member.id,
        membership.id,
        {
          group_id: group.id,
          group_stable_id: group.stable_id,
          group_name: group.name,
          member_id: member.id,
          member_trust_score: member.trust_score_cached,
          joined_at: new Date().toISOString(),
        },
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome to ${group.name}! Check out available tasks.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });
}
```

`POST /api/trust-builder/missions/[id]/leave` - Leave mission

```typescript
// src/pages/api/trust-builder/missions/[id]/leave.ts
import type { APIContext } from 'astro';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db/transaction';

export async function POST({ params, locals }: APIContext) {
  const { id: groupId } = params;
  const member = locals.member;

  return await withTransaction(import.meta.env.DATABASE_URL, async (client) => {
    // Fetch mission and membership
    const {
      rows: [group],
    } = await client.query(
      `SELECT id, stable_id, name FROM groups WHERE id = $1 AND type = 'mission'`,
      [groupId]
    );

    if (!group) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), {
        status: 404,
      });
    }

    const {
      rows: [membership],
    } = await client.query(
      `SELECT id, joined_at FROM memberships 
       WHERE group_id = $1 AND member_id = $2 AND status = 'active'`,
      [groupId, member.id]
    );

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'You are not a member of this mission' }),
        { status: 400 }
      );
    }

    // Update membership (set left_at and status='left')
    await client.query(
      `UPDATE memberships 
       SET left_at = NOW(), status = 'left'
       WHERE id = $1`,
      [membership.id]
    );

    // Calculate days active
    const daysActive = Math.floor(
      (Date.now() - new Date(membership.joined_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Log event (entity_type='membership', event_type='membership.ended')
    await client.query(
      `INSERT INTO events (actor_id, entity_type, entity_id, event_type, metadata)
       VALUES ($1, 'membership', $2, 'membership.ended', $3)`,
      [
        member.id,
        membership.id,
        {
          group_id: group.id,
          group_stable_id: group.stable_id,
          group_name: group.name,
          member_id: member.id,
          left_at: new Date().toISOString(),
          days_active: daysActive,
        },
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `You've left ${group.name}. You can rejoin anytime!`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
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
import { getMemberFromSession } from '@/lib/auth';

const member = await getMemberFromSession(Astro);
if (!member) {
  return Astro.redirect('/trust-builder/login');
}
---

<Layout title="Missions - Trust Builder">
  <div class="container max-w-6xl mx-auto py-6 space-y-6">
    <div>
      <h1 class="text-3xl font-bold">Available Missions</h1>
      <p class="text-muted-foreground">
        Join missions to collaborate with other members and contribute to
        Future's Edge.
      </p>
    </div>

    <MissionsView
      client:load
      memberId={member.id}
      memberTrustScore={member.trust_score_cached}
    />
  </div>
</Layout>
```

`src/components/trust-builder/MissionsView.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export function MissionsView({
  memberId,
  memberTrustScore,
}: {
  memberId: string;
  memberTrustScore: number;
}) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInFlight, setActionInFlight] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/trust-builder/missions')
      .then((res) => res.json())
      .then((data) => {
        setMissions(data.missions);
        setLoading(false);
        if (data.missions.length > 0) {
          setSelectedMission(data.missions[0]); // Auto-select first
        }
      })
      .catch(() => {
        toast({
          title: "Couldn't load missions",
          description: 'Try again in a moment',
          variant: 'destructive',
        });
      });
  }, []);

  const handleJoin = async (missionId: string) => {
    setActionInFlight(true);
    const res = await fetch(`/api/trust-builder/missions/${missionId}/join`, {
      method: 'POST',
    });
    const data = await res.json();

    if (res.ok) {
      toast({ title: data.message });
      // Optimistically update selected mission membership
      setMissions((prev) =>
        prev.map((mission) =>
          mission.id === missionId ? { ...mission, is_member: true } : mission
        )
      );
      setSelectedMission((prev) =>
        prev && prev.id === missionId ? { ...prev, is_member: true } : prev
      );
    } else {
      toast({
        title: data.error,
        variant: 'destructive',
      });
    }
    setActionInFlight(false);
  };

  const handleLeave = async (missionId: string) => {
    setActionInFlight(true);
    const res = await fetch(`/api/trust-builder/missions/${missionId}/leave`, {
      method: 'POST',
    });
    const data = await res.json();

    if (res.ok) {
      toast({ title: data.message });
      setMissions((prev) =>
        prev.map((mission) =>
          mission.id === missionId ? { ...mission, is_member: false } : mission
        )
      );
      setSelectedMission((prev) =>
        prev && prev.id === missionId ? { ...prev, is_member: false } : prev
      );
    } else {
      toast({
        title: data.error,
        variant: 'destructive',
      });
    }
    setActionInFlight(false);
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Missions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-16 rounded-md bg-muted animate-pulse" />
            <div className="h-16 rounded-md bg-muted animate-pulse" />
            <div className="h-16 rounded-md bg-muted animate-pulse" />
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Mission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-6 w-1/2 rounded-md bg-muted animate-pulse" />
            <div className="h-24 rounded-md bg-muted animate-pulse" />
            <div className="h-10 rounded-md bg-muted animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* List View */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Missions ({missions.length})</CardTitle>
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

      {/* Detail View */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{selectedMission?.name || 'Select a mission'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedMission ? (
            <MissionDetail
              mission={selectedMission}
              memberTrustScore={memberTrustScore}
              onJoin={handleJoin}
              onLeave={handleLeave}
              actionInFlight={actionInFlight}
            />
          ) : (
            <p className="text-muted-foreground">
              Select a mission from the list to view details and join
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MissionCard({ mission, memberTrustScore, onClick, isActive }) {
  const pointsNeeded = mission.min_trust_score - memberTrustScore;
  const isEligible = pointsNeeded <= 0;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        isActive ? 'bg-accent border-accent-foreground' : 'hover:bg-accent/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{mission.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {mission.description}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{mission.member_count} members</Badge>
            {isEligible ? (
              <Badge variant="success">✓ Eligible</Badge>
            ) : (
              <Badge variant="secondary">{pointsNeeded} more points</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MissionDetail({
  mission,
  memberTrustScore,
  onJoin,
  onLeave,
  actionInFlight,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trust-builder/missions/${mission.id}`)
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members || []);
        setLoading(false);
      });
  }, [mission.id]);

  const pointsNeeded = mission.min_trust_score - memberTrustScore;
  const isEligible = pointsNeeded <= 0;
  const progressRatio = Math.min(
    memberTrustScore / Math.max(mission.min_trust_score, 1),
    1
  );
  const progressPercent = Math.round(progressRatio * 100);

  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <h4 className="font-semibold mb-2">About</h4>
        <p className="text-muted-foreground">{mission.description}</p>
      </div>

      <Separator />

      {/* Requirements */}
      <div>
        <h4 className="font-semibold mb-2">Requirements</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {mission.min_trust_score}+ Trust Score
            </Badge>
            {!isEligible && (
              <span className="text-sm text-muted-foreground">
                You need {pointsNeeded} more points
              </span>
            )}
          </div>
          {!isEligible && (
            <p className="text-sm text-muted-foreground">
              Keep completing tasks to increase your Trust Score!
            </p>
          )}
          {!isEligible && (
            <p className="text-sm text-muted-foreground">
              You're {progressPercent}% of the way there!
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Members */}
      <div>
        <h4 className="font-semibold mb-2">Members ({members.length})</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading members...</p>
        ) : members.length > 0 ? (
          <div className="space-y-2">
            {members.slice(0, 5).map((member) => (
              <div key={member.member_id} className="text-sm">
                {member.display_name || member.email}
              </div>
            ))}
            {members.length > 5 && (
              <p className="text-sm text-muted-foreground">
                +{members.length - 5} more
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No members yet. Be the first to join!
          </p>
        )}
      </div>

      <Separator />

      {/* Tasks */}
      <div>
        <h4 className="font-semibold mb-2">Tasks</h4>
        <p className="text-sm text-muted-foreground">
          {mission.task_count} tasks available
        </p>
      </div>

      <Separator />

      {/* Primary Action */}
      <div>
        {mission.is_member ? (
          <Button
            variant="outline"
            onClick={() => onLeave(mission.id)}
            className="w-full"
            disabled={actionInFlight}
          >
            Leave Mission
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={() => onJoin(mission.id)}
            disabled={!isEligible || actionInFlight}
            className="w-full"
          >
            {isEligible ? 'Join Mission' : `Need ${pointsNeeded} more points`}
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## Definition of Done (DoD)

- [ ] All acceptance criteria met (AC1-AC27)
- [ ] S4-03A complete (schema foundation verified)
- [ ] API routes functional (GET missions, GET detail, POST join, POST leave)
- [ ] API routes use `groups` and `memberships` tables (not `missions`/`mission_members`)
- [ ] Event logging uses `membership.created` and `membership.ended` event types
- [ ] UI implements list + detail pattern (responsive at 375px, 768px, 1024px)
- [ ] Sanctuary culture messaging validated (supportive, non-punitive, encouraging)
- [ ] Day 5 manual testing completed (iOS, Android, Desktop - 1 hour)
- [ ] QA report: PASS with Layout & UX validation
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Strategic pre-review completed (45 min - UI/events only)
- [ ] Migration readiness: 90%+ (membership events portable, stable IDs in groups table)
- [ ] Retro file created: `/project/trust-builder/retros/story-S4-03B-mission-joining-ui-retro.md`

---

## Sanctuary Culture Validation

- [ ] **Reversibility**: Members can leave and rejoin missions without penalty
- [ ] **Non-punitive defaults**: No Trust Score deduction for leaving, no harsh messaging
- [ ] **Teaching moments**: Ineligibility messages show path to eligibility ("100 more points needed. Keep completing tasks!")
- [ ] **Supportive language**: "You can rejoin anytime" (not "Are you sure you want to leave?")
- [ ] **Generous thresholds**: Starter mission has 0 threshold (everyone can participate)

---

## Risk Assessment

**Moderate** story - Low-Medium risk:

**Risk 1: S4-03A dependency**

- Mitigation: MANDATORY prerequisite check before starting (verify helper functions exist)
- Fallback: If S4-03A not complete, block this story explicitly

**Risk 2: Layout complexity (list + detail responsive behavior)**

- Mitigation: Reuse S2-04 review queue pattern (proven responsive at 375px)
- Fallback: Simplify to single-column if responsive issues emerge

**Risk 3: Event structure correctness**

- Mitigation: 45-minute strategic pre-review validates event metadata
- Fallback: Adjust event metadata if migration needs differ

---

**Story Created**: 2026-02-12  
**Ready for Strategic Pre-Review**: After S4-03A completion (45 min, UI/events focus)  
**Ready for Implementation**: After S4-03A complete AND pre-review approved  
**Prerequisites**: ⚠️ **MUST COMPLETE S4-03A FIRST**  
**Depends On**: S4-03A (Mission Schema Foundation)  
**Enables**: Mission-based task filtering (S5), advanced eligibility (S5), mission analytics (S6)
