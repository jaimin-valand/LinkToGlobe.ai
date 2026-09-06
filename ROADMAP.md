# LinkToGlobe — Roadmap

Phases are sequential. Nothing below is "done" until it is built, tested, and
merged. **Current phase: Phase 0.**

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

- [ ] PostgreSQL + Prisma migrations wired up
- [ ] Authentication and user accounts
- [ ] Capture "user knowledge" (profile, expertise, source material)
- [ ] Manual content draft CRUD
- [ ] Approval queue UI implementing `DRAFT → QUALITY CHECK → USER APPROVAL`
- [ ] No external publishing yet — approval ends at an internal "approved" state

## Phase 2 — Content Intelligence

- [ ] AI provider adapter (provider-agnostic)
- [ ] Research + signal engine (attributed sources only)
- [ ] Ideas → hooks → draft generation
- [ ] Automated quality review (accuracy, originality, policy fit)

## Phase 3 — Analytics

- [ ] Analytics ingestion module and store
- [ ] Performance dashboards for published content
- [ ] Learning loop: feed outcomes back into research / ideas / drafting

## Phase 4 — Integrations

- [ ] Common `Integration` interface + OAuth framework
- [ ] First publishing destination via its official API
- [ ] Explicit approval enforced before any external publish
- [ ] Token encryption at rest, scope minimization

## Phase 5 — Automation

- [ ] Scheduling and recurring pipeline runs
- [ ] Notifications and review reminders
- [ ] Rate-limit-aware job runner

## Phase 6 — Production Hardening

- [ ] Append-only audit log for approvals and publishes
- [ ] Observability (structured logs, metrics, tracing, error reporting)
- [ ] Security review, dependency and secret scanning in CI
- [ ] Backup / restore and incident runbooks
- [ ] Load and resilience testing
