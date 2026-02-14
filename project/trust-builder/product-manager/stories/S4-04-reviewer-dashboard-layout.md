# Story S4-04: Reviewer Dashboard Layout Improvements

**Epic**: Reviewer Experience - Polish & Refinement  
**Priority**: MEDIUM (improves existing high-traffic workflow)  
**Sprint**: 4  
**Estimated Points**: 5  
**Complexity**: Moderate  
**Assigned To**: fullstack-developer  
**Strategic Review**: Optional (cosmetic changes only, zero schema impact)

---

## Goal

Apply UI layout patterns from `/project/trust-builder/patterns/UI-layout-pattern.md` to the existing reviewer dashboard (claim review queue). This is a **pure layout refactor** with no new functionality—improving visual hierarchy, primary action clarity, and mobile responsiveness.

**Value for Reviewers**: Clearer action hierarchy, better mobile experience, reduced cognitive load  
**Value for Organization**: Validates new layout QA process, improves high-visibility workflow  
**Value for Process**: Tests layout-first QA checklist effectiveness (feedback for S5)

---

## Complexity (for AI)

**Moderate** (8-10 hours)

**Rationale**:

- Existing functionality, no new queries or schema changes
- Layout pattern application only (list + detail from UI-layout-pattern.md)
- Responsive adjustments for 375px, 768px, 1024px breakpoints
- Moderate: Requires careful visual hierarchy decisions (what's primary vs secondary)
- Testing: Day 5 manual testing on iOS/Android/Desktop (1 hour)

**Not Complex Because**:

- Zero backend changes (API routes unchanged)
- Zero new components (reuse existing Card, Button, Badge)
- No new business logic (review approval workflow unchanged)

---

## Ontology Mapping

### Primary Dimensions

- **Knowledge**: Visual information hierarchy (what reviewers see first)
- **People**: Reviewer as actor (existing)
- **Things**: Claims (existing)
- **Connections**: Reviewer-claim assignment (existing)

### Secondary Dimensions

- **Events**: No new events (layout changes don't affect event logging)

**Ontology Impact**: **ZERO** (pure cosmetic, no data model changes)

---

## User Story (Gherkin)

```gherkin
Given I am a Steward/Reviewer
When I visit /trust-builder/review
Then I see a redesigned layout with:
  - List view (left/top): Claim cards, one per claim, sorted by submission date
  - Detail view (right/bottom): Selected claim details with review actions

# Improvement 1: Primary action clarity
When I view a claim card in the list
Then I see ONE "Start Review" button per card with variant="default"
And secondary actions (if any) use variant="outline" or variant="ghost"

# Improvement 2: Visual grouping
When I view claim details
Then related metadata is grouped in distinct Card sections:
  - Claim summary (claim ID, task name, member name)
  - Submission details (date, proofs provided)
  - Review actions (approve, reject, request revision)

# Improvement 3: Information hierarchy
When I view the page on laptop viewport (1024px)
Then key claim info (claim ID, task name, days pending) is visible without scrolling
And primary action ("Start Review") is above the fold

# Improvement 4: Mobile responsive
When I view the page on mobile (375px)
Then list and detail views stack vertically (not side-by-side)
And claim cards don't overflow horizontally
And all text is readable without zooming

# Improvement 5: Sanctuary spacing
When I view a claim with a warning ("Pending >5 days")
Then the warning appears in a dedicated Alert component with breathing room
And is not crammed next to other content
```

---

## Acceptance Criteria

### Layout & UX (refer to `/project/trust-builder/patterns/UI-layout-pattern.md`)

**These are the 5 SPECIFIC improvements (scope locked)**:

- [ ] **AC1**: One clear primary action per claim card: "Start Review" button uses `variant="default"`, only one per card
- [ ] **AC2**: Related elements visually grouped:
  - Claim metadata (task title, member, submission date) in `<Card>` with clear sections
  - Proof artifacts grouped together (text reflections, file links)
  - Review actions grouped at bottom (approve/reject/revise buttons)

- [ ] **AC3**: Information hierarchy obvious:
  - Claim ID + Task Name + Days Pending visible without scrolling (1024px viewport)
  - Primary action ("Start Review" or "Approve/Reject") visible without scrolling
  - Secondary details (full description, event history) below fold acceptable

- [ ] **AC4**: Mobile responsive (375px):
  - List + detail pattern stacks vertically (list on top, detail below)
  - Claim cards max-width constrains to viewport (no horizontal scroll)
  - Buttons stack vertically if needed (approve, reject, revise in column not row)
  - Text readable without zooming (font-size ≥ 16px for body text)

- [ ] **AC5**: Sanctuary feel - comfortable spacing:
  - Warnings ("Claim pending >5 days") in dedicated `<Alert variant="default">` with `mb-4` spacing
  - Not inline with other content (dedicated area with breathing room)
  - Proof artifacts have `space-y-4` between them (not cramped)
  - Review action buttons have `space-x-4` between them (desktop) or `space-y-4` (mobile)

### Quality

- [ ] **AC6**: Keyboard navigation works: Tab order follows visual order (list → detail → actions)
- [ ] **AC7**: No regressions: Existing review functionality unchanged (approve, reject, revise still work)
- [ ] **AC8**: Performance unchanged: No new queries, no slower page loads

### Process Validation (for S5 planning)

- [ ] **AC9**: QA report includes "Layout/UX Validation" subheading with checklist results
- [ ] **AC10**: QA engineer provides feedback on layout checklist effectiveness:
  - Were the 5 checks sufficient?
  - Were any layout issues missed by the checklist?
  - Should checklist be expanded for S5?

---

## Testing Schedule (for UI stories)

**Day 5 Manual Testing** (Feb 14 or Feb 17, 1 hour allocated):

- Desktop: Chrome at 375px, 768px, 1024px (responsive breakpoints)
- iOS: Safari on iPhone 13+ (actual device, not simulator)
- Android: Chrome on Pixel 6+ (actual device)

**Validation Checklist**:

- [ ] Claim ID + Task Name visible without scrolling (1024px)
- [ ] No horizontal scroll at 375px width
- [ ] "Start Review" button ≥44px height (mobile touch target)
- [ ] Focus order: List → Detail → "Approve" button
- [ ] Warning alerts have ≥16px margin-bottom (breathing room)
- [ ] Buttons don't overlap on mobile (stack vertically if needed)

---

## Environment Setup

**Before implementation, verify**:

1. Run `echo $DATABASE_URL` in terminal where dev server runs
2. Confirm database connection (dev branch vs production)
3. Document which database is being used for this story

**Expected**: Production database for dev server (per S3 learnings)

---

## Reusable Components (from prior stories)

- `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>` (S1-05): Layout structure
- `<Button>` (S1-04): Primary (`variant="default"`), Secondary (`variant="outline"`)
- `<Badge>` (S3-02): Status indicators (pending, days elapsed)
- `<Alert>` (S3-03): Warning messages with sanctuary spacing
- `<Separator>` (S2-02): Visual grouping within cards
- List + detail skeleton (S2-04): Existing review queue structure (enhance, don't rebuild)

---

## Implementation Notes (AI-facing)

### Tech Stack Specifics

**File to Edit** (NO new files, modify existing):

- `src/pages/trust-builder/review.astro` (add layout container classes)
- `src/components/trust-builder/ReviewQueue.tsx` (apply layout patterns)
- `src/components/trust-builder/ClaimReviewCard.tsx` (restructure with sections, primary action clarity)

### Layout Pattern (from UI-layout-pattern.md)

**List + Detail Pattern**:

```tsx
// src/components/trust-builder/ReviewQueue.tsx
export function ReviewQueue() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Review Queue</h1>

      {/* List + Detail Grid */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* List View (Left/Top) */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Pending Claims ({claims.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {claims.map((claim) => (
              <ClaimListCard
                key={claim.id}
                claim={claim}
                onClick={() => setSelectedClaim(claim)}
                isActive={selectedClaim?.id === claim.id}
              />
            ))}
          </CardContent>
        </Card>

        {/* Detail View (Right/Bottom) */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>
              {selectedClaim
                ? `Claim #${selectedClaim.id.slice(0, 8)}`
                : 'Select a claim'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedClaim ? (
              <ClaimDetailView claim={selectedClaim} />
            ) : (
              <p className="text-muted-foreground">
                Select a claim from the list to review
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Claim List Card** (Primary Action Clarity):

```tsx
// src/components/trust-builder/ClaimListCard.tsx
export function ClaimListCard({ claim, onClick, isActive }) {
  const daysPending = Math.floor(
    (Date.now() - new Date(claim.submitted_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent',
        isActive && 'border-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6 space-y-4">
        {/* Grouped Metadata */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{claim.task_title}</h3>
            <Badge variant={daysPending > 5 ? 'destructive' : 'secondary'}>
              {daysPending}d
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Member: {claim.member_email}
          </p>
          <p className="text-xs text-muted-foreground">
            Submitted: {new Date(claim.submitted_at).toLocaleDateString()}
          </p>
        </div>

        {/* Sanctuary-aligned warning (if >5 days) */}
        {daysPending > 5 && (
          <Alert variant="default" className="mt-4">
            <AlertDescription>
              This claim has been pending for {daysPending} days. The member is
              waiting for your feedback!
            </AlertDescription>
          </Alert>
        )}

        {/* Primary Action (ONE per card) */}
        <Button variant="default" className="w-full" onClick={onClick}>
          Start Review
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Claim Detail View** (Visual Grouping + Hierarchy):

```tsx
// src/components/trust-builder/ClaimDetailView.tsx
export function ClaimDetailView({ claim }) {
  return (
    <div className="space-y-6">
      {/* Section 1: Claim Summary (Above fold, key info) */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{claim.task_title}</h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Claim ID: {claim.id.slice(0, 8)}</span>
          <span>Member: {claim.member_email}</span>
          <span>
            Submitted: {new Date(claim.submitted_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Separator />

      {/* Section 2: Task Context (Grouped) */}
      <div className="space-y-2">
        <h3 className="font-semibold">Task Description</h3>
        <p className="text-sm">{claim.task_description}</p>
      </div>

      <Separator />

      {/* Section 3: Proof Artifacts (Grouped with comfortable spacing) */}
      <div className="space-y-4">
        <h3 className="font-semibold">Proof Submitted</h3>
        {claim.proofs.map((proof) => (
          <Card key={proof.id} className="p-4">
            <CardContent>
              {proof.type === 'text' ? (
                <p className="text-sm whitespace-pre-wrap">{proof.content}</p>
              ) : (
                <a
                  href={proof.url}
                  target="_blank"
                  className="text-sm text-primary underline"
                >
                  View attached file
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Section 4: Review Actions (Primary action at bottom) */}
      <div className="space-y-4">
        <h3 className="font-semibold">Review Decision</h3>

        {/* Desktop: Horizontal buttons, Mobile: Vertical stack */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="default" className="flex-1">
            Approve
          </Button>
          <Button variant="outline" className="flex-1">
            Request Revision
          </Button>
          <Button variant="destructive" className="flex-1">
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Responsive Breakpoints (Tailwind)

**Mobile-first approach**:

```tsx
// Base (375px): Vertical stack
<div className="grid gap-6">

// Tablet (768px): Side-by-side with 40/60 split
<div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">

// Desktop (1024px): Same as tablet (no change needed)
```

**Button stacking**:

```tsx
// Base: Vertical stack
<div className="flex flex-col gap-4">

// Small screens and up: Horizontal row
<div className="flex flex-col sm:flex-row gap-4">
```

---

## Definition of Done (DoD)

- [ ] All acceptance criteria met (AC1-AC10)
- [ ] 5 specific improvements delivered (primary action, grouping, hierarchy, mobile, spacing)
- [ ] No functional regressions (review workflow still works)
- [ ] Day 5 manual testing completed (iOS, Android, Desktop - 1 hour)
- [ ] QA report: PASS with Layout/UX validation subheading
- [ ] QA engineer feedback provided on layout checklist effectiveness
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Migration readiness: N/A (cosmetic changes, no migration impact)
- [ ] Retro file created: `/project/trust-builder/retros/story-S4-04-reviewer-dashboard-layout-retro.md`

---

## Sanctuary Culture Validation

- [ ] **Reversibility**: N/A (layout changes, no user actions affected)
- [ ] **Non-punitive defaults**: Warning messages supportive ("The member is waiting for your feedback!" not "This claim is overdue")
- [ ] **Teaching moments**: N/A (no new messaging introduced)
- [ ] **Supportive language**: Existing review messaging unchanged (already sanctuary-aligned from S2-04)
- [ ] **Generous thresholds**: N/A (no thresholds changed)

**Note**: This story doesn't introduce new messaging, only rearranges existing content. Sanctuary culture maintained by preserving existing supportive copy from S2-04.

---

## Risk Assessment

**Low Risk** story:

- Pure layout refactor, no new functionality
- Existing components reused (Card, Button, Badge)
- No database changes, no API changes
- Responsive patterns proven in S2-04 (review queue already exists)

**Potential Issues**:

1. **Regression risk**: Accidentally breaking review approval logic
   - **Mitigation**: Test all review actions (approve, reject, revise) after layout changes
   - **Fallback**: Git revert to previous layout if critical regressions

2. **Mobile layout issues**: 375px width edge cases
   - **Mitigation**: Day 5 manual testing on actual iOS/Android devices
   - **Fallback**: Simplify to single-column layout if responsive issues persist

3. **Scope creep**: Reviewer requests additional features during testing
   - **Mitigation**: 5 improvements locked in AC1-AC5, no additional scope accepted
   - **Fallback**: Defer feature requests to S5 backlog

---

## Process Goal (Meta)

This story is also a **validation of the new layout QA process** introduced in Sprint 4:

**Success Criteria** (for process, not just story):

- QA catches layout issues BEFORE product-advisor review (shift left)
- Layout checklist proves sufficient (or QA provides feedback to improve it)
- Zero layout comments in product-advisor review (validates QA effectiveness)

**QA Engineer: Please provide feedback in QA report**:

- Did the 5-point layout checklist catch all issues?
- Were any layout problems missed that advisor caught later?
- Should checklist be expanded for S5? (e.g., add contrast check, font size validation)

This feedback will inform Sprint 5 story planning and layout quality process refinement.

---

**Story Created**: 2026-02-12  
**Ready for Implementation**: ✅ YES  
**Prerequisites**: None (existing review queue page)  
**Enables**: Process validation for S5 layout quality workflow
