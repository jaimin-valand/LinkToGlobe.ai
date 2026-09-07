# Architecture Decision Record

Newest first. Each entry: context, decision, rationale, alternatives, status.

---

## ADR-0018 — Hook Lab: AI drafts, deterministic code judges

- **Context:** The pipeline needs a hook-generation stage. Generating varied
  opening lines is a good fit for a language model; judging them must be
  testable and must never launder an invented fact into the draft.
- **Decision:** `src/server/hooks/` splits the two. Generation is one advisory
  `AiProvider.draftHooks` call, constrained to the idea's own material. Scoring
  is deterministic pure functions — strategy classification from surface shape,
  relevance by content-word overlap with the idea, a clarity index over a few
  concrete signals, and pairwise differentiation across the lab. A candidate
  that contains a figure absent from the idea's notes is flagged, not hidden.
  Scores are frozen on insert; differentiation is recomputed on read because it
  depends on the whole set. The manual path (write your own candidate, same
  scoring) always works, so Hook Lab is usable with no AI configured.
- **Rationale:** Mirrors ADR-0015 (research analysis is deterministic). The
  model helps with wording; the numbers a user sees are reproducible and
  covered by tests.
- **Alternatives:** Ask the model to also score and rank (rejected — not
  reproducible, and it would be judging its own output); a fixed template
  generator with no AI (weak variety, and the seam already exists).
- **Status:** Accepted.

## ADR-0017 — Idea → draft is a one-way seed, not a live link

- **Context:** Research produces `Idea`s; the content pipeline starts at a
  `ContentDraft`. The two need connecting without coupling the research analysis
  to the publishing state machine.
- **Decision:** "Turn into draft" copies the idea's fields into a new `DRAFT`
  once: `title → title`, `angle → hook`, `notes` + `sourceUrls → sourceNotes`.
  The body is never pre-filled. `ContentDraft.originIdeaId` is a unique nullable
  column, so an idea has at most one draft and re-converting is idempotent.
  Converting a `NEW` idea moves it to `IN_PROGRESS`. After creation the two
  records are independent — editing the draft does not touch the idea, and the
  idea is kept only for provenance and its sources.
- **Rationale:** The draft is the unit of work from that point on. A live
  binding would raise questions the product does not need yet (what does editing
  the idea do to an approved draft?). The state machine and quality engine are
  unchanged.
- **Alternatives:** A live idea↔draft binding (premature coupling); generating
  body text from the idea via AI on conversion (rejected — the body stays a
  human decision, and AI assist is already available inside the editor).
- **Status:** Accepted.

## ADR-0016 — Research provider abstraction; Tavily + Google Programmable Search

- **Context:** Research needs current, citable sources. The domain must not be
  coupled to one vendor, and the product must never scrape.
- **Decision:** `src/server/research/` defines a `ResearchProvider` interface
  (`search(query, options) → normalised sources`) with a typed error taxonomy
  (`NotConfigured`/`Auth`/`RateLimit`/`Timeout`/`Response`/`Malformed`). Adapters:
  **Tavily** (`RESEARCH_PROVIDER=tavily`) and **Google Programmable Search /
  Custom Search JSON API** (`RESEARCH_PROVIDER=google`, `RESEARCH_API_KEY` +
  `RESEARCH_GOOGLE_CX`). Both are official licensed APIs. `RESEARCH_GOOGLE_CX`
  is the one provider-specific variable and is genuinely required by Google.
- **Rationale:** One integration surface; the analysis pipeline never imports a
  vendor SDK; a new provider is a new file plus one line in `provider.ts`.
- **Status:** Accepted.

## ADR-0015 — Research analysis is deterministic in this slice

- **Context:** Clustering, signals, and relevance could use AI, but the task
  requires a testable, reproducible first version and forbids fabricated
  evidence or claimed understanding the system does not have.
- **Decision:** Clustering (title-token similarity with same-publisher /
  same-week nudges), relevance (weighted keyword overlap + a recency bonus that
  only applies on top of a real content match, with a shown breakdown), and
  signal extraction (`RISING`/`RECURRING`/`UNUSUAL`/`CHANGE`/`GAP`) are all
  deterministic pure functions. Every signal records its supporting source ids;
  a signal that is our own inference across sources is marked `INFERENCE`. AI is
  not used in the research path. The `getAi()` seam is available for a later
  advisory enhancement (cluster summaries, angle drafting).
- **Status:** Accepted; AI-assisted enhancement is a follow-up.

## ADR-0014 — `fixture` research provider for dev and E2E

- **Context:** Authenticated end-to-end tests of the research flow need
  deterministic provider output, and there is no research API key in CI or dev.
- **Decision:** A `fixture` provider returns fixed placeholder sources
  (`example.com`, `[fixture]` titles). `getResearchProvider()` refuses it when
  `NODE_ENV=production`; the Research page shows a "Fixture provider active,
  not real research" banner. Playwright's dev webServer sets
  `RESEARCH_PROVIDER=fixture`.
- **Rationale:** Real end-to-end coverage of search → clusters → signals →
  save-as-idea without a key, and no path to it in production.
- **Status:** Accepted.

## ADR-0013 — Integration registry declares every external connection

- **Context:** The product will connect to AI, research, LinkedIn, email,
  company-data and calendar providers. These arrive over many phases, but the
  boundary should exist now so features can be added without reshaping the app.
- **Decision:** `src/server/integrations/` holds a declarative registry: each
  connection lists its id, category, required env vars, capabilities and safety
  notes, plus an `implemented` flag. `listIntegrations()` checks env presence
  only — no network calls, no SDK imports. `/settings/integrations` renders the
  live state ("Connected" / "Not configured" / "Boundary only").
- **Rationale:** One place to see what is wired up; a real "Not configured"
  state instead of fake buttons; adding a provider is a new folder plus a
  registry line.
- **Alternatives:** Ad-hoc `process.env` checks scattered through features
  (no overview, easy to fake); a full plugin system (premature).
- **Status:** Accepted. AI (Anthropic + OpenAI) is implemented; the rest are
  boundary-only.

## ADR-0012 — AI layer supports OpenAI alongside Anthropic

- **Context:** ADR-0010 established a provider-agnostic AI interface with
  `manual` and `anthropic`. OpenAI is now also wanted.
- **Decision:** Add `src/server/ai/openai.ts` implementing the same
  `AiProvider` interface via the Chat Completions REST API (no SDK).
  `AI_PROVIDER` gains `openai`; `getAi()` selects it when `OPENAI_API_KEY` is
  set. `AI_MODEL` is the single model knob for whichever provider is active.
- **Rationale:** The interface already existed; this is a second implementation,
  not a change to callers. Still no vendor SDK in the dependency tree.
- **Status:** Accepted.

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
  crypto-free module so the Edge proxy (`src/proxy.ts`) can import it.
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
