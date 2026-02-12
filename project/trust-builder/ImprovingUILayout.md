To UI improvements into your agentic system without adding noise:

### 1. Encode layout as an explicit quality dimension

Right now your specs emphasise ontology, events, contracts, testing, and migration readiness; layout is implied under “UX” but not operationalised.

You can:

- Add explicit “Layout & information hierarchy” bullets to:
  - Product-advisor review lens (under UX & human‑centredness).
  - QA’s UI checklist (visual grouping, spacing, alignment, responsive behavior beyond just 375px).
- Add one or two layout‑focused acceptance criteria to relevant stories (e.g., “Key actions are visually primary; supporting info is de‑emphasised”).

This makes layout a first‑class concern, not an afterthought.

### 2. Give the dev agent a simple layout playbook

The fullstack‑developer is using the right components but needs guidance on _composition_.

Add a short layout section or quickref that encodes:

- Common page patterns (dashboard, list + detail, wizard, form).
- Rules of thumb: max width, vertical rhythm, consistent spacing, primary vs secondary actions, empty states.
- A couple of small “before/after” examples referenced from a doc (so you don’t bloat the prompt).

This lives in `project/trust-builder/patterns/UI-layout-pattern.md`

### 3. Tighten review and feedback loops for layout

Have:

- QA explicitly note layout issues in their QA report under a “Layout/UX” subheading, even if functionality passes.
- Product-advisor call out layout problems under “UX & human‑centredness” and factor it into the grade when severe.
- Retro-facilitator add a question: “Where did UI layout or information hierarchy slow us down or confuse users?”

Meta‑coach can then see “bad layout” as a recurring pattern and decide whether to:

- Strengthen the layout playbook.
- Add more concrete layout ACs.
- Propose small design‑system tweaks (e.g., standardising section headers, panel layout).
