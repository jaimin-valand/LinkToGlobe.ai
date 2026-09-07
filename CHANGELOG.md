# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — idea to draft

- **Turn an idea into a draft.** The `/ideas/[id]` page has a "Turn into draft"
  action that creates a `DRAFT` `ContentDraft` from the idea: the idea's angle
  becomes the hook, its notes and source URLs carry into the draft's source
  notes, and the body is left for you to write. The draft opens in the existing
  editor and moves through the unchanged `DRAFT → QUALITY_CHECK → USER_APPROVAL
  → PUBLISHED` state machine.
- **Idempotent.** An idea maps to at most one draft (`ContentDraft.originIdeaId`
  is unique). Converting again opens the existing draft. Converting a `NEW` idea
  moves it to `IN_PROGRESS`.
- **Provenance both ways.** The draft shows "From idea …"; the idea shows the
  draft and its current state.
- **Prisma** — migration `20260907120000_idea_to_draft`: one nullable
  `ContentDraft.originIdeaId` with a unique index and a `SET NULL` foreign key.
  Additive; existing tables and rows untouched.
- Activity log gains `idea.converted`; the analytics feed labels
  `research.completed`, `idea.saved` and `idea.converted`.
- New unit tests for `createDraftFromIdea` (mapping, idempotency, status change,
  ownership scoping, field clamping); the fixture-provider E2E now continues
  from a saved idea through to an opened draft.

### Added — research intelligence (Phase 2, first slice)

- **Flow**: `query → ResearchRun → sources → clusters → signals → relevance →
  opportunity → saved Idea`, all user-owned. `/research`, `/research/[runId]`,
  `/ideas`, `/ideas/[id]`.
- **Provider abstraction** (`src/server/research/`): a vendor-neutral
  `ResearchProvider` interface with a typed error taxonomy. Implementations:
  - **Tavily** (`RESEARCH_PROVIDER=tavily`)
  - **Google Programmable Search** (`RESEARCH_PROVIDER=google`, needs
    `RESEARCH_API_KEY` + `RESEARCH_GOOGLE_CX`)
  - **fixture** — deterministic placeholder results for dev/E2E, refused in
    production, clearly labelled in the UI.
- **Deterministic analysis** — URL canonicalisation + dedupe, story clustering
  (title token similarity, same-publisher / same-week nudges), heuristic
  relevance scoring against your `KnowledgeProfile` with a shown breakdown, and
  signal extraction (`RISING` / `RECURRING` / `UNUSUAL` / `CHANGE` / `GAP`).
  Every signal keeps the ids of its supporting sources; inferences are marked
  `INFERENCE`, not passed off as stated fact. No AI in this path.
- **Idea model** — save a signal's opportunity as an `Idea` (title, angle,
  notes, source URLs), linked back to the signal.
- **Prisma** — new models `ResearchRun`, `ResearchSource`, `StoryCluster`,
  `Signal`, `Idea`; enums `ResearchRunStatus`, `SignalKind`, `EvidenceKind`,
  `IdeaStatus`; migration `20260907051747_research_intelligence` (additive).
- **AI providers** — added **Google Gemini** (`AI_PROVIDER=gemini`,
  `GEMINI_API_KEY`) alongside Anthropic and OpenAI. Same advisory-only contract.
- Per-user rate limiting on research runs; safe error messages (no provider
  internals or keys reach the client); provider excerpts rendered as plain
  text.
- 68 new unit tests (URL, normalisation, both search providers, Gemini,
  clustering, relevance, signals, opportunity, provider config, service-layer
  ownership + persistence + dedupe). New E2E: unauthenticated redirects, and
  the full fixture-provider flow through to a saved idea.
- Vitest now runs in the `node` environment (all tests are pure logic) — the
  suite is ~8× faster.

### Added — integration boundaries

- `src/server/integrations/` registry: a declaration of every external service
  the product will connect to (AI, research, LinkedIn, email, company/people
  data, calendar) with required env vars, capabilities and safety notes.
- `/settings/integrations` page showing the live state of each connection
  ("Connected", "Not configured", "Boundary only"). Read-only, no fake actions.
- OpenAI provider (`src/server/ai/openai.ts`) alongside the existing Anthropic
  one. `AI_PROVIDER` now accepts `openai`.
- `.env.example` lists the variable names for every future integration. All are
  optional; the app runs with none set. No secrets, no invented values.
- `src/lib/env.ts` parses the new variables as optional and fails fast only if
  `AI_PROVIDER` names a provider whose key is missing.

### Changed

- Renamed the product to **LinkToGlobe.ai** throughout the UI and docs.
- Rewrote all user-facing text in plain UK English: shorter sentences, no
  jargon or em dashes, consistent wording across every screen. Meaning and
  behaviour unchanged.
