# UI Layout Pattern – Clear, Calm Screens (Tailwind + shadcn)

Purpose: Help developers and reviewers arrange already-correct shadcn components into layouts that feel obvious, calm, and sanctuary-aligned.

Assumption: Components, copy, and data are correct; you focus on **where** and **how** they appear on the screen.

---

## 1. Core layout principles

Use these rules on every screen:

- One primary action per screen
  - Use a single `<Button variant="default">` as the main action.
  - Secondary actions use `variant="outline"` or `variant="ghost"` and sit away from the primary button.

- Single visual hierarchy
  - Top: `h1` or `<CardHeader>` with title.
  - Middle: key summary + primary action.
  - Bottom: secondary details in `<Tabs>`, `<Accordion>`, or secondary `<Card>`s.

- Logical grouping
  - Use `<Card>`, `<Separator>`, and spacing (`space-y-*`) to group related inputs and actions.
  - Label sections with `h2`/`h3` or `<CardTitle>`.

- Comfortable spacing
  - Wrap main content in `container max-w-2xl mx-auto` (forms) or `container max-w-6xl mx-auto` (list + detail).
  - Use `space-y-4` or `space-y-6` for vertical rhythm between sections.

- Sanctuary feel in layout
  - Avoid edge-to-edge walls of UI; keep `p-4` or `p-6` inside cards.
  - Place warnings and errors in dedicated areas (`<Alert variant="destructive">`) with breathing room.

---

## 2. Standard page patterns

### 2.1 List + detail layout

Use when a member selects an item and then works on it (tasks, claims, reviews).

**Tailwind + shadcn skeleton:**

```tsx
<div className="container max-w-6xl mx-auto py-6">
  <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    {/* List */}
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Claims</CardTitle>
        <CardDescription>Select a claim to review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 overflow-y-auto max-h-[70vh]">
        {/* List items go here */}
      </CardContent>
    </Card>

    {/* Detail */}
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Claim #1234</CardTitle>
        <CardDescription>
          Submitted by Alex, 50 points requested.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary, fields, notes */}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button variant="outline">Request changes</Button>
        <div className="space-x-2">
          <Button variant="ghost">Skip</Button>
          <Button>Approve claim</Button>
        </div>
      </CardFooter>
    </Card>
  </div>
</div>
```

Checklist:

- The currently selected list item is highlighted (e.g., `bg-muted` + `rounded-md`).
- On desktop, the primary decision button is visible without scrolling.
- History/metadata sits below the main decision area inside `CardContent`.

---

### 2.2 Single-column form layout

Use for focused tasks (submit claim, edit profile).

**Tailwind + shadcn skeleton:**

```tsx
<div className="container max-w-2xl mx-auto py-6">
  <Card>
    <CardHeader>
      <CardTitle>Submit a claim</CardTitle>
      <CardDescription>
        Tell us what you did and attach any supporting evidence.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={4} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachment">Attachments</Label>
        {/* Upload component */}
      </div>
    </CardContent>
    <CardFooter className="flex items-center justify-between">
      <Button variant="ghost">Cancel</Button>
      <Button>Submit claim</Button>
    </CardFooter>
  </Card>
</div>
```

Checklist:

- `max-w-2xl mx-auto` keeps the form readable on large screens.
- Inputs are stacked with `space-y-2`; labels are left-aligned.
- The submit button is clearly the primary action and aligned with the form.

---

### 2.3 Wizard / multi-step flow

Use for longer flows where context matters.

**Tailwind + shadcn skeleton:**

```tsx
<div className="container max-w-2xl mx-auto py-6 space-y-4">
  {/* Simple step indicator */}
  <div className="flex items-center justify-between text-sm text-muted-foreground">
    <span>Step 2 of 4</span>
    <span>Attach evidence</span>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Attach evidence</CardTitle>
      <CardDescription>
        Upload files that show what you completed.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Step-specific fields */}
    </CardContent>
    <CardFooter className="flex items-center justify-between">
      <Button variant="outline">Back</Button>
      <Button>Next</Button>
    </CardFooter>
  </Card>
</div>
```

Checklist:

- Step label clearly describes the outcome (“Attach evidence” rather than “Step 2”).
- Only one major decision per step.
- Back/Next are consistently placed in `CardFooter`.

---

## 3. Layout checks by role

### 3.1 Developer quick checks

Before handing to QA:

- Layout:
  - Is the content wrapped in an appropriate container (`max-w-2xl` or `max-w-6xl`)?
  - Are related elements grouped using `space-y-*`, `Card`, and clear headings?
- Primary action:
  - Is there one obvious primary `<Button>`?
  - Are destructive actions `variant="destructive"` and visually separated?
- Responsiveness:
  - On mobile, do cards stack (`grid` → `flex-col` or `space-y-*`) without awkward horizontal scrolling?

If any answer is “no”, adjust Tailwind classes or card structure.

### 3.2 QA layout checklist

In addition to functional tests, check:

- Information hierarchy:
  - Is there a clear `CardTitle` / `h1` that matches the member’s task?
  - Is the primary action visible without unnecessary scrolling on a laptop viewport?
- Visual grouping:
  - Are related fields grouped with consistent spacing and labels?
  - Are error messages inside or very near the corresponding `CardContent` section?
- Responsiveness & accessibility:
  - At ~375px width, everything is usable; buttons are full-width or comfortably wide.
  - Keyboard focus order matches visual order; focus outlines are visible.

Record layout issues under a “Layout/UX” subheading in your QA notes.

### 3.3 Product Advisor UX lens

When assessing UX & sanctuary:

- Check that:
  - Layout supports calm decision-making (no dense clusters near critical actions).
  - Warnings/errors use `<Alert>` or clear text near the relevant area.
- Downgrade UX if:
  - Primary action is hard to find because multiple buttons look equally important.
  - Critical warnings are off-screen or buried under less important content.

---

## 4. When to escalate layout concerns

Escalate layout questions instead of accepting “good enough”:

- A new screen doesn’t fit any of the patterns above.
- Multiple retros mention “confusing layout” or “hard to know what to do first”.
- Youth testers struggle to find the primary action or understand where to start.

In these cases:

- Product Owner should add a simple layout hint or wireframe to the story.
- Meta-Coach may:
  - Add layout items to dev/QA checklists.
  - Update this pattern doc if a new reusable layout emerges.
