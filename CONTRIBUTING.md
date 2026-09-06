# Contributing to LinkToGlobe

## Prerequisites

- Node.js `>= 20.9` (this repo is developed on Node 24 — see `.nvmrc`)
- npm (bundled with Node; this project uses npm, not pnpm/yarn)

## Setup

```bash
npm install
cp .env.example .env   # fill in values as needed; Step 1 runs without a DB
npm run dev
```

## Workflow

1. Branch from `main`: `git checkout -b <type>/<short-description>`
   (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`).
2. Make focused changes. Keep unrelated changes out of the branch.
3. Add or update tests for any behavior you change.
4. Run the full gate locally:
   ```bash
   npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
   ```
5. Update docs when behavior or architecture changes:
   - new/changed technical decision → `DECISIONS.md`
   - architecture or module boundary → `ARCHITECTURE.md`
   - roadmap progress → `ROADMAP.md` (only mark work done when it is merged)
   - user-visible change → `CHANGELOG.md` under `[Unreleased]`
6. Open a pull request describing what changed and why. CI must be green.

## Commit messages

Conventional Commits: `type(scope): summary`
(e.g. `feat(pipeline): add signal detection stage`).

## Code style

- Formatting is Prettier; linting is ESLint. Do not hand-fight the formatter.
- TypeScript `strict` is on. Avoid `any`; model data with Zod where it crosses a
  boundary.
- Follow the module boundaries and security rules in `AGENTS.md` and
  `SECURITY.md`. These are not optional.

## What not to do

See the "Hard do not list" in `AGENTS.md` — no fabricated functionality, no
credential collection, no platform-policy bypassing, no marking future roadmap
work as complete.
