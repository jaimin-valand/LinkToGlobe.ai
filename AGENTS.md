<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# LinkToGlobe — Agent Guide

Rules every coding agent (and human) must follow when working in this repo.
If a rule here conflicts with a request, stop and raise it.

## 1. Project purpose

LinkToGlobe helps a professional turn their knowledge into researched,
quality-reviewed content and — only after explicit human approval — publish it
to external destinations. The long-term pipeline is:

```
USER KNOWLEDGE → RESEARCH → SIGNALS → IDEAS → HOOKS → CONTENT →
QUALITY REVIEW → USER APPROVAL → SCHEDULE / PUBLISH → ANALYTICS → LEARNING
```

See `ARCHITECTURE.md` for module boundaries and `ROADMAP.md` for phasing.
**We are in Phase 1 (Core MVP), with early Phase 2 AI assist.** Do not build
later phases ahead of schedule. Do not add external publishing or any platform
integration without the security review in `SECURITY.md` §6–7.

## 2. Architecture principles

- **Modular monolith.** One Next.js app. Separate concerns by module boundary
  (`src/lib/*`, `src/server/*`, `src/components/*`), not by service. Do not add
  microservices, queues, or extra runtimes without a `DECISIONS.md` entry.
- **The pipeline is data, not hardcoded flow.** `src/lib/pipeline.ts` is the
  single source of truth for stage order. Keep DB enums and docs in sync with it.
- **Provider-agnostic AI layer.** All model calls go through one adapter module
  (Phase 2). No SDK calls scattered through the codebase.
- **Integrations are plugins.** Each external destination implements a common
  interface behind `src/server/integrations/*` (Phase 4).
- **Server/client boundary is sacred.** Secrets and server-only code never cross
  into a Client Component. Only `NEXT_PUBLIC_*` values reach the browser.
- Prefer boring, well-documented solutions. Add a dependency only when it
  clearly beats writing ~50 lines yourself.

## 3. Development commands

| Command                            | Purpose                                   |
| ---------------------------------- | ----------------------------------------- |
| `npm run dev`                      | Local dev server                          |
| `npm run build`                    | Production build (must pass before merge) |
| `npm run start`                    | Serve the production build                |
| `npm run lint`                     | ESLint (must pass, zero warnings)         |
| `npm run typecheck`                | `tsc --noEmit` (must pass)                |
| `npm test`                         | Vitest unit tests (must pass)             |
| `npm run test:watch`               | Vitest in watch mode                      |
| `npm run test:e2e`                 | Playwright end-to-end tests               |
| `npm run format` / `format:check`  | Prettier write / verify                   |
| `npm run db:deploy` / `db:migrate` | Apply / create migrations                 |
| `npm run db:seed` / `db:studio`    | Seed dev account / browse data            |

Local Postgres: `docker compose up -d` (matches the default `DATABASE_URL`).

## 4. Testing requirements

- Every new module in `src/lib` or `src/server` ships with unit tests.
- Tests must be meaningful — assert behavior, not implementation trivia. Do not
  pad the suite with no-op tests.
- User-facing flows get at least one Playwright spec.
- `npm run lint && npm run typecheck && npm test && npm run build` must all pass
  before a change is considered done.

## 5. Security rules (non-negotiable)

- Never request, store, or log a user's password for any external platform.
- Never store external-platform session cookies or auth tokens obtained by
  scraping or automation.
- Never implement stealth/undetected browser automation, CAPTCHA solving, or any
  technique whose purpose is to evade a platform's bot detection.
- Never build mass-like, mass-comment, mass-connect, or mass-message behavior.
- Never bypass authentication, authorization, rate limits, or platform ToS.
- Secrets come from environment variables only. Never commit real secrets.
  `.env.example` holds placeholders only.
- External publishing must always pass through
  `DRAFT → QUALITY CHECK → USER APPROVAL → PUBLISH`. The approval step is a human
  action and cannot be auto-satisfied.
- Full detail in `SECURITY.md`.

## 6. Integration rules

- Use official, documented APIs and official OAuth flows only.
- Respect documented rate limits; back off on errors.
- Each integration is isolated behind the common interface and independently
  disableable.
- No integration is wired up in Phase 0–1.

## 7. Hard "do not" list

- Do not fabricate functionality — no fake data, fake analytics, fake API
  responses, or stubbed UI that pretends to work. Placeholders must clearly say
  they are placeholders.
- Do not collect credentials of any kind.
- Do not bypass or weaken platform policies or safety controls.
- Do not mark future roadmap work as done.
- Do not commit generated files (`src/generated/**`), build output, or `.env*`.