- Header navigation now works on small screens (scrolls instead of overflowing).
- The pipeline stages on the overview link to their pages when signed in.
- Drafts list has a status filter (All / Draft / Quality check / Awaiting
  approval / Published / Rejected).
- Submitting a draft for review now saves any unsaved edits first.
- Delete and "Approve and publish" ask for confirmation.
- A failed sign-in keeps the email address in the box.
- Knowledge and draft editors are fully controlled, so saved values stay put.
- Activity feed shows readable labels instead of internal action codes.
- Dates display in UK format.

### Fixed

- Quality report no longer prints an internal regular expression when it finds
  leftover placeholder text.

### Added — Phase 1 (Core MVP) + early Phase 2 (AI assist)

- **Database**: PostgreSQL via Prisma 6. Schema for `User`, `KnowledgeProfile`,
  `ContentDraft`, `QualityReport`, `ActivityLog`; committed init migration;
  `docker-compose.yml` for local Postgres; `prisma/seed.ts` and `npm run db:*`
  scripts.
- **Auth**: email/password accounts, scrypt hashing (Node built-in), stateless
  signed-cookie sessions, `requireUser()` guard, a route proxy (`src/proxy.ts`),
  `/login` and `/logout`.
- **Knowledge** (`/knowledge`): capture headline, expertise, audience, tone,
  topics, and reference material — the `USER_KNOWLEDGE` stage.
- **Drafts** (`/drafts`, `/drafts/new`, `/drafts/[id]`): create, edit, delete,
  and move a draft through the lifecycle.
- **Quality engine** (`src/server/quality`): deterministic, offline checks
  (title, hook, substance, placeholders, unsupported claims, links, tone) that
  produce a stored `QualityReport` and gate progression.
- **Approval workflow**: server-enforced state machine
  `DRAFT → QUALITY_CHECK → USER_APPROVAL → PUBLISHED` with a `REJECTED` off-ramp;
  `/approvals` queue; approve / reject-with-reason / request-changes.
  "Publish" records approval internally — there is no external destination.
- **AI provider layer** (`src/server/ai`): `manual` (default, no-op) and
  `anthropic` providers behind one interface. AI-assisted topic ideas, hook
  options, body drafting, and editorial review — all advisory and never applied
  without an explicit click.
- **Analytics** (`/analytics`): real counts by state, approval rate, average
  time-to-approve, recent activity. No fabricated performance metrics.
- **Audit**: every lifecycle action is written to an append-only `ActivityLog`.
- Env schema now requires `DATABASE_URL` and `AUTH_SECRET`; adds `AI_*` config.
- `scripts/localdb.mjs` + `npm run db:up` / `db:down` to run a portable local
  PostgreSQL with no Docker and no installer (dev convenience).
- Tests: quality engine, content state machine, password hashing, session
  tokens (32 unit tests total).

### Changed

- Home page reflects which pipeline stages are live vs planned.
- Navigation shows Knowledge / Drafts / Approvals / Analytics when signed in.

### Removed

- Static `/pipeline` placeholder page and the `PlaceholderPage` component.

## [0.1.0] — 2026-09-06

### Added — Phase 0: Foundation & Architecture

- Next.js 16 (App Router, `src/`) + React 19 + TypeScript 5 project scaffold.
- Tailwind CSS v4 with an original LinkToGlobe.ai design-token palette and logo mark.
- Application shell: root layout, responsive header with navigation placeholder,
  footer, skip link, `error`/`global-error`/`loading`/`not-found` boundaries,
  and honest placeholder pages for Pipeline / Approvals / Analytics.
- Content pipeline expressed as data in `src/lib/pipeline.ts`
  (`PIPELINE_STAGES`, stage metadata, `APPROVAL_LIFECYCLE`).
- Zod-validated environment config with an enforced server/client secret split
  (`src/lib/env.ts`).
- Prisma 6 schema draft (`User`, `ContentDraft`, `ApprovalState`) and client
  singleton — no database provisioned, no migrations run.
- Tooling: ESLint (+ Prettier compat), Prettier, Vitest + React Testing Library,
  Playwright, `.editorconfig`, `.nvmrc`.
- npm scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`,
  `test:watch`, `test:e2e`, `format`, `format:check`, `db:generate`.
- GitHub Actions CI running format check, lint, typecheck, unit tests, and build.
- Project docs: `AGENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DECISIONS.md`,
  `SECURITY.md`, `CONTRIBUTING.md`.
- Source-control hygiene: comprehensive `.gitignore`, placeholder `.env.example`.
- Foundational tests for utilities, pipeline definition, environment safety, and
  the application shell.

[Unreleased]: https://example.com/linktoglobe/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/linktoglobe/releases/tag/v0.1.0
