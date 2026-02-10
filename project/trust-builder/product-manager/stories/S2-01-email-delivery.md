# Story: Email Delivery for Verification Codes

## Goal

Enable real email delivery for sign-in verification codes so members can complete login without developer console access.

## Complexity (for AI)

Simple

## Ontology Mapping

- Groups: None
- People: Member sign-in identity and session access
- Things: Verification code as temporary auth artifact
- Connections: Email address to member identity
- Events: No new event types; existing `member.created` event remains unchanged
- Knowledge: None

## User Story (Gherkin)

Given a visitor enters their email on the sign-in page
When they request a verification code
Then the system sends a real email containing the 6-digit code
And the code expires in 15 minutes
And the user can verify the code and sign in successfully

## Acceptance Criteria

- [ ] Verification emails are delivered using Resend in non-development environments
- [ ] The email includes the 6-digit code and expiration window
- [ ] No verification code is logged to the server console in production
- [ ] Production fails closed if `RESEND_API_KEY` is missing (returns safe error, no console logging)
- [ ] `RESEND_FROM` is configurable and uses a safe default sender format
- [ ] The existing code generation and expiration logic remains unchanged
- [ ] The sign-in flow remains fully functional end-to-end
- [ ] A development fallback remains available when the Resend API key is missing
- [ ] Mobile and basic accessibility checks pass

## Implementation Notes (AI-facing)

- Update `src/lib/auth/index.ts` to use Resend when `RESEND_API_KEY` is present.
- Add env var documentation for `RESEND_API_KEY` (and optional `RESEND_FROM`).
- Keep the S1 console log fallback behind `import.meta.env.DEV` only.
- Reuse existing endpoints in `src/pages/api/trust-builder/auth/signin.ts` and `verify.ts`.
- Ensure no PII or codes are logged in production logs.
- In production, return a safe error if email delivery is not configured.

## Definition of Done (DoD)

- All acceptance criteria met
- QA report: PASS
- Product Advisor review: Grade B+ or higher
- Retro file created in `/trust-builder/retros/`
