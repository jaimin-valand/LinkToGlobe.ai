# Security Policy

Applies to everyone and every agent working on LinkToGlobe. Rules in
**bold** are non-negotiable and cannot be waived by a feature request.

## 1. Secret handling

- Secrets live in environment variables only. **Never commit a real secret.**
- `.env` and `.env.*` are git-ignored; **only `.env.example` is committed**, and
  it contains placeholders only.
- Server secrets are read exclusively through `getServerEnv()` (`src/lib/env.ts`)
  and must never be imported by a Client Component.
- **Only `NEXT_PUBLIC_*` values may reach the browser.** `getClientEnv()` and the
  `isPublicEnvKey()` check enforce this; a test asserts no secret-shaped key is
  in the client schema.
- Third-party tokens (Phase 4) are encrypted at rest and never logged.

## 2. Environment variables

| Variable                         | Scope  | Required       | Notes                                                 |
| -------------------------------- | ------ | -------------- | ----------------------------------------------------- |
| `NODE_ENV`                       | server | no             | `development` \| `test` \| `production`               |
| `NEXT_PUBLIC_APP_URL`            | client | no             | public base URL (defaults to `http://localhost:3000`) |
| `DATABASE_URL`                   | server | **yes**        | PostgreSQL connection string only                     |
| `AUTH_SECRET`                    | server | **yes**        | ≥16 chars; signs session cookies                      |
| `AI_PROVIDER`                    | server | no             | `manual` (default) \| `anthropic`                     |
| `AI_API_KEY`, `AI_MODEL`         | server | if `anthropic` | AI adapter only; never sent to the client             |
| `SEED_USER_EMAIL` / `_PASSWORD`  | server | no             | dev seed convenience only                             |
| `LINKEDIN_CLIENT_ID` / `_SECRET` | server | no             | reserved for Phase 4 OAuth **app** credentials only   |

## 3. Authentication expectations

- First-party auth (implemented): passwords hashed with `scrypt` (Node built-in,
  per-password random salt, constant-time verify). Sessions are a stateless
  HMAC-signed cookie (`AUTH_SECRET`), `httpOnly`, `SameSite=Lax`, `Secure` in
  production, 7-day TTL. Server Actions are same-origin POSTs (Next.js enforces
  origin checks); a dedicated CSRF token is a Phase 6 item.
- **LinkToGlobe never asks for, receives, or stores a user's password for any
  external platform.** Access to external platforms is via that platform's
  official OAuth flow only.

## 4. Authorization

- Every Server Action and route handler resolves the session via `requireUser()`
  and scopes every query by `userId`. A draft is only ever loaded with
  `where: { id, userId }`. Default deny.
- Lifecycle transitions run through a server-side state machine
  (`src/server/content/state.ts`). The UI can only _request_ a transition; an
  illegal one (e.g. `QUALITY_CHECK → PUBLISHED`) throws. Covered by tests.
- `→ PUBLISHED` is reachable only from `USER_APPROVAL` via an authenticated
  human action. There is no system path that approves content.

## 5. Logging

- Never log secrets, tokens, passwords, full request bodies, or PII.
- Every lifecycle action (create, update, submit, quality run, approve, reject,
  publish, delete) is written to an append-only `ActivityLog` row with the
  acting `userId`. Tamper-evidence and retention are Phase 6.
- Structured application logging is Phase 6.
- Client errors are reported without leaking stack internals to end users.

## 6. External integrations

- **Official, documented APIs and OAuth flows only.**
- **No scraping of authenticated pages, no storing of platform session
  cookies, no stealth/undetected automation, no CAPTCHA solving/bypassing.**
- **No bulk engagement:** no mass-like, mass-comment, mass-connect, mass-follow,
  or mass-message features.
- **Never bypass** rate limits, bot detection, ToS, or platform restrictions.
  Respect documented limits and back off on errors.
- Each integration requests the minimum OAuth scopes, is feature-flagged, and
  can be revoked/disabled independently.

## 7. External publishing safety

Every externally published item MUST pass through, in order:

```
DRAFT → QUALITY CHECK → USER APPROVAL → PUBLISH
```

- `USER APPROVAL` is a deliberate action by an authenticated human. It cannot be
  auto-approved, defaulted, or satisfied by a system account.
- The `PUBLISHED` state is only reachable from `USER_APPROVAL`. The state machine
  and its tests fail if this is bypassed.
- **There is no external publishing.** "Approve & publish" sets the draft to
  `PUBLISHED` and records the approval in the activity log — nothing leaves the
  application. See ADR-0011.
- Adding a real destination (Phase 4) requires: official API + OAuth only, no
  stored end-user platform passwords or cookies, per-destination policy checks,
  and the approval gate unchanged.

## 7a. AI usage

- Model access is confined to `src/server/ai`. The default provider (`manual`)
  makes no external calls.
- AI output is **advisory only** — shown in the editor for the user to accept
  explicitly. It is never written into a draft, submitted, or published
  automatically. The human approves every word that reaches `PUBLISHED`.
- Prompts instruct the model not to invent statistics, quotes, or sources; the
  deterministic quality engine independently flags unsupported claims.

## 8. Dependencies

- Add dependencies deliberately; prefer well-maintained, widely-used packages.
- `npm audit` in CI; dependency and secret scanning added in Phase 6.
- Pin versions where supply-chain risk or instability warrants it (see
  `DECISIONS.md`).

## 9. Reporting a vulnerability

Until a dedicated channel exists, open a private security advisory on the
repository or contact a maintainer directly. Do not file public issues for
suspected vulnerabilities.
