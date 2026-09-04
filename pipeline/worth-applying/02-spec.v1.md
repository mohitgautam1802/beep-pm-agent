# Fit verdict on job cards

> **Status:** Draft
> **Spec version:** v1 · **Prototype:** — · **Jira:** [KAN-16](https://mohitsworkspace-32935286.atlassian.net/browse/KAN-16)
> **Author:** Beep PM agent · **Approver:** Head of Product
> **Last updated:** 2026-09-04

## Decision

Add a per-job **fit verdict** — `STRONG` / `STRETCH` / `UNDER_QUALIFIED` — to the
job card, computed from the candidate's experience and skills against the job's
requirements. Crucially the verdict is allowed to be **negative**: today the
recommendation scorer is purely additive and every job accumulates some score,
so the list has no way to tell a candidate that a job is not for them. This adds
the first subtracting term to `scoreJob()` and surfaces the result on the card.

Roughly **2–3 days**. No schema change, no migration, no backfill.

---

## Problem

A candidate opens `/jobs`, which defaults to the Recommended sort, and scrolls
dozens of openings that all look equally plausible. Unable to tell which ones
actually suit their background, they apply to all of them — and each application
costs a hand-written covering message. The applications mostly go nowhere,
because most of those jobs never matched their experience in the first place.

In the reporter's words: *"not knowing any which are relevant makes me apply to
of them which takes a lot of time"* (`00-problem.md`).

**Evidence**

- **The scorer never looks at the candidate's history.** `scoreJob()` in
  `jobs.service.ts` ranks on stated *preferences* only — `desiredRoles` (+40),
  `desiredRoleTypes` (+15), `desiredLocations` (+20), `openToRemote` (+10),
  `desiredSalaryMin` (+10) — plus freshness (0→+15). Not one signal describes
  what the candidate has actually done (product-wiki §4).
- **Every seeded job looks like a match.** Measured 2026-09-04 across 32 seeded
  jobs for the `demo@wellfound.dev` persona: **average 4.0 signals per job, and
  0 jobs matching nothing**
  (`pipeline/why-recommended/evidence/signal-distribution.txt`). That is the
  reporter's complaint expressed as a number.
- **The data needed to fix it already exists and is already filterable.**
  `Profile.yearsOfExperience` and `ProfileSkill` on one side;
  `Job.experienceMin/Max` and `JobSkill` on the other. `GET /jobs` already
  accepts `skills` and `experience` as query parameters (§5).
- **`[unknown — needs data]` — skill-data density.** How many `JobSkill` rows the
  seeded jobs actually carry is unmeasured. If sparse, the skill-overlap half of
  the verdict is noise. See Open question 1.
- **`[unknown — needs data]` — scale of the complaint.** This is **n = 1**, and
  that one person is the agent's operator reporting their own experience. It is
  the first first-hand candidate account in the pipeline, and the root cause is
  confirmed in code rather than assumed — but it is not user research.
- **Not evidence:** the reporter's belief that the platform matches against
  their uploaded résumé. It does not. See Out of scope.

**Why now**

- The root cause is confirmed in code, not inferred, and the fix is in the cheap
  tier (C4) because ranking is already computed in memory.
- `job-card.tsx` is about to be touched anyway by `why-recommended` (KAN-15). One
  layout decision covering both features is cheaper than two.

---

## Goals

- A candidate scanning `/jobs` can tell, without opening a job, whether their
  experience and skills fit what it asks for.
- The list is capable of saying **no**. Some jobs are visibly marked as a poor
  fit rather than every job reading as a match.
- A candidate who applies to an `UNDER_QUALIFIED` job does so **knowingly**,
  having seen the label and chosen to apply anyway.

## Non-goals

- **Reducing the cost of applying.** The hand-written covering message is a real
  and separate problem (problem B in `01-solutions.md`) and is knowingly left
  unsolved by this work.
- **Improving the rate of positive recruiter responses.** The product has no
  recruiter-side surface at all (§7), so we never learn why an application was
  rejected. This work cannot move that number and must not be judged on it.
- **Filtering or hiding jobs.** The verdict labels; it never removes.
- **Re-ranking as the primary deliverable.** The score changes as a consequence
  of the new signals, but the visible verdict is the point.

---

## Users and scenarios

**Primary user:** the seeded demo persona — `demo@wellfound.dev`, a Bengaluru
APM with `desiredRoles = ["Product Manager", "Associate Product Manager"]`
(product-wiki §8).

| # | Scenario | Today | After |
| --- | --- | --- | --- |
| 1 | Scanning the Recommended list for something worth applying to | All 32 jobs carry at least one match signal; nothing distinguishes them | Each card carries `STRONG`, `STRETCH` or `UNDER_QUALIFIED` with a one-line reason |
| 2 | Deciding whether a specific senior role is worth the effort | Must open the job and read `experienceMin/Max` manually | Card reads e.g. "5 yrs experience vs 6–10 required" |
| 3 | Brand-new account, profile not yet filled in | Recommended list ranks on defaults | Verdict is **suppressed**; card prompts the candidate to complete their profile |
| 4 | Deliberately applying to a stretch role | No signal either way | Sees `UNDER_QUALIFIED`, applies anyway — nothing blocks them |

---

## Solution

Two derived values, one verdict, one badge.

### Derived values

```
expBand      = IN_BAND   if jobMin <= years <= jobMax
             = STRETCH   if years <  jobMin and (jobMin - years) <= 1
             = BELOW     if years <  jobMin and (jobMin - years) >  1
             = IN_BAND   if years >  jobMax          <- v1 rule, see Open question 2

skillOverlap = |ProfileSkill intersect JobSkill| / |JobSkill|
```

### Verdict rule

| | overlap >= 0.5 | 0.25 <= overlap < 0.5 | overlap < 0.25 |
| --- | --- | --- | --- |
| **IN_BAND** | `STRONG` | `STRETCH` | `UNDER_QUALIFIED` |
| **STRETCH** | `STRETCH` | `STRETCH` | `UNDER_QUALIFIED` |
| **BELOW** | `UNDER_QUALIFIED` | `UNDER_QUALIFIED` | `UNDER_QUALIFIED` |

### Scoring weights — proposed, not settled

| Condition | Points |
| --- | --- |
| `expBand = IN_BAND` | **+20** |
| `expBand = STRETCH` | **+5** |
| `expBand = BELOW` | **-25** |
| `skillOverlap >= 0.5` | **+20** |
| `0.25 <= skillOverlap < 0.5` | **+10** |
| `skillOverlap < 0.25` | **-10** |

These sit against an existing title match worth +40 (§4). A job with a matching
title, no skill overlap and a below-band requirement nets +40 today and would net
+5 here. **That reordering is the intended behaviour change**, and it is the part
most likely to need tuning once the distribution is measured (Open question 1).

### API contract

`decorate()` attaches a `fit` object to each job in the `GET /jobs` and
`GET /jobs/:idOrSlug` responses:

```jsonc
"fit": {
  "verdict": "STRONG | STRETCH | UNDER_QUALIFIED",
  "reasons": ["5 yrs experience vs 6-10 required", "4 of 7 skills matched"],
  "experience": { "candidateYears": 5, "jobMin": 6, "jobMax": 10, "band": "STRETCH" },
  "skills": { "matched": ["SQL", "Figma"], "missing": ["Amplitude"], "overlap": 0.57 }
}
```

`fit` is **absent** (not null-filled) when suppressed — see Edge cases.

### Presentation

- One badge per card, with a single reason line beneath it.
- Shown on **all sorts**, not only `sort=recommended`. The verdict describes the
  candidate/job pair, not the ordering.
- **Never hides a job.** An `UNDER_QUALIFIED` job stays in the list, stays
  applicable, and is not filtered out.

**Surfaces touched**

| File / area | Change |
| --- | --- |
| `wellfound-clone-api/src/jobs/jobs.service.ts` — `scoreJob()` | Two new signals, including the first negative term |
| `wellfound-clone-api/src/jobs/jobs.service.ts` — `decorate()` | Attach the derived `fit` object |
| `wellfound-clone-web/src/lib/types.ts` | Add `fit` to the response type. **Hand-written mirror (§6)** — will not update itself |
| `wellfound-clone-web/src/components/jobs/job-card.tsx` | Render the badge and reason line |
| `wellfound-clone-web/src/lib/format.ts` | Verdict labels and colours, alongside the existing status label/colour maps |

**Constraints that shape this**

- **C4 — ranking is scored in memory.** `scoreJob()` loads the matching set,
  ranks in JS and slices. Changing ranking logic needs no SQL and no migration,
  which is what puts the scoring half in the **cheap tier (under a day)**.
  *Caveat:* fit adds per-job work inside that same loop. The C4 ceiling of a few
  thousand jobs is unchanged in kind, but the constant factor grows.
- **C2 — no scalar lists.** `ProfileSkill` and `JobSkill` are **relation tables**,
  so joining them is ordinary querying. `Job.requirements` is a JSON string and
  is **deliberately not used** — matching on it would mean making a JSON column
  filterable, the expensive tier.
- **C1 — no enums in SQLite.** Not applicable: the verdict is derived per request
  and never stored, so there is no column and no `@IsIn` entry to add.
- **Change-cost tier (§7).** Scoring half: *cheap, under a day* ("changing
  `scoreJob` weights or adding an additive signal"). Surfacing half: *moderate,
  1–3 days* ("returning new derived data from `decorate()`"). Total ~2–3 days.
- **C5, C6, C7** — not applicable to v1.

---

## User flows

### Happy path

1. Candidate opens `/jobs`. Default sort is Recommended.
2. `GET /jobs` returns each job decorated with `fit`.
3. Each card shows its badge and reason line — e.g. `STRONG` / "8 of 9 skills
   matched, 5 yrs vs 3–6 required".
4. Candidate scans, sees several cards marked `UNDER_QUALIFIED`, and skips them.
5. Candidate opens a `STRONG` job and applies as they do today. **The apply flow
   is unchanged.**

### Unhappy paths

- **Profile has no `yearsOfExperience` and no `ProfileSkill` rows** → `fit` is
  omitted for every job; the card shows a prompt to complete the profile.
- **Profile has experience but no skills** → verdict computed from the experience
  band alone; the reason line names only experience, and does not imply skills
  were considered.
- **Job has no `experienceMin`/`experienceMax`** → verdict computed from skill
  overlap alone.
- **Job has no `JobSkill` rows** → overlap is undefined (zero denominator, *not*
  zero overlap). Fall back to the experience band alone. **Never render 0%
  overlap for a job that simply lists no skills.**
- **Neither side has usable data** → `fit` omitted for that job; the card renders
  exactly as it does today.
- **Candidate disagrees with `UNDER_QUALIFIED`** → they apply anyway. Nothing is
  blocked, disabled, warned on, or confirmed.

---

## Edge cases

| Case | Expected behaviour |
| --- | --- |
| Empty / zero results | Search returns no jobs; no verdicts to render. Unchanged from today. |
| First run, no data yet | Empty profile → `fit` omitted on every card, profile-completion prompt shown instead. **Without this rule a new user is told `UNDER_QUALIFIED` on every job in the product on their first visit.** |
| Stale or cached data | `fit` is computed per request in the same in-memory pass as the score (C4), so it cannot go stale against the profile. The risk is `types.ts` drifting from the API — it is hand-written (§6) and must be changed in the same commit. |
| Failure of the underlying call | Fit is derived inline, not fetched separately. If the profile or its skills cannot be loaded, **omit `fit` and still return the job list.** A missing verdict must never fail a search. |
| Job with zero `JobSkill` rows | Experience band only. No division by zero, no 0% overlap displayed. |
| Candidate above `experienceMax` | Treated as `IN_BAND` in v1 — see Open question 2. |
| Saved and hidden lists (`/jobs/saved`, `/jobs/hidden`) | Same card component, so verdicts appear there too. Intended. |
| Applied list (`/applied`) | Out of scope — different surface, and the decision has already been made. |

---

## Out of scope

- **Résumé-content matching.** The reporter believed the platform matches against
  their uploaded résumé. In this codebase it cannot: résumés are a *file name
  only* (§1) and there is no object storage (C5). The PM has since confirmed the
  real product *can* read résumé content — but v1 deliberately uses the
  structured equivalent already in the schema (`WorkExperience`, `Education`,
  `ProfileSkill`, `Profile.yearsOfExperience`), which is already extracted,
  already queryable, and keeps the entire estimate anchored to C4 and §7.
- **Backfilling the profile from the résumé.** The natural follow-on. Becomes
  urgent if profiles turn out to be mostly empty — currently
  `[unknown — needs data]`.
- **Defaulting the `/jobs` filters from the profile.** Cheap and worth having
  later as an explicit, default-off chip. Deferred because it narrows the list
  rather than explaining it.
- **The verdict on `/jobs/[id]`.** v1 is card-only. The detail page is where the
  decision to apply is actually made, so this is deferred rather than rejected.
- **`WorkExperience` titles and `Education` as signals.** v1 uses years and
  skills only.

---

## Success metrics

| Metric | Baseline | Target | How measured |
| --- | --- | --- | --- |
| Share of listed jobs carrying a non-`STRONG` verdict | **0%** — 0 of 32 seeded jobs currently match nothing (measured 2026-09-04) | The list visibly discriminates; a flat 0% or a flat 100% both mean the thresholds are wrong | Re-run the distribution script against seed data |
| Applications sent to jobs labelled `UNDER_QUALIFIED` | No baseline possible — the label does not exist yet | Falls over time, without reaching zero (stretch applications are legitimate) | `Application` rows joined against the verdict at time of listing |
| Applications submitted per candidate per session | `[unknown — needs baseline]` | Decreases | Application counts per session |
| Candidate opens a job, then applies | `[unknown — needs baseline]` | Increases — fewer, better-targeted applications | Ratio of `Application` rows to job detail views |

**Explicitly not a metric: positive recruiter response or rejection rate.** No
recruiter-side surface exists (§7), so the product cannot observe why an
application was rejected. Measuring this work on rejections would be measuring
something we cannot see.

---

## Rollout

- **Reversibility:** high. No schema change, no migration, no backfill, no stored
  data — the verdict is derived per request (C4). Scoping recorded the risk as
  *reversible*; the material risk is a wrong `UNDER_QUALIFIED` discouraging a
  good application, mitigated by never hiding and never blocking.
- **Staging:** two steps, because the API half is additive and invisible.
  1. Ship `fit` in the API response with **no UI**. Nothing changes for
     candidates. Measure the real verdict distribution and tune the six weights
     and two thresholds against it.
  2. Ship the badge in `job-card.tsx` only once step 1's distribution looks
     sane.
  The wiki documents **no feature-flag infrastructure**, and C7 (client-side JWT
  in `localStorage`) rules out server-side per-user gating — so this two-step
  ordering *is* the staging mechanism available. Do not assume a flag exists.
- **Rollback plan:** revert the `job-card.tsx` change; the `fit` field can stay in
  the response, unused and harmless. If the ranking change itself is the problem,
  set the six weights to zero — the verdict continues to display without
  affecting order. No migration to unwind.

---

## Alternatives considered

Scoping used no numeric scoring model — `solution-heuristics.md` explicitly
rejects one ("no formula here… those produce a false sense of rigour"). The
Score column is therefore recorded as not applicable rather than back-filled with
invented numbers.

| Option | Score | Why not |
| --- | --- | --- |
| Default the `/jobs` filters from the profile (cheap, under a day, no API change — `experience` and `skills` are already query params, §5) | n/a | Makes the complaint go away by showing fewer jobs rather than by judging them. The ranking stays unexplainable, just over a smaller set. |
| Pre-fill the covering letter from profile and job, attacking cost-per-application | n/a | Attacks problem B, not A. If the list cannot tell you what fits, applying faster means spraying faster — which makes rejection worse. |
| Backfill the profile from the résumé | n/a | An enabler, not a fix: better inputs to a scorer that still cannot say no. Follow-on, not a substitute. |
| Do nothing | n/a | Rejected. First first-hand candidate account in the pipeline, and the root cause is confirmed in code. |

---

## Open questions

| # | Question | Owner | Needed by |
| --- | --- | --- | --- |
| 1 | **How dense are `JobSkill` rows across the 32 seeded jobs?** If sparse, skill overlap is noise and that half of the verdict should be dropped or down-weighted. The six weights and the 0.5 / 0.25 thresholds are currently **guesses**. | Engineering | Before weights are fixed — i.e. before rollout step 1 ends |
| 2 | **Over-qualified.** v1 treats `years > experienceMax` as `IN_BAND`. Over-qualification is a real rejection cause, but the label is discouraging and the product cannot verify it mattered. Confirm or overturn. | Head of Product | Before rollout step 2 |
| 3 | **Card layout collision.** `why-recommended` (KAN-15, awaiting approval at Gate 3) adds match-reason chips to the same `job-card.tsx`, already "the surface most feature requests touch" (§6). Two features, one card, one layout decision. | Design | Before rollout step 2 |
| 4 | **Wording of `UNDER_QUALIFIED`.** Must be honest without discouraging, since the job stays applicable. | Design | Before rollout step 2 |
| 5 | **The wiki is known-stale.** §1 and C5 say résumés are a file name only with no object storage; the PM states the real product can read résumé content. Every future résumé-related estimate inherits this error until it is corrected. | Head of Product | Before any résumé-dependent work is scoped |

### A gap this spec could not close

**No query was run for this spec.** `wellfound-clone-api` is not checked out
under this path — the parent directory holds only `beep-pm-agent` and
`README.md`. Every number above is reused from the 2026-09-04 run, which measured
*preference* signals only and contains **no experience or skill data at all**.
Open question 1 is therefore unanswered by measurement rather than by choice.
Given a checkout path the script is a short job.

---

## Changelog

Earlier versions are kept alongside this file.
