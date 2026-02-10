# Sprint 2 — Trust Builder (Season 0)

**Sprint window**: February 11–15, 2026 (5 days)  
**Velocity target**: 30-35 story points  
**Goal**: Unblock real sign-in, enable admin task creation, and add complex verification capabilities (file uploads + peer review) while preserving migration readiness.

---

## Dependency Graph

```
S2-01 Email Delivery
      │
      ├──► S2-02 Admin Task Creation
      │        │
      │        └──► S2-04 Peer Review Workflow
      │
      ├──► S2-03 File Upload + Hashing
      │
      └──► S2-05 Role Promotion
```

---

## Tickets

### S2-01: Email Delivery for Verification Codes

- **Points**: 2
- **Agent**: `fullstack-developer`
- **Ontology**: People
- **Depends on**: S1-02 (Auth) — Complete

**Scope**:

- Integrate Resend email API for verification codes
- Add `RESEND_API_KEY` env var support
- Keep dev fallback when key is missing
- Ensure no codes or PII logged in production

**DoD**:

- [ ] Email delivered to inbox with 6-digit code
- [ ] Sign-in flow remains functional
- [ ] No console logging of codes in production

---

### S2-02: Admin Task Creation (Draft to Open)

- **Points**: 6
- **Agent**: `fullstack-developer`
- **Ontology**: Groups + Things + Events
- **Depends on**: S1-01 (Schema), S1-02 (Auth)

**Scope**:

- Admin UI to create Draft tasks
- Publish Draft tasks to Open (immutability lock)
- Log `task.created` and `task.published` events
- Role guard for Admin/Guardian

**DoD**:

- [ ] Draft tasks created and stored
- [ ] Open tasks immutable for core fields
- [ ] Events logged on create/publish

---

### S2-03: File Upload Proofs with SHA-256 Hashing

- **Points**: 7
- **Agent**: `fullstack-developer`
- **Ontology**: Connections + Events
- **Depends on**: S1-04 (Claims) — Complete

**Scope**:

- File upload input for `proof_type = 'file'`
- SHA-256 hashing before storage
- Store hash in proofs table and event metadata
- Private storage + signed URL access
- Enforce file size/type limits

**DoD**:

- [ ] File uploads work end-to-end
- [ ] Hash stored and logged
- [ ] Security limits enforced

---

### S2-04: Peer Review Workflow

- **Points**: 8
- **Agent**: `fullstack-developer`
- **Ontology**: Connections + Events + People
- **Depends on**: S1-04 (Claims), S2-05 (Role Promotion) for reviewer eligibility

**Scope**:

- Reviewer queue and assignment
- Claim state machine transitions (under_review, revision_requested, approved, rejected)
- Reviewer eligibility and self-review prevention
- Log review-related events

**DoD**:

- [ ] Review queue functional
- [ ] All review transitions supported
- [ ] Events logged for all review actions

---

### S2-05: Trust-Threshold Role Promotion

- **Points**: 5
- **Agent**: `fullstack-developer`
- **Ontology**: People + Events + Knowledge
- **Depends on**: S1-04 (Claims)

**Scope**:

- Auto-promote roles at trust thresholds
- Log `member.role_promoted` events
- Ensure idempotent promotions

**DoD**:

- [ ] Roles update at thresholds
- [ ] Promotion events logged
- [ ] No duplicate promotion events

---

## Sprint 2 Ceremonies

| Ceremony      | When              | Agent                                                              |
| ------------- | ----------------- | ------------------------------------------------------------------ |
| Story handoff | Before each story | `product-owner` → `fullstack-developer`                            |
| Story review  | After each story  | `qa-engineer` validates AC, `product-advisor` grades ontology      |
| Sprint retro  | End of sprint     | `retro-facilitator` captures lessons in `retros/sprint-2-retro.md` |

---

_Sprint 2 planned by Product Owner — 2026-02-10_
