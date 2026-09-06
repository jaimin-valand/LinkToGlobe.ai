# LinkToGlobe.ai

**Connect professional knowledge, ideas, and content to the wider world.**

LinkToGlobe.ai turns a professional's knowledge into quality-reviewed content —
and only marks it published after an explicit human approval step. This
repository is at **Phase 1: Core MVP** (with early Phase 2 AI assistance).

**Working today:** accounts, knowledge capture, draft authoring, a deterministic
quality engine, a server-enforced approval workflow, an activity log, real
analytics, and optional AI assistance. **Not built:** external research/signals,
scheduling, any external publishing, and the analytics learning loop.

## The pipeline

```
USER KNOWLEDGE → RESEARCH → SIGNALS → IDEAS → HOOKS → CONTENT →
QUALITY REVIEW → USER APPROVAL → SCHEDULE / PUBLISH → ANALYTICS → LEARNING
```

Content moves through a server-enforced state machine
`DRAFT → QUALITY_CHECK → USER_APPROVAL → PUBLISHED` (with `REJECTED` as an
off-ramp). `PUBLISHED` is reachable only via a human approval. There is no
external publishing — see [`SECURITY.md`](./SECURITY.md) and ADR-0011.

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

You need Node ≥ 20.9 and a PostgreSQL database.

```bash
npm install
cp .env.example .env
```

**Get a database** — any one of:

- **Docker** (local): `docker compose up -d` — starts Postgres matching the
  default `DATABASE_URL`.
- **Hosted**: create a free Postgres (e.g. Neon, Supabase) and paste its
  connection string into `.env` as `DATABASE_URL`.
- **No Docker, no install** (Windows/macOS/Linux): download the portable
  PostgreSQL binaries once (see `scripts/localdb.mjs` for the URL) into
  `~/.linktoglobe/pgsql`, then `npm run db:up` / `npm run db:down`.

**Then set up the schema and a dev account:**

```bash
# generate AUTH_SECRET and put it in .env:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run db:deploy   # apply migrations
npm run db:seed     # create the SEED_USER_EMAIL / SEED_USER_PASSWORD account
npm run dev
```

Open http://localhost:3000 and sign in (or register a new account).

### Optional: AI assistance

Set `AI_PROVIDER=anthropic` and `AI_API_KEY=...` in `.env`. Without it the app
runs fully — you just write drafts yourself. AI output is always advisory and
never applied without a click.

## Scripts

| Command                                   | Purpose                     |
| ----------------------------------------- | --------------------------- |
| `npm run dev`                             | Dev server                  |
| `npm run build` / `npm run start`         | Production build / serve    |
| `npm run lint` / `npm run typecheck`      | Static checks               |
| `npm test` / `npm run test:watch`         | Unit tests                  |
| `npm run test:e2e`                        | Playwright E2E              |
| `npm run format` / `npm run format:check` | Prettier                    |
| `npm run db:deploy`                       | Apply migrations            |
| `npm run db:migrate`                      | Create a migration (dev)    |
| `npm run db:seed`                         | Seed the dev account        |
| `npm run db:studio`                       | Prisma Studio (browse data) |
| `npm run db:reset`                        | Drop, re-migrate, re-seed   |
| `npm run db:up` / `db:down`               | Portable local Postgres     |

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
