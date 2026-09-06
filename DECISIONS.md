# Architecture Decision Record

Newest first. Each entry: context, decision, rationale, alternatives, status.

---

## ADR-0011 — "Publish" is internal-only until an integration exists

- **Context:** Phase 1 needs a terminal state after approval, but external
  publishing (LinkedIn etc.) is explicitly out of scope and gated on a security
  review (`SECURITY.md` §6–7).
- **Decision:** Approving a draft sets `state = PUBLISHED` and `publishedAt`, and
  writes `draft.published` to the activity log with `destination: "internal"`.
  No network call leaves the app.
- **Rationale:** Exercises the full `DRAFT → QUALITY CHECK → USER APPROVAL →
PUBLISH` gate and state machine now, without taking on integration risk.
- **Alternatives:** Stop at an `APPROVED` state (less faithful to the pipeline);
  build a real integration now (blocked by policy + no OAuth app).
- **Status:** Accepted. Phase 4 adds real destinations behind the `Integration`
  interface; the approval gate stays mandatory.

## ADR-0010 — AI layer: two providers, "manual" is the default

- **Context:** The product wants AI assistance but must run with zero external
  dependencies and must never fabricate content silently.
- **Decision:** One `AiProvider` interface with `manual` (no-op, default) and
  `anthropic` (Anthropic REST API via `fetch`, no SDK) implementations, chosen
  by `AI_PROVIDER`. Every AI output is advisory — surfaced in the UI for the
  user to accept explicitly, never written to a draft automatically. The manual
  provider returns a "disabled" result rather than any placeholder text.
- **Rationale:** Keeps the app fully usable offline; keeps model access behind
  one swappable boundary; keeps the human in control of every word published.
- **Alternatives:** Hard dependency on one vendor SDK; auto-applying generated
  text (rejected — violates the no-fabrication rule and the approval model).
- **Status:** Accepted.

## ADR-0009 — Auth: scrypt + stateless signed-cookie sessions

- **Context:** Phase 1 needs accounts without pulling in a heavy auth framework
  or a session store on day one.
- **Decision:** Passwords hashed with Node's built-in `scrypt` (no native
  module). Sessions are a stateless `payload.hmac` cookie signed with
  `AUTH_SECRET`, httpOnly + SameSite=Lax, 7-day TTL. `SESSION_COOKIE` lives in a
  crypto-free module so Edge middleware can import it.
- **Rationale:** No extra dependencies; standard primitives; a DB-backed session
  store (for revocation) can replace `session.ts` without touching callers.
- **Alternatives:** NextAuth/Auth.js (more than needed now); argon2 (native
  build friction on Windows); DB sessions (added complexity before it pays off).
- **Status:** Accepted. Revisit when multi-user / SSO lands.

## ADR-0008 — DATABASE_URL and AUTH_SECRET are now required

- **Context:** Phase 0 allowed the app to boot with no database. Phase 1 depends
  on persistence and sessions.
- **Decision:** `serverEnvSchema` now requires a PostgreSQL `DATABASE_URL` and a
  ≥16-char `AUTH_SECRET`; `getServerEnv()` also fails fast if
  `AI_PROVIDER=anthropic` without `AI_API_KEY`.
- **Status:** Accepted.

## ADR-0007 — Prisma pinned to 6.19.3

- **Context:** On the registry today, `prisma@latest` resolves to an `8.x`
  release candidate and `@prisma/client@latest` to `7.10.0`. Prisma 7 removes
  `datasource { url = env(...) }` from the schema in favour of a `prisma.config.ts`
  plus a driver adapter passed to `PrismaClient` — a real config shift with no
  benefit for a Phase 0 foundation that has no database yet.
- **Decision:** Pin both `prisma` and `@prisma/client` to exactly `6.19.3`
  (the last v6 stable), using the classic schema-based datasource.
- **Rationale:** A foundation should sit on a stable release with the simplest
  viable configuration. Migrating to the Prisma 7/8 adapter model is a
  deliberate task for Phase 1 when the database is actually provisioned.
- **Alternatives:** Prisma 7.10.0 with `prisma.config.ts` + `@prisma/adapter-pg`
  (more moving parts now, no payoff); Drizzle ORM (team prefers Prisma's
  schema-first workflow and migration tooling).
- **Status:** Accepted. Revisit the Prisma 7/8 upgrade in Phase 1.

## ADR-0006 — Vitest for unit tests, Playwright for E2E

- **Decision:** Vitest + React Testing Library for units; Playwright for E2E.
- **Rationale:** Vitest shares Vite's transform pipeline (fast, ESM/TS native)
  and integrates cleanly with the Next.js guide. Playwright is the current
  standard for cross-browser E2E.
- **Alternatives:** Jest (slower TS/ESM story); Cypress (heavier, single-process).
- **Status:** Accepted.

## ADR-0005 — Zod for runtime validation

- **Decision:** Validate all external input and environment config with Zod.
- **Rationale:** One schema yields both runtime checks and static types; used
  for env parsing today, request/response validation later.
- **Alternatives:** Valibot (smaller, less ecosystem); hand-written guards.
- **Status:** Accepted.

## ADR-0004 — Tailwind CSS v4 with CSS-variable design tokens

- **Decision:** Tailwind v4 (`@import "tailwindcss"`, `@theme`), with brand
  tokens defined as CSS custom properties in `globals.css`.
- **Rationale:** v4 is the current major; CSS-variable tokens keep the design
  system themeable and framework-portable. Original palette — not LinkedIn's.
- **Alternatives:** CSS Modules; a component library (premature).
- **Status:** Accepted.

## ADR-0003 — PostgreSQL as the primary datastore

- **Decision:** PostgreSQL.
- **Rationale:** Relational data (users, drafts, approvals, analytics), strong
  ecosystem, JSONB where flexibility is needed, widely hosted.
- **Alternatives:** SQLite (dev-only ceiling); MongoDB (weaker fit for the
  relational approval/audit model).
- **Status:** Accepted. Not provisioned until Phase 1.

## ADR-0002 — Modular monolith, not microservices

- **Decision:** One Next.js application with enforced internal module
  boundaries. No separate services, message brokers, or extra runtimes in the
  foreseeable phases.
- **Rationale:** The pipeline is a sequence of transformations on shared data;
  a single process with clear boundaries is simpler to build, test, deploy, and
  reason about. Splitting can come later behind the same interfaces.
- **Alternatives:** Service-per-stage (operational overhead with no current
  benefit); serverless functions per stage (state and local-dev friction).
- **Status:** Accepted.

## ADR-0001 — Next.js (App Router) + TypeScript + React

- **Context:** Need SSR-capable UI, a server runtime for pipeline orchestration,
  and one language across the stack.
- **Decision:** Next.js 16 (App Router, `src/` dir), React 19, TypeScript 5,
  bootstrapped with `create-next-app`.
- **Rationale:** Co-locates UI and server logic, first-class TypeScript, strong
  hosting story, large talent pool. `create-next-app` gives a maintained
  baseline (its generated `AGENTS.md` Next.js block is kept intentionally).
- **Alternatives:** Remix/React Router 7 (viable; smaller ecosystem for our
  needs); SvelteKit (team is React-first); separate SPA + API (more moving
  parts).
- **Status:** Accepted.
