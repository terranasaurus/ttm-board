# TTM Portal: Kan vs. Plane vs. OpenProject

**Decision (2026-10-17):** Keep **Kan** as the portal and port the specific
features we want from Plane and OpenProject into it as native, additive code.
Do **not** deploy Plane or OpenProject alongside it.

## The three candidates

| | **Kan** (current portal) | **Plane** (`terranasaurus/TTM-plane-project-management`) | **OpenProject** |
|---|---|---|---|
| License | AGPL-3.0 | AGPL-3.0 | GPL-3.0 |
| Stack | Next.js 15 + tRPC + Drizzle, TypeScript end to end | Django REST API + Celery workers + Hocuspocus live server + Next.js/React (MobX) frontends | Ruby on Rails + Angular |
| Runs as | 1 Vercel project + our existing Supabase Postgres | 11 Docker services: web, admin, space, api, worker, beat-worker, migrator, live, Postgres, Redis, RabbitMQ, MinIO, proxy | Docker/packaged install with its own Postgres, memcached and workers |
| Hosting needs | Vercel (already paid) + Supabase (already paid) | A VPS with roughly 4 vCPU / 8 GB RAM / 50 GB disk ([Plane hardware notes](https://shop.zimaspace.com/en-ca/pages/plane-hardware-requirements)) | Roughly 4 cores / 4 GB RAM / 20 GB disk ([20i](https://20i.com/blog/?p=13729)); EU cloud is a paid option |
| Same stack as HEP / MMS | Yes | Frontend only | No |
| Status today | Live at portal.terranthroughmilestones.com, branded, domain-locked, 3 boards loaded | Unmodified upstream fork, never deployed | Not evaluated hands-on |

## What each has that Kan lacks

| Feature | Plane | OpenProject | Worth having for a 3-person practice? | Plan |
|---|---|---|---|---|
| **"My work" / "My page"** (everything assigned to or due for me) | Your Work | My page | **Yes**: one screen per person instead of scanning boards | **Built** as `/my-work` |
| **Pages / wiki** (rich-text docs) | Pages (TipTap editor + live collaboration) | Wiki | **Yes**: SOPs, onboarding, meeting notes, toolbox content | **Built** as `/docs` (TipTap, which Kan already ships) |
| **Intake / request queue** (anyone files a request, someone triages it) | Intake | n/a | Yes: Sheila and Cassandra can file requests without board etiquette | Next: an "Inbox" column plus a quick-add form |
| **Meetings** (agenda → minutes → action items) | n/a | Meetings | Yes: weekly team sync | Covered by a Docs meeting template; action items become cards |
| **Cycles / sprints** | Cycles | Versions / sprints | No: no sprint cadence here | Skip |
| **Gantt / timeline** | Timeline layout | Gantt with dependencies | Not yet | Kan's calendar view covers due dates; revisit if launches get complex |
| **Time tracking / budgets** | Worklogs (Pro) | Time and cost | No: billing lives in the EMR | Skip |
| **Analytics** | Analytics | Reports | Light | Counts on My Work are enough for now |
| **Saved views / spreadsheet layout** | Views, Spreadsheet | Filters, table | Nice-to-have | Later |

## Why not run Plane or OpenProject

1. **A second system to operate and secure.** Plane needs a VPS that someone
   patches, plus Redis, RabbitMQ and MinIO. That is a lot of infrastructure
   for three users, and it would live outside Supabase and Vercel, where
   everything else is.
2. **A second login and a second source of truth.** Cards would split
   across two tools, and `/kanban` and the Claude connector would need two
   integrations.
3. **No code to lift wholesale.** Plane's backend is Django and its
   frontend is tightly coupled to that API and MobX stores. OpenProject is
   Rails. Neither drops into Kan's Next.js/tRPC/Drizzle stack. What does
   transfer is **design**: what "Your Work" shows, how Pages are organized,
   how Intake triages.
4. **Licenses are compatible**, so we could copy code where it helps.
   Plane is AGPL-3.0 like Kan, and GPL-3.0 code can be combined with
   AGPL-3.0. Copied files keep their copyright headers. In practice, the
   only Plane piece that maps cleanly is the TipTap editor, and Kan already
   ships TipTap.

## How the ports are built (to keep upstream Kan merges clean)

- **New files, not edits.** New pages live under `apps/web/src/views/ttm/`
  and `apps/web/src/pages/{toolbox,my-work,docs}`. Edits to upstream files
  are limited to adding links to the sidebar.
- **New tables in the `team` schema only**, applied as additive migrations
  (`team.ttm_doc`). No changes to Kan's tables.
- **No PHI.** The Toolbox runs entirely in the browser: nothing typed into
  a calculator is stored or sent anywhere. Docs follow the same rule as
  cards: link to Drive for anything patient-specific.
