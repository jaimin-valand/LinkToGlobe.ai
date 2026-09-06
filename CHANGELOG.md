# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 1 (Core MVP) + early Phase 2 (AI assist)

- **Database**: PostgreSQL via Prisma 6. Schema for `User`, `KnowledgeProfile`,
  `ContentDraft`, `QualityReport`, `ActivityLog`; committed init migration;
  `docker-compose.yml` for local Postgres; `prisma/seed.ts` and `npm run db:*`
  scripts.
- **Auth**: email/password accounts, scrypt hashing (Node built-in), stateless
  signed-cookie sessions, `requireUser()` guard, route middleware, `/login` and
  `/logout`.
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
- Tailwind CSS v4 with an original LinkToGlobe design-token palette and logo mark.
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
