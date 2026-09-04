# Product wiki — Wellfound clone candidate portal

This is the agent's **ground truth about the product**. Every skill reads it
before making a claim about scope, effort or feasibility. Without it, the agent
invents plausible-sounding estimates; with it, estimates are anchored to code
that actually exists.

Keep this file current. If it drifts from the repos, every downstream estimate
silently degrades.

Companion repos:
- `wellfound-clone-api` — NestJS + Prisma + SQLite
- `wellfound-clone-web` — Next.js 15 App Router + Tailwind + TanStack Query

---

## 1. What the product is

A candidate-facing job portal (a Wellfound clone) covering three sections:

| Section | Route | What a candidate does |
| --- | --- | --- |
| Profile | `/profile` | Maintains their profile across four tabs: Profile, Résumé, Preferences, Culture |
| Jobs | `/jobs`, `/jobs/[id]` | Searches, filters, saves/hides roles, and applies |
| Applied | `/applied` | Tracks applications through a status pipeline |

Deliberately **out of scope**: recruiter/company-side tooling, messaging, and
any file storage. Résumés are stored as a *file name only*.

---

## 2. Domain model

Source of truth: `wellfound-clone-api/prisma/schema.prisma`.

### Identity & profile
- **User** — `id, email, passwordHash, name, avatarUrl`
- **Profile** (1:1 User) — `headline, bio, location, primaryRole, openToRoles(JSON),
  achievements, resumeFileName, yearsOfExperience`, plus social URLs
- **WorkExperience** (N per Profile) — company, title, dates, `isCurrent`
- **Education** (N per Profile)
- **Skill** / **ProfileSkill** — skills are shared rows; the join carries `yearsOfExperience`
- **JobPreference** (1:1 Profile) — `searchStatus`, `desiredRoleTypes(JSON)`,
  `desiredRoles(JSON)`, `desiredLocations(JSON)`, `desiredCompanySizes(JSON)`,
  `openToRemote`, `willingToRelocate`, `desiredSalaryMin`
- **CultureProfile** (1:1 Profile) — `lookingFor`, `workEnvironment`,
  `importantFactors(JSON)`, two 1–5 Likert scores, market in/out lists

### Jobs
- **Company** — name, slug, tagline, size, `fundingStage`, industry, location
- **Job** — title, description, `requirements(JSON)`, `roleType`, `locationType`,
  salary min/max, equity min/max, experience min/max, `applicantCount`, `postedAt`
- **JobLocation** (N per Job) — a real table, because location is *filterable*
- **JobSkill** — Job↔Skill join

### Interactions
- **SavedJob**, **HiddenJob** — unique on `(userId, jobId)`
- **SavedSearch** — `name`, `filters(JSON)`, `alertEnabled`
- **Application** — unique on `(userId, jobId)`; `status`, `coverLetter`,
  `appliedAt`, `expiresAt`
- **ApplicationEvent** — append-only status timeline

### Vocabularies
Defined once in `src/common/constants/domain.ts`:
- `ROLE_TYPES` — FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, COFOUNDER
- `LOCATION_TYPES` — REMOTE, ONSITE, HYBRID
- `SEARCH_STATUSES` — READY_TO_INTERVIEW, OPEN_TO_OFFERS, CLOSED
- `APPLICATION_STATUSES` — APPLIED, IN_REVIEW, INTERVIEWING, OFFER, HIRED, REJECTED, WITHDRAWN
- `TERMINAL_APPLICATION_STATUSES` — HIRED, REJECTED, WITHDRAWN
- `APPLICATION_EXPIRY_DAYS = 14`

---

## 3. Constraints that shape every estimate

These are the reasons a change is cheap or expensive here. **Cite them by name
in scoping and specs.**

**C1 — SQLite has no enums.** Every status/type column is a `String`, validated
by `@IsIn(...)` against `domain.ts`. *Adding a status value is cheap* (one array
entry + UI label map). There is no migration to write.

**C2 — SQLite has no scalar lists.** Anything multi-valued is either a relation
table (if filterable) or a JSON `String` (if not). *Making an existing JSON field
filterable is expensive* — it means a new table, a backfill, and a query rewrite.

**C3 — No `mode: 'insensitive'`.** That is Postgres-only and throws on SQLite.
Search relies on SQLite `LIKE`, already case-insensitive for ASCII. *Any new text
search must not introduce a `mode` key.*

**C4 — `recommended` sort is scored in memory.** `scoreJob()` in
`jobs.service.ts` loads the matching set, ranks it in JS, then slices. *Changing
ranking logic is cheap and needs no SQL.* It does not scale past a few thousand
jobs — acceptable now, and the known ceiling.

