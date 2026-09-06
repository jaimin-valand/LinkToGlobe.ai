# LinkToGlobe

**Connect professional knowledge, ideas, and content to the wider world.**

LinkToGlobe turns a professional's knowledge into researched, quality-reviewed
content — and publishes it externally only after an explicit human approval
step. This repository is at **Phase 0: Foundation & Architecture**. The
application shell runs; the pipeline is not built yet.

## The pipeline

```
USER KNOWLEDGE → RESEARCH → SIGNALS → IDEAS → HOOKS → CONTENT →
QUALITY REVIEW → USER APPROVAL → SCHEDULE / PUBLISH → ANALYTICS → LEARNING
```

Every externally published item must pass `DRAFT → QUALITY CHECK →
USER APPROVAL → PUBLISH`. See [`SECURITY.md`](./SECURITY.md).

## Tech stack

| Area          | Choice                              |
| ------------- | ----------------------------------- |
| Framework     | Next.js 16 (App Router, `src/`)     |
| Language      | TypeScript 5 (strict)               |
| UI            | React 19, Tailwind CSS v4           |
| Validation    | Zod                                 |
| Database      | PostgreSQL via Prisma 6 _(Phase 1)_ |
| Unit tests    | Vitest + React Testing Library      |
| E2E tests     | Playwright                          |
| Lint / format | ESLint, Prettier                    |

Rationale and alternatives considered: [`DECISIONS.md`](./DECISIONS.md).

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command                                   | Purpose                  |
| ----------------------------------------- | ------------------------ |
| `npm run dev`                             | Dev server               |
| `npm run build` / `npm run start`         | Production build / serve |
| `npm run lint` / `npm run typecheck`      | Static checks            |
| `npm test` / `npm run test:watch`         | Unit tests               |
| `npm run test:e2e`                        | Playwright E2E           |
| `npm run format` / `npm run format:check` | Prettier                 |
| `npm run db:generate`                     | Regenerate Prisma client |

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design, modules, data flow
- [`ROADMAP.md`](./ROADMAP.md) — phased plan
- [`SECURITY.md`](./SECURITY.md) — secret handling, auth, integration safety
- [`AGENTS.md`](./AGENTS.md) — rules for contributors and coding agents
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — workflow
- [`DECISIONS.md`](./DECISIONS.md) — architecture decision record
- [`CHANGELOG.md`](./CHANGELOG.md)

## License

UNLICENSED / proprietary until a license is chosen.
