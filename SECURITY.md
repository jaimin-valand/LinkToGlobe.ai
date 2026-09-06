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

| Variable                    | Scope  | Phase | Notes                                   |
| --------------------------- | ------ | ----- | --------------------------------------- |
| `NODE_ENV`                  | server | 0     | `development` \| `test` \| `production` |
| `NEXT_PUBLIC_APP_URL`       | client | 0     | public base URL                         |
| `DATABASE_URL`              | server | 1     | PostgreSQL only; optional until Phase 1 |
| `AUTH_SECRET`               | server | 1     | session signing                         |
| `AI_PROVIDER`, `AI_API_KEY` | server | 2     | AI adapter only                         |
| `LINKEDIN_CLIENT_ID/SECRET` | server | 4     | OAuth **app** credentials only          |

## 3. Authentication expectations

- First-party auth (Phase 1): hashed passwords (argon2/bcrypt) or a delegated
  identity provider via OAuth/OIDC. Signed, http-only, `SameSite` session
  cookies. CSRF protection on state-changing requests.
- **LinkToGlobe never asks for, receives, or stores a user's password for any
  external platform.** Access to external platforms is via that platform's
  official OAuth flow only.

## 4. Authorization

- Every server action and route handler checks the authenticated user and their
  right to the specific resource. Default deny.
- The pipeline's human-gate transitions (notably `→ PUBLISH`) require an
  authenticated user with an explicit role/permission.

## 5. Logging

- Never log secrets, tokens, passwords, full request bodies, or PII.
- Structured logs with severity (Phase 6). Approval and publish events go to an
  append-only audit log.
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
- The `PUBLISH` state is only reachable from `USER APPROVAL`.
- Publishing is **not implemented in Step 1 / Phase 0.**
- When built, the approval → publish path is covered by tests that fail if the
  gate can be skipped.

## 8. Dependencies

- Add dependencies deliberately; prefer well-maintained, widely-used packages.
- `npm audit` in CI; dependency and secret scanning added in Phase 6.
- Pin versions where supply-chain risk or instability warrants it (see
  `DECISIONS.md`).

## 9. Reporting a vulnerability

Until a dedicated channel exists, open a private security advisory on the
repository or contact a maintainer directly. Do not file public issues for
suspected vulnerabilities.
