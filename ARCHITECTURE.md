# LinkToGlobe.ai — Architecture

Status: **Phase 0 (Foundation).** This document describes the target design.
Only the parts marked _implemented_ exist today; everything else is a boundary
we are building toward.

## 1. Goals and constraints

- Support the full content pipeline (below) without tightly coupling stages.
- Keep a human approval gate before any external publish — structurally, not by
  convention.
- Stay a single deployable app until scale genuinely forces otherwise.
- Make the AI provider and each publishing integration swappable.

## 2. The pipeline

```mermaid
flowchart TD
  K[User knowledge] --> R[Research]
  R --> S[Signals]
  S --> I[Ideas]
  I --> H[Hooks]
  H --> C[Content]
  C --> Q[Quality review]
  Q --> A[User approval]
  A --> P[Schedule / publish]
  P --> AN[Analytics]
  AN --> L[Learning]
  L -.feeds.-> R
  L -.feeds.-> I
  L -.feeds.-> C
```

Stage order is defined once in `src/lib/pipeline.ts` (_implemented_) and
referenced by the database enum, the UI, and these docs.

## 3. System architecture

```mermaid
flowchart LR
  subgraph Client
    UI[Next.js App Router UI<br/>React + Tailwind]
  end

  subgraph Application["Application (Next.js server)"]
    RSC[Server Components / Route Handlers]
    SVC[Domain services<br/>src/server/*]
    ENV[Config + env validation<br/>src/lib/env.ts]
  end

  subgraph Engines
    CE[Content engine]
    RE[Research / signal engine]
    QE[Quality review]
    LE[Learning loop]
  end

  subgraph Providers
    AIP[AI provider adapter]
  end

  subgraph Integrations["Integrations (src/server/integrations/*)"]
    INT[Publishing destinations<br/>official APIs + OAuth]
  end

  subgraph Data
    DB[(PostgreSQL<br/>via Prisma)]
    AN[Analytics store]
  end

  UI --> RSC --> SVC
  SVC --> CE & RE & QE & LE
  CE --> AIP
  RE --> AIP
  QE --> AIP
  SVC --> DB
  LE --> AN
  SVC --> INT
  INT --> AN
  ENV -.validates.-> Application
```

## 4. Major modules

| Module                          | Path                        | Responsibility                                 | Status                     |
| ------------------------------- | --------------------------- | ---------------------------------------------- | -------------------------- |
| Frontend                        | `src/app`, `src/components` | App Router UI, layout, design system           | implemented                |
| Config / env                    | `src/lib/env.ts`            | Zod-validated environment, server/client split | implemented                |
| Pipeline model                  | `src/lib/pipeline.ts`       | Stage + lifecycle definitions                  | implemented                |
| Database                        | `prisma/`, `src/lib/db.ts`  | Schema, migrations, Prisma client              | implemented                |
| Auth                            | `src/server/auth`           | scrypt hashing, signed-cookie sessions, guards | implemented                |
| Knowledge                       | `src/server/knowledge`      | Capture the user's professional context        | implemented                |
| Content service + state machine | `src/server/content`        | CRUD + server-enforced lifecycle transitions   | implemented                |
| Quality engine                  | `src/server/quality`        | Deterministic pre-publish checks               | implemented                |
| AI provider layer               | `src/server/ai`             | One adapter (`manual` / `anthropic`), advisory | implemented                |
| Analytics                       | `src/server/analytics`      | Real counts, approval rate, activity feed      | Phase-1 subset             |
| Research / signal engine        | `src/server/research`       | External sources, signal detection             | planned (Phase 2)          |
| Integrations                    | `src/server/integrations/*` | Publishing destinations behind one interface   | planned (Phase 4)          |
| Automation                      | `src/server/automation`     | Scheduling, recurring jobs                     | planned (Phase 5)          |
| Security / audit                | `src/server/*`, ActivityLog | AuthZ per query, append-only lifecycle log     | basic; hardened in Phase 6 |

## 5. Data flow (target)

1. User submits knowledge / preferences → stored in Postgres.
2. Research + signal engines produce candidate material (attributed sources).
3. Content engine turns approved ideas into drafts via the AI adapter.
4. Quality review annotates each draft; state moves `DRAFT → QUALITY_CHECK`.
5. Draft enters the approval queue (`USER_APPROVAL`). A human decides.
6. On approval, the scheduler hands the draft to an integration to publish.
7. The integration and analytics module record outcomes.
8. The learning loop aggregates outcomes and feeds research / ideas / drafting.

State for a single item is tracked by `ApprovalState` (`prisma/schema.prisma` /
`APPROVAL_LIFECYCLE` in `src/lib/pipeline.ts`).

## 6. Future integration boundaries

- **AI provider:** a single interface (`generate`, `embed`, `review`) with
  per-provider implementations selected by env config. No provider SDK is
  imported outside `src/server/ai`.
- **Publishing integrations:** a common `Integration` interface
  (`authorize`, `publish`, `fetchMetrics`, `revoke`). Each lives in its own
  folder, is feature-flagged, and is disableable without touching core code.
  Only official APIs and OAuth are permitted (see `SECURITY.md`).
- **Analytics:** written through one module so the backing store can change.

## 7. Security boundaries

- **Network:** the browser talks only to the Next.js app. Engines, providers,
  and integrations are server-side.
- **Secrets:** environment variables, read only on the server through
  `getServerEnv()`. Client code may read only `getClientEnv()` (`NEXT_PUBLIC_*`).
- **Publish gate:** the transition into `PUBLISH` is only reachable from
  `USER_APPROVAL` and requires an authenticated human action. Enforced by the
  publishing service and covered by tests when built.
- **Least privilege:** each integration holds only the OAuth scopes it needs;
  tokens are encrypted at rest (Phase 4).
- **Audit:** approval and publish actions are recorded in an append-only log
  (Phase 6).

See `SECURITY.md` for the full policy.
