# Story S4-05: Reviewer Dashboard Layout Improvements - Implementation Brief

## Quick Overview

**Story**: S4-05 (Reviewer Dashboard Layout Improvements)  
**Type**: Pure layout refactor - NO NEW FUNCTIONALITY  
**Complexity**: Moderate (8-10 hours)  
**Strategic Review**: Optional (cosmetic only, zero schema impact)  
**Files to Modify**:

- `/src/pages/trust-builder/reviews/index.astro`
- `/src/components/trust-builder/ReviewQueue.tsx`

**Story File**: [S4-05-reviewer-dashboard-layout.md](/Users/peteargent/apps/000_fe_new/edgetrust/project/trust-builder/product-manager/stories/S4-05-reviewer-dashboard-layout.md)

---

## Objective

Apply UI layout patterns from [`/project/trust-builder/patterns/UI-layout-pattern.md`](/Users/peteargent/apps/000_fe_new/edgetrust/project/trust-builder/patterns/UI-layout-pattern.md) to the existing reviewer dashboard. This improves visual hierarchy, primary action clarity, and mobile responsiveness **without changing any functionality**.

---

## 5 Specific Improvements (Scope Locked)

### 1. Primary Action Clarity (AC1)

- **Current**: "Review This Claim" button per card
- **Target**: ONE "Start Review" button per card, `variant="default"`, visually prominent
- **Why**: Reduces cognitive load, clear action hierarchy

### 2. Visual Grouping (AC2)

- **Current**: Metadata scattered in CardHeader and CardContent
- **Target**: Related elements grouped with clear sections:
  - Claim metadata (task title, member, submission date)
  - Proof artifacts grouped together
  - Review actions grouped at bottom
- **Why**: Sanctuary feel (comfortable spacing), easier scanning

### 3. Information Hierarchy (AC3)

- **Current**: Some key info may be below fold
- **Target**: Claim ID + Task Name + Days Pending visible without scrolling (1024px viewport)
- **Why**: Key info always accessible, reduces scrolling

### 4. Mobile Responsive (AC4)

- **Current**: Unclear if fully responsive at 375px
- **Target**:
  - Cards max-width constrains to viewport (no horizontal scroll)
  - Buttons stack vertically if needed
  - Text readable without zooming (font-size ≥ 16px)
- **Why**: Better mobile experience for reviewers on-the-go

### 5. Sanctuary Spacing (AC5)

- **Current**: Good existing patterns
- **Target**: Enhance with:
  - Warnings in dedicated `<Alert>` with `mb-4` spacing
  - Proof artifacts have `space-y-4` between them
  - Review action buttons have appropriate spacing (desktop: `space-x-4`, mobile: `space-y-4`)
- **Why**: Maintains sanctuary culture, reduces visual clutter

---

## Current Implementation Context

**Existing Component**: `src/components/trust-builder/ReviewQueue.tsx`

**Current Structure**:

- Workload Indicator card (shows active reviews / max capacity)
- Queue stats header (claim count + refresh button)
- Claims list (Card per claim with metadata + "Review This Claim" button)

**What Works Well** (preserve these):

- Workload tracking (AC27 from S2-04)
- Sanctuary culture reminder
- Time ago formatting
- Assignment flow (claim → navigate to review page)
- Loading and error states

**What Needs Improvement** (apply layout patterns):

- Visual grouping within claim cards (metadata grouped clearly)
- Primary action clarity ("Review This Claim" → "Start Review" with clear prominence)
- Mobile responsive layout (ensure 375px works smoothly)
- Information hierarchy (key info above fold)
- Spacing consistency (sanctuary feel)

---

## Implementation Approach

### Phase 1: Restructure Claim Card Layout (AC1, AC2, AC3)

Apply **list card pattern** from UI-layout-pattern.md:

```tsx
// src/components/trust-builder/ReviewQueue.tsx (claim card section)

<Card className="cursor-pointer transition-colors hover:bg-accent">
  <CardContent className="pt-6 space-y-4">
    {/* Grouped Metadata (AC2) */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{claim.taskTitle}</h3>
        <Badge variant={daysPending > 5 ? 'destructive' : 'secondary'}>
          {daysPending}d
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Member: {claim.memberDisplayName}
      </p>
      <p className="text-xs text-muted-foreground">
        Submitted: {formatTimeAgo(claim.submittedAt)}
      </p>
    </div>

    {/* Sanctuary-aligned warning (if >5 days) - AC5 */}
    {daysPending > 5 && (
      <Alert variant="default" className="mt-4">
        <AlertDescription>
          This claim has been pending for {daysPending} days. The member is
          waiting for your feedback!
        </AlertDescription>
      </Alert>
    )}

    {/* Primary Action (ONE per card) - AC1 */}
    <Button
      variant="default"
      className="w-full"
      onClick={() => handleAssignClaim(claim.id)}
    >
      {assigningClaimId === claim.id ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Assigning...
        </>
      ) : (
        'Start Review'
      )}
    </Button>
  </CardContent>
</Card>
```

**Changes**:

- Remove `<CardHeader>` (reduces vertical height, improves hierarchy)
- Merge metadata into single grouped section (AC2)
- Change button text "Review This Claim" → "Start Review" (AC1 clarity)
- Add conditional warning `<Alert>` for claims >5 days pending (AC5 sanctuary spacing)
- Calculate `daysPending` from `claim.submittedAt`

### Phase 2: Mobile Responsive Adjustments (AC4)

Ensure responsive classes:

```tsx
// Button stacking (mobile vs desktop)
<Button variant="default" className="w-full" onClick={...}>
  Start Review
</Button>
```