**C5 — No object storage.** Anything needing a real file upload is a large,
architectural change, not a feature.

**C6 — Applications expire after 14 days of inactivity.** `expiresAt` is stored,
not derived, so recruiter activity can push it out.

**C7 — Auth is a client-side JWT in `localStorage`.** Fine for the clone.
Anything needing server-side sessions or SSR-authenticated pages is a big change.

---

## 4. The recommendation scorer (relevant to the current demo case)

`scoreJob(job, pref)` in `wellfound-clone-api/src/jobs/jobs.service.ts` is
additive and deliberately explainable:

| Signal | Points |
| --- | --- |
| Job title contains one of the candidate's `desiredRoles` | **+40** |
| `roleType` is in `desiredRoleTypes` | **+15** |
| A job location matches `desiredLocations` | **+20** |
| Candidate is `openToRemote` and job is REMOTE | **+10** |
| `salaryMax` ≥ `desiredSalaryMin` | **+10** |
| Freshness — full credit today, decaying to 0 over ~30 days | **0 → +15** |

Ties break on `postedAt` descending.

**The score is computed and then thrown away.** It is never returned in the API
response, so the UI cannot explain a ranking. Surfacing it is an additive change
to the `decorate()` step — no schema change, no migration. (This is why the
current demo case is a small build, not a large one.)

---

## 5. API surface

Prefix `/api`. All routes except `health`, `auth/register`, `auth/login` require
`Authorization: Bearer <jwt>`.

- **auth** — `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- **profile** — `GET|PATCH /profile`, CRUD `/profile/experiences`,
  `/profile/educations`, `PUT /profile/skills`, `PATCH /profile/preferences`,
  `PATCH /profile/culture`
- **jobs** — `GET /jobs` (search), `GET /jobs/saved`, `GET /jobs/hidden`,
  `GET /jobs/:idOrSlug`, `POST|DELETE /jobs/:id/save`, `POST|DELETE /jobs/:id/hide`
- **applications** — `POST /applications`, `GET /applications`,
  `GET /applications/stats`, `GET /applications/:id`, `POST /applications/:id/withdraw`
- **saved-searches** — full CRUD

Search accepts `q` (double-quoted phrases matched as a unit), `locations`,
`roleTypes`, `locationTypes`, `companySizes`, `fundingStages`, `skills`,
`salaryMin`, `experience`, `remoteOnly`, `sort`, `page`, `limit`.

---

## 6. Frontend map

| File | Owns |
| --- | --- |
| `src/app/(portal)/layout.tsx` | Auth guard + shell |
| `src/app/(portal)/jobs/page.tsx` | Search, tabs, saved searches, pagination |
| `src/components/jobs/job-card.tsx` | The job card — **the surface most feature requests touch** |
| `src/components/jobs/job-filters.tsx` | Filter panel |
| `src/app/(portal)/jobs/[id]/page.tsx` | Job detail + apply modal |
| `src/app/(portal)/profile/page.tsx` | All four profile tabs |
| `src/app/(portal)/applied/page.tsx` | Pipeline rail, timeline, withdraw |
| `src/lib/api.ts` | **Every** network call. Components never call `fetch`. |
| `src/lib/types.ts` | Hand-written mirror of API responses |
| `src/lib/format.ts` | Salary (lakhs), status labels and colours |

---

## 7. Change-cost signals

Use these to justify an Effort score. State which tier a solution falls in.

**Cheap — under a day**
- New value in a `domain.ts` vocabulary (C1)
- New filter over a column or relation that already exists
- Changing `scoreJob` weights or adding an additive signal (C4)
- Anything living entirely in `format.ts` or a single component

**Moderate — 1 to 3 days**
- New field on an existing model + DTO + UI (no backfill)
- A new endpoint reusing existing tables
- Returning new derived data from `decorate()`
- A new profile tab section

**Expensive — a week or more**
- Making a JSON column filterable (C2) — new table, backfill, query rewrite
- Anything needing file upload (C5)
- Server-side auth or SSR-authenticated pages (C7)
- Replacing in-memory ranking with SQL ranking (C4 ceiling)
- Any recruiter-side surface — none of it exists yet

---

## 8. Seed data

`npm run db:seed` — 16 fictional companies, 32 jobs (Indian startup market, INR
salaries in lakhs), 6 applications spread across the pipeline, 7 saved jobs,
2 hidden, 1 saved search.

Demo account: `demo@wellfound.dev` / `password123` — a Bengaluru APM with
`desiredRoles = ["Product Manager", "Associate Product Manager"]`. Useful as the
default persona in specs and prototypes.
