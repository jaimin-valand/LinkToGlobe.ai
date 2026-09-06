# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
