# Story S1-06: Append-Only Event Ledger UI

**Sprint**: 1  
**Story ID**: S1-06  
**Depends on**: S1-01 (Schema with events table)  
**Blocks**: None (final Sprint 1 story)  
**Created**: 2026-02-09  
**Pre-Review**: Grade B+ → A (3 fixes applied, ready for implementation)

---

## Goal

Give authenticated members visibility into the immutable event ledger that records every state transition in Trust Builder, demonstrating transparency, auditability, and the event-sourced foundation that will enable blockchain migration—showing members that their contributions are permanently recorded in a verifiable ledger.

---

## Complexity (for AI)

**Simple** — This story involves:

- Read-only query (SELECT from events table with filters)
- Component reuse (ClaimCard can render event data)
- Simple filtering UI (dropdown for event types)
- Pagination (LIMIT/OFFSET pattern)
- No business logic (display only, no writes)

**Not Complex Because**:

- No transactions or atomicity requirements
- No aggregations or complex joins
- Reuses existing SSR + auth patterns from S1-05
- Components already built (ClaimCard, EmptyState)

**Estimated Time**: 60-90 minutes for AI implementation

---

## Ontology Mapping

- **Groups**: Mission names in event metadata (for claim events)
- **People**: Actor (member who triggered event), viewer (authenticated member)
- **Things**: Task references in event metadata (for task state changes)
- **Connections**: Claim events show member→task relationships
- **Events**: Primary focus—immutable ledger displayed chronologically
- **Knowledge**: Event log demonstrates audit trail and transparency

---

## User Story (Gherkin)

### Scenario 1: Member Views Their Event Log

```gherkin
Given I am authenticated as FE-M-00001
And I have the following events in my history:
  - "member.created" (2026-02-07 10:00)
  - "claim.submitted" on "Attend Live Webinar" (2026-02-08 14:30)
  - "claim.approved" on "Attend Live Webinar" (2026-02-08 14:30)
  - "trust.updated" +60 points (2026-02-08 14:30)
When I navigate to /trust-builder/events
Then I see my event log with 4 events listed chronologically (newest first)
And each event card shows:
  - Event type badge (color-coded by category)
  - Timestamp (relative time: "2 days ago", "5 hours ago")
  - Event description (human-readable)
  - Related entity (task title, member ID, etc.)
  - Metadata preview (expandable JSON for power users)
And I see pagination controls (showing page 1 of 1, 4 events total)
```

### Scenario 2: Member Filters Events by Type

```gherkin
Given I am viewing my event log with 20+ events
When I select "Claim Events" from the event type filter dropdown
Then I see only events matching:
  - claim.submitted
  - claim.approved
  - claim.rejected
And events of other types (trust.updated, member.created) are hidden
And the filter state persists in URL query params (?type=claim)
And pagination resets to page 1
```

### Scenario 3: New Member Sees Empty State

```gherkin
Given I am authenticated as FE-M-00042 (new member)
And my only event is "member.created" (just now)
When I navigate to /trust-builder/events
Then I see my "member.created" event at the top
And I see a sanctuary-aligned message below:
  "Your Trust Journey Begins Here
   Every action you take in Trust Builder is recorded in this immutable ledger.
   As you complete tasks, submit claims, and earn trust points, you'll see
   your contribution history grow here."
And I see a "Browse Available Tasks" CTA button
```

### Scenario 4: Member Expands Event Metadata

```gherkin
Given I am viewing an event: "claim.approved" on "Attend Live Webinar"
When I click "Show Details" on the event card
Then I see the full event metadata expanded:
  {
    "claim_id": "uuid-...",
    "task_id": "uuid-...",
    "points_earned": 60,
    "dimensions": {
      "participation": 50,
      "innovation": 10
    },
    "auto_approved": true
  }
And I can copy the JSON to clipboard
And the expanded state persists when I scroll or filter
```

### Scenario 5: Member Navigates Event Pagination

