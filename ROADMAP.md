# LinkToGlobe.ai — Roadmap

Phases are sequential. Nothing below is "done" until it is built, tested, and
merged. **Current phase: Phase 1 (in progress).**

Legend: `[ ]` not started · `[~]` in progress · `[x]` complete

---

## Phase 0 — Foundation

- [x] Repository, toolchain, and CI skeleton
- [x] Architecture, roadmap, security, and agent docs
- [x] Source-control hygiene (`.gitignore`, `.env.example`)
- [x] TypeScript / ESLint / Prettier / Vitest / Playwright configured
- [x] Minimal application shell (layout, branding, nav placeholder, error +
      loading states, accessibility baseline)
- [x] Pipeline model expressed as data (`src/lib/pipeline.ts`)
- [x] Foundational tests (utilities, config, env-safety, shell renders)

## Phase 1 — Core MVP

- [x] PostgreSQL + Prisma schema and migrations (`prisma/migrations`)
- [x] Authentication and user accounts (scrypt hashing, signed-cookie sessions)
- [x] Capture "user knowledge" (headline, expertise, audience, tone, topics, sources)
- [x] Content draft CRUD
- [x] Deterministic quality engine (`src/server/quality`) gating progression
- [x] Approval queue implementing `DRAFT → QUALITY CHECK → USER APPROVAL → PUBLISHED`,
      with a server-enforced state machine and `REJECTED` off-ramp
- [x] Append-only activity log for every lifecycle action
- [x] No external publishing — "publish" records approval internally only
- [ ] Multi-user roles / team review (only single-owner today)
- [ ] Draft version history

## Phase 2 — Content Intelligence

- [x] AI provider adapter (provider-agnostic; `manual` / `anthropic` / `openai` / `gemini`)
- [x] AI-assisted ideas → hooks → draft body (advisory; never auto-applied)
- [x] AI-assisted editorial review (advisory, alongside the deterministic engine)
- [~] Research + signal engine (attributed external sources)
  - [x] Provider abstraction + Tavily and Google Programmable Search adapters
  - [x] Source collection, canonical-URL dedupe, deterministic story clustering
  - [x] Signal extraction with source traceability + inference marking
  - [x] Transparent relevance scoring against `KnowledgeProfile`
  - [x] Content opportunity view + save as `Idea`
  - [ ] AI-assisted cluster summaries / angles (seam exists; deterministic today)
  - [ ] Signal history / re-run comparison, saved searches
  - [x] Turn an `Idea` directly into a `ContentDraft`
- [x] Hook Lab: generate / compare / score / select an opening line, into the draft
- [ ] Originality / plagiarism checks
- [ ] Policy-fit checks per destination

## Phase 3 — Analytics

- [ ] Analytics ingestion module and store
- [ ] Performance dashboards for published content
- [ ] Learning loop: feed outcomes back into research / ideas / drafting

## Phase 4 — Integrations

- [~] Integration registry + `/settings/integrations` status page (boundary only)
- [x] AI providers: Anthropic and OpenAI behind one interface
- [ ] Common `Integration` interface + OAuth framework for publishing/email/calendar
- [ ] First publishing destination (LinkedIn) via its official API
- [ ] Explicit approval enforced before any external publish
- [ ] Token encryption at rest, scope minimization

## Phase 5 — Automation

- [ ] Scheduling and recurring pipeline runs
- [ ] Notifications and review reminders
- [ ] Rate-limit-aware job runner

## Phase 6 — Production Hardening

- [~] Append-only audit log (basic `ActivityLog` exists; needs tamper-evidence + retention)
- [ ] Observability (structured logs, metrics, tracing, error reporting)
- [ ] Security review, dependency and secret scanning in CI
- [ ] Backup / restore and incident runbooks
- [ ] Load and resilience testing