**Mobile Checklist** (375px):

- [ ] Cards constrain to viewport (no horizontal scroll)
- [ ] Button full-width on mobile (`className="w-full"`)
- [ ] Text ≥16px body font (default Tailwind classes maintain this)
- [ ] Touch targets ≥44px height (Button component default satisfies this)

### Phase 3: Sanctuary Spacing Polish (AC5)

Apply consistent spacing:

```tsx
// Workload card
<Card>
  <CardHeader>
    <CardTitle className="text-lg">Your Review Workload</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between">
      {/* ... existing content ... */}
    </div>
    {!queueData.canReviewMore && (
      <Alert variant="default" className="mt-4"> {/* mb-4 → mt-4 for spacing from card content */}
        <AlertDescription>
          Please complete or release a review before claiming another.
        </AlertDescription>
      </Alert>
    )}
  </CardContent>
</Card>

// Claims list
<div className="space-y-4"> {/* Consistent spacing between claim cards */}
  {queueData.claims.map((claim) => (
    <Card key={claim.id}>...</Card>
  ))}
</div>
```

**Spacing Guidelines**:

- Between claim cards: `space-y-4` (consistent 16px)
- Inside cards: `space-y-4` for sections
- Alerts: `mt-4` or `mb-4` for breathing room
- Warnings: Dedicated `<Alert>` component, not inline

---

## Reusable Components (from prior stories)

All components already imported and used:

- ✅ `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>` (S1-05)
- ✅ `<Button>` (S1-04)
- ✅ `<Badge>` (S3-02)
- ✅ `<Alert>`, `<AlertDescription>` (S3-03)
- ✅ `<Loader2>` (lucide-react for loading states)

**No new components needed** - reuse existing imports.

---

## Acceptance Criteria Summary (10 ACs)

### Layout & UX (AC1-AC5)

- [ ] **AC1**: One clear primary action ("Start Review"), `variant="default"`
- [ ] **AC2**: Related elements visually grouped (metadata, proof artifacts, actions)
- [ ] **AC3**: Key info visible without scrolling (1024px: Claim ID + Task + Days Pending)
- [ ] **AC4**: Mobile responsive (375px: vertical stack, no horizontal scroll, readable text)
- [ ] **AC5**: Sanctuary spacing (warnings in `<Alert>`, comfortable spacing)

### Quality (AC6-AC8)

- [ ] **AC6**: Keyboard navigation works (tab order follows visual order)
- [ ] **AC7**: No regressions (approve, reject, revise still work)
- [ ] **AC8**: Performance unchanged (no new queries)

### Process Validation (AC9-AC10)

- [ ] **AC9**: QA report includes "Layout/UX Validation" subheading
- [ ] **AC10**: QA engineer feedback on layout checklist effectiveness

---

## Testing Schedule

**Day 5 Manual Testing** (1 hour allocated):

- Desktop: Chrome at 375px, 768px, 1024px
- iOS: Safari on iPhone 13+
- Android: Chrome on Pixel 6+

**Validation Checklist**:

- [ ] Claim ID + Task Name visible without scrolling (1024px)
- [ ] No horizontal scroll at 375px
- [ ] "Start Review" button ≥44px height (mobile touch target)
- [ ] Focus order: List → Detail → "Start Review" button
- [ ] Warning alerts have ≥16px margin-bottom
- [ ] Buttons don't overlap on mobile

---

## Risk Mitigation

**Low Risk** story (pure layout, existing functionality):

1. **Regression risk**: Breaking review assignment flow
   - **Mitigation**: Test "Start Review" button after changes (assign claim → navigate)
   - **Fallback**: Git revert if critical regressions

2. **Mobile layout issues**: 375px edge cases
   - **Mitigation**: Manual testing on actual devices (Day 5)
   - **Fallback**: Simplify to single-column if issues persist

3. **Scope creep**: Reviewer requests additional features
   - **Mitigation**: 5 improvements locked in AC1-AC5, defer extras to S5 backlog

---

## Definition of Done (DoD)

- [ ] All acceptance criteria met (AC1-AC10)
- [ ] 5 specific improvements delivered
- [ ] No functional regressions
- [ ] Day 5 manual testing completed (iOS, Android, Desktop)
- [ ] QA report: PASS with Layout/UX validation subheading
- [ ] QA engineer feedback on layout checklist effectiveness
- [ ] Product Advisor review: Grade B+ or higher
- [ ] Retro file created: `/project/trust-builder/retros/story-S4-05-reviewer-dashboard-layout-retro.md`

---

## Process Goal (Meta)

This story validates the **new layout QA process** introduced in Sprint 4:

- QA catches layout issues BEFORE product-advisor review (shift left)
- Layout checklist proves sufficient (or QA provides improvement feedback)
- Zero layout comments in product-advisor review (validates QA effectiveness)

**QA Engineer**: Please provide feedback in QA report on layout checklist effectiveness (Were the 5 checks sufficient? Any issues missed? Should checklist expand for S5?).

---

## Next Steps

1. Read [`/project/trust-builder/patterns/UI-layout-pattern.md`](/Users/peteargent/apps/000_fe_new/edgetrust/project/trust-builder/patterns/UI-layout-pattern.md) (layout patterns reference)
2. Modify `src/components/trust-builder/ReviewQueue.tsx` (apply layout patterns)
3. Test locally at 375px, 768px, 1024px viewports (responsive verification)
4. Verify no regressions (claim assignment flow works)
5. Hand off to QA for validation (Day 5 manual testing)

**Ready for implementation!** 🚀