```gherkin
Given I have 45 events in my history
And the page displays 20 events per page
When I load /trust-builder/events
Then I see events 1-20 (newest first)
And I see pagination: "Page 1 of 3 | Showing 1-20 of 45 events"
And I see "Next Page" button (enabled)
And I see "Previous Page" button (disabled)
When I click "Next Page"
Then I see events 21-40
And URL updates to /trust-builder/events?page=2
And "Previous Page" becomes enabled
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] **AC-1 (Event List Display)**: Page shows member's events ordered by timestamp DESC (newest first)
- [ ] **AC-2 (Event Card Content)**: Each event displays: type badge, timestamp (relative), description, related entity, metadata preview
- [ ] **AC-3 (Event Type Filtering)**: Dropdown filter for event categories: All, Claim Events, Trust Events, Member Events
- [ ] **AC-4 (Pagination)**: 20 events per page with Previous/Next controls and page indicator
- [ ] **AC-5 (Empty State)**: New members with only "member.created" event see sanctuary-aligned onboarding message
- [ ] **AC-6 (Metadata Expansion)**: "Show Details" reveals full JSON metadata with copy-to-clipboard button
- [ ] **AC-7 (URL State)**: Filter and page state persist in URL query params (shareable links)

### Ontology Compliance

- [ ] **OC-1**: Events displayed as immutable audit trail (no edit/delete actions shown)
- [ ] **OC-2**: Actor attribution shown for each event (which member triggered it)
- [ ] **OC-3**: Related entities linked or displayed (task titles, mission names in metadata)
- [ ] **OC-4**: Timestamp precision preserved (millisecond accuracy for audit purposes)

### Technical Quality

- [ ] **TQ-1**: Query only events where actor_id matches authenticated member (data isolation)
- [ ] **TQ-2**: Use indexed query: `WHERE actor_id = ? ORDER BY timestamp DESC LIMIT 20 OFFSET ?`
- [ ] **TQ-3**: Event type filtering uses indexed column (events.event_type)
- [ ] **TQ-4**: SSR page load with auth guard (same pattern as S1-05 dashboard)
- [ ] **TQ-5**: Component reuse: ClaimCard adapted for event rendering, DashboardEmptyState for new members

### User Experience

- [ ] **UX-1**: Mobile-responsive layout (event cards stack, filter dropdown collapses)
- [ ] **UX-2**: Event type badges color-coded (claim=blue, trust=green, member=purple, task=orange)
- [ ] **UX-3**: Relative timestamps with absolute tooltip ("2 hours ago" → hover shows "2026-02-09 14:30:00 UTC")
- [ ] **UX-4**: Metadata JSON syntax-highlighted and formatted (not raw string)
- [ ] **UX-5**: Empty state uses sanctuary messaging ("Your Trust Journey Begins Here" not "No events found")

---

## Implementation Notes (AI-Facing)

### Database Query

**File**: `src/lib/db/queries.ts`

Add `getMemberEvents()` function:

```typescript
export async function getMemberEvents(
  memberId: string,
  options: {
    eventType?: EventTypeFilter;  // Optional filter: 'all', 'claim', 'trust', 'member'
    page?: number;                 // Default 1
    limit?: number;                // Default 20
  } = {}
): Promise<{ events: Event[]; total: number; pages: number }> {
  const { eventType, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Build parameterized WHERE conditions (security best practice)
  const conditions = [`actor_id = $1`];
  const params: any[] = [memberId];

  if (eventType && eventType !== 'all') {
    conditions.push(`event_type LIKE $${params.length + 1}`);
    params.push(`${eventType}.%`);  // 'claim.%', 'trust.%', 'member.%'
  }

  const whereClause = conditions.join(' AND ');

  // Count total matching events
  const countResult = await query(
    `SELECT COUNT(*) as total FROM events WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Fetch paginated events
  const queryParams = [...params, limit, offset];
  const result = await query(
    `SELECT id, timestamp, actor_id, entity_type, entity_id, event_type, metadata
     FROM events
     WHERE ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    queryParams
  );

  return {
    events: result.rows,
    total,
    pages: Math.ceil(total / limit)
  };
}
```

**Type Definition** (add to `src/types/trust-builder.ts`):

```typescript
export interface Event {
  id: number;  // BIGSERIAL in PostgreSQL maps to number in JavaScript
  timestamp: Date;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  metadata: Record<string, any>;
}

export type EventTypeFilter = 'all' | 'claim' | 'trust' | 'member';
```

---

### Page Structure

**File**: `src/pages/trust-builder/events.astro`

```astro
---
import Layout from '@/layouts/Layout.astro';
import { getCurrentUser } from '@/lib/auth';
import { getMemberEvents } from '@/lib/db/queries';
import EventCard from '@/components/trust-builder/EventCard';
import EventFilter from '@/components/trust-builder/EventFilter';
import DashboardEmptyState from '@/components/trust-builder/DashboardEmptyState';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const member = await getCurrentUser(Astro);
if (!member) return Astro.redirect('/trust-builder/sign-in');

// Parse query params
const url = new URL(Astro.request.url);
const eventType = (url.searchParams.get('type') as EventTypeFilter) || 'all';
const page = parseInt(url.searchParams.get('page') || '1');

// Fetch events
const { events, total, pages } = await getMemberEvents(member.id, {
  eventType: eventType === 'all' ? undefined : eventType,
  page,
  limit: 20
});

// Empty state check (only member.created event)
const isNewMember = events.length === 1 && events[0].event_type === 'member.created';
---

<Layout title="Event Ledger - Trust Builder">
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Event Ledger</h1>
      <p class="text-muted-foreground mt-2">
        Your complete contribution history in Trust Builder's immutable ledger
      </p>
    </div>

    <EventFilter 
      currentFilter={eventType} 
      baseUrl="/trust-builder/events" 
      client:load 
    />

    <div class="mt-6 space-y-4">
      {events.map(event => (
        <EventCard key={event.id.toString()} event={event} client:load />
      ))}
    </div>

    {isNewMember && (
      <DashboardEmptyState 
        heading="Your Trust Journey Begins Here"
        message="Every action you take in Trust Builder is recorded in this immutable ledger. As you complete tasks, submit claims, and earn trust points, you'll see your contribution history grow here."
        primaryCta={{ text: "Browse Available Tasks", href: "/trust-builder/tasks" }}
        secondaryCta={null}
        client:load
      />
    )}

    {pages > 1 && (
      <div class="flex items-center justify-between mt-8">
        <p class="text-sm text-muted-foreground">
          Page {page} of {pages} | Showing {Math.min((page-1)*20+1, total)}-{Math.min(page*20, total)} of {total} events
        </p>
        <div class="flex gap-2">
          <Button variant="outline" disabled={page === 1} asChild>
            <a href={`/trust-builder/events?type=${eventType}&page=${page-1}`}>
              <ChevronLeft class="h-4 w-4 mr-2" />
              Previous
            </a>
          </Button>
          <Button variant="outline" disabled={page === pages} asChild>
            <a href={`/trust-builder/events?type=${eventType}&page=${page+1}`}>
              Next
              <ChevronRight class="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    )}
  </div>
</Layout>
```

---

### Components to Create

#### 1. EventCard.tsx

**File**: `src/components/trust-builder/EventCard.tsx`

```tsx
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useState } from 'react';
import type { Event } from '@/types/trust-builder';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getEventBadge = (eventType: string) => {
    if (eventType.startsWith('claim.')) {
      return <Badge className="bg-blue-500">Claim Event</Badge>;
    }
    if (eventType.startsWith('trust.')) {
      return <Badge className="bg-green-500">Trust Event</Badge>;
    }
    if (eventType.startsWith('member.')) {
      return <Badge className="bg-purple-500">Member Event</Badge>;
    }
    return <Badge>{eventType}</Badge>;
  };

  const formatRelativeTime = (date: Date): string => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return new Date(date).toLocaleDateString();
  };

  const getEventDescription = (event: Event): string => {
    switch (event.event_type) {
      case 'member.created':
        return 'You joined Trust Builder';
      case 'claim.submitted':
        return `Submitted claim on task`;
      case 'claim.approved':
        return `Claim approved • Earned ${event.metadata.points_earned || 0} points`;
      case 'claim.rejected':
        return 'Claim rejected';
      case 'trust.updated':
        return `Trust score updated • ${event.metadata.points_added > 0 ? '+' : ''}${event.metadata.points_added} points`;
      default:
        return event.event_type;
    }
  };

  const copyMetadata = () => {
    navigator.clipboard.writeText(JSON.stringify(event.metadata, null, 2));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getEventBadge(event.event_type)}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span title={new Date(event.timestamp).toISOString()}>
                  {formatRelativeTime(event.timestamp)}
                </span>
              </span>
            </div>
            <p className="text-sm font-medium">{getEventDescription(event)}</p>
            {event.entity_type && (
              <p className="text-xs text-muted-foreground mt-1">
                {event.entity_type}: {event.entity_id}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Event Metadata</h4>
              <Button variant="ghost" size="sm" onClick={copyMetadata}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
              <code>{JSON.stringify(event.metadata, null, 2)}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 2. EventFilter.tsx

**File**: `src/components/trust-builder/EventFilter.tsx`

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EventTypeFilter } from '@/types/trust-builder';

interface EventFilterProps {
  currentFilter: EventTypeFilter;
  baseUrl: string;
}

export default function EventFilter({ currentFilter, baseUrl }: EventFilterProps) {
  const handleFilterChange = (value: EventTypeFilter) => {
    window.location.href = `${baseUrl}?type=${value}`;
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="event-filter" className="text-sm font-medium">
        Filter by type:
      </label>
      <Select value={currentFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-[180px]" id="event-filter">
          <SelectValue placeholder="All Events" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events</SelectItem>
          <SelectItem value="claim">Claim Events</SelectItem>
          <SelectItem value="trust">Trust Events</SelectItem>
          <SelectItem value="member">Member Events</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

#### 3. Update DashboardEmptyState (Backward Compatible)

**Modification**: `src/components/trust-builder/DashboardEmptyState.tsx`

Make props optional while preserving S1-05 two-button layout:

```tsx
interface DashboardEmptyStateProps {
  heading?: string;
  message?: string;
  primaryCta?: { text: string; href: string };
  secondaryCta?: { text: string; href: string } | null;
}

export default function DashboardEmptyState({
  heading = "Start Your Trust Journey",
  message = "You haven't claimed any tasks yet. Complete tasks to earn trust points and contribute to Future's Edge missions!",
  primaryCta = { text: "Browse Available Tasks", href: "/trust-builder/tasks" },
  secondaryCta = { text: "View Event Log", href: "/trust-builder/events" }
}: DashboardEmptyStateProps = {}) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-12 pb-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2">{heading}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {primaryCta && (
            <Button asChild size="lg">
              <a href={primaryCta.href}>{primaryCta.text}</a>
            </Button>
          )}
          {secondaryCta && (
            <Button asChild variant="outline" size="lg">
              <a href={secondaryCta.href}>{secondaryCta.text}</a>
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Every task you complete builds trust and earns points toward role promotions
        </p>
      </CardContent>
    </Card>
  );
}
```

**Backward Compatibility**: S1-05 dashboard continues using `<DashboardEmptyState />` with no props (all defaults apply, including both CTA buttons).

**S1-06 Usage** (single CTA for event ledger):

```astro
<DashboardEmptyState 
  heading="Your Trust Journey Begins Here"
  message="Every action you take in Trust Builder is recorded in this immutable ledger. As you complete tasks, submit claims, and earn trust points, you'll see your contribution history grow here."
  primaryCta={{ text: "Browse Available Tasks", href: "/trust-builder/tasks" }}
  secondaryCta={null}
  client:load
/>
```

---

## Definition of Done (DoD)

- [ ] All 20 acceptance criteria met
- [ ] QA report: PASS with ontology compliance validation
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Retro file created in `/trust-builder/retros/`
- [ ] BACKLOG.md updated with S1-06 status
- [ ] Sprint 1 declared complete (22/22 points)

---

## Strategic Context

### Why This Story Matters

S1-06 completes Sprint 1 by demonstrating **transparency and auditability**—core values that differentiate Trust Builder from traditional task trackers.

**Member-Facing Value**:
- "I can see every action I've taken" (transparency)
- "My contributions are permanently recorded" (permanence)
- "Nothing is hidden or deleted" (trust)

**Migration Value**:
- Event ledger UI teaches members about immutable audit trails before blockchain
- When events move on-chain in April 2026, the UI stays identical (just swap data source)
- Members already understand "every action creates a permanent record"

**Season 0 Positioning**:
- Differentiator vs. competitors (most apps don't show users their full activity log)
- Educational tool (members learn about event-sourced systems through interaction)
- Founding member proof (ledger shows "I was here from Day 1")

---

## Dependency Notes

### Reusable from S1-05

- **DashboardEmptyState**: Adapt props for event ledger empty state ✅
- **SSR + Auth Pattern**: Same getCurrentUser() guard, same Layout ✅
- **Sanctuary Messaging**: "Your Trust Journey Begins Here" ✅

### New for S1-06

- **EventCard**: New component (but similar structure to ClaimCard)
- **EventFilter**: New dropdown component (simple Select wrapper)
- **getMemberEvents**: New query function (but similar pagination to getRecentClaims)

### No New Patterns

- No transactions (read-only)
- No business logic (display only)
- No complex state management (URL params for filter/page)
- No event logging (this page just *reads* events, doesn't create them)

---

## Testing Scenarios (for QA)

### Scenario 1: Event Type Accuracy

**Test**: Create events of different types and verify badge colors

```sql
-- As admin, create test events for QA member
INSERT INTO events (actor_id, event_type, metadata) VALUES
  ('FE-M-00099', 'claim.submitted', '{"task_id": "..."}'),
  ('FE-M-00099', 'trust.updated', '{"points_added": 50}'),
  ('FE-M-00099', 'member.created', '{}');
```

**Expected**: Each event shows correct badge color (claim=blue, trust=green, member=purple)

### Scenario 2: Pagination Boundary

**Test**: Load page with exactly 20, 21, and 40 events

**Expected**:
- 20 events: No pagination shown
- 21 events: "Page 1 of 2" with Next enabled
- 40 events: "Page 1 of 2" → Next → "Page 2 of 2" with Previous enabled

### Scenario 3: Filter Persistence

**Test**: Apply filter → click event → return to list

**Expected**: Filter state persists in URL and dropdown selection

### Scenario 4: Relative Time Accuracy

**Test**: Create events at different timestamps and verify relative time display

```typescript
// Events created:
- 30 seconds ago → "Just now"
- 5 minutes ago → "5 minutes ago"
- 3 hours ago → "3 hours ago"
- 2 days ago → "2 days ago"
- 10 days ago → "Feb 1, 2026" (full date)
```

### Scenario 5: Metadata Expansion

**Test**: Expand event → copy metadata → paste into validator

**Expected**: Valid JSON that matches database record

---

## Migration Readiness Notes

When Trust Builder moves to blockchain (April 2026), this page will:

**Keep**:
- EventCard component (same UI)
- EventFilter dropdown (same filters)
- Pagination controls (same UX)

**Change**:
- `getMemberEvents()` swaps PostgreSQL for Ethereum RPC
- Query becomes: `contract.getPastEvents('AllEvents', { filter: { actor: address } })`
- Metadata format stays identical (events table schema matches contract event signatures)

**This is the final Sprint 1 story that proves Trust Builder is blockchain-ready by design.**

---

**Story prepared by**: product-owner  
**Date**: 2026-02-09  
**Sprint 1 Status After S1-06**: 22/22 points (100% complete)  
**Next Sprint**: S2 planning (Admin Task Creation, Peer Review, File Uploads)
