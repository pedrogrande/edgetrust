# Sprint 1 Tickets — Trust Builder (Season 0)

Sprint window: 1–2 weeks (recommended)

This document lists the Sprint 1 tickets created in the task manager, their IDs, owners, story points (Fibonacci), and clear Definitions of Done for sprint planning.

---

## Consolidated Sprint 1 (AI-Agent vertical slices)

We are consolidating Sprint 1 into three AI-optimized macro tickets (vertical feature slices) to enable faster end-to-end generation and verification by AI coding agents. The previous S1-n tickets are superseded by these macro tickets and will be tracked as sub-work where needed.

---

### FE-S1-01: Identity & Mission Foundation (People + Groups)
- **Task ID:** `n3coYXUNxS`
- **Owner:** backend
- **Story Points:** 5
- **DoD:** Magic-link auth implemented & tested; Member ID generation implemented and visible; Groups/Missions schema and seed ('Webinar Series Season 0') created; Membership 'Join Mission' works and writes Events; basic profile and mission list UI.
- **Notes:** Supersedes S1-1 and S1-2 (Auth & Schema).

---

### FE-S1-02: Contract & Submission Engine (Things + Connections)
- **Task ID:** `6uo8TYThLq`
- **Owner:** backend
- **Story Points:** 8
- **DoD:** Admin can publish Task (Draft->Open) with locked fields; Member can Join Mission and Submit a rich-text Claim; Claim records `Submitted` Event; minimal reviewer/approve flow for Season 0; 'Webinar Reflection' seeded.
- **Notes:** Supersedes S1-3, S1-4 and S1-5 (Task Publication + Claim Submission tickets).

---

### FE-S1-03: Immutable Audit Log & Knowledge Dashboard (Events + Knowledge)
- **Task ID:** `QSjROEnOWW`
- **Owner:** infra/backend
- **Story Points:** 5
- **DoD:** Append-only Events used by Join/Publish/Claim flows; DB-level INSERT/SELECT policy documented or applied; Dashboard shows derived Trust Score and incentive breakdown; JSON Export produces member event snapshot; automated check verifies event-approved sums match dashboard Trust Score.
- **Notes:** Supersedes S1-6 (Event Logging & DB immutability ticket).

---

Next steps:
- Assign GitHub usernames to FE-S1-0x tickets and schedule an AI-run/grooming session to provide detailed prompt contexts for the chosen AI agents.
- Keep the old S1-n tickets linked as sub-tasks in the task manager for traceability and progress tracking.

---

Next steps:
- Assign GitHub usernames to these tickets and set sprint start date.
- Run grooming session to add acceptance test checklists and break large backend tasks into developer-level tickets.
- Schedule a short spike for the file-scanning decision and email provider selection.
