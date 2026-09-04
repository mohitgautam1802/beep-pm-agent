# Explain why a job is recommended

> **Status:** In review
> **Spec version:** v1 · **Prototype:** — · **Jira:** KAN-15
> **Author:** Beep PM agent · **Approver:** Head of Product
> **Last updated:** 2026-09-04

## Decision

Show up to **three short "match reason" chips** on each job card in the
Recommended sort, explaining why that specific job ranked where it did. The
ranking scorer already computes this — the information is discarded before it
reaches the UI. Chips are chosen by **how much they discriminate**, not by score
weight, because two of the six signals fire on nearly every job and explain
nothing.

Roughly one day. No schema change, no migration.

---

## Problem

A candidate opening `/jobs` lands on the Recommended sort by default. The
ordering asks to be trusted without showing its work — there is no way to tell
why any particular job sits where it does, or whether the ranking understood
what they are looking for at all.

**Evidence**
- `scoreJob()` in `wellfound-clone-api/src/jobs/jobs.service.ts` computes an
  additive score from six signals, then **discards it**. `decorate()` never
  returns it, so the UI could not explain a ranking even if it tried. *Read
  directly from the code — this part is certain.*
- Whether candidates are actively bothered: `[unknown — needs data]`. No support
  tickets, no research, no analytics on sort-switching behaviour.

**Why now**
Cheap to fix while the scorer is simple and additive. Every future signal added
to `scoreJob()` makes the ranking more opaque and this work slightly larger.

---

## Goals

- A candidate can tell, without leaving the jobs list, why a given job is ranked
  where it is.
- The explanation is specific to *that job* — not a general description of how
  the sort works.
- Candidates who see a poor match can tell **why** it matched, and infer what to
  change in their preferences.

## Non-goals

- **Not changing the ranking itself.** This makes the existing ranking legible,
  not better. No weight in `scoreJob()` changes.
- **Not exposing the numeric score.** It is an internal weight, not a meaningful
  quantity to a candidate, and showing it invites arguments about calibration we
  cannot currently win.
- **Not explaining absence** — why a job *didn't* rank highly, or isn't shown.
- Not touching the Recent or Salary sorts, which are self-explanatory by name.

---

## Users and scenarios

**Primary user:** the seeded demo persona — a Bengaluru-based APM with
`desiredRoles = ["Product Manager", "Associate Product Manager"]`,
`desiredLocations = ["Bengaluru", "Remote", "Hyderabad"]`, `openToRemote = true`,
`desiredSalaryMin = ₹24L`.

| # | Scenario | Today | After |
| --- | --- | --- | --- |
| 1 | Scanning the Recommended list | Sees an order with no rationale; can't tell if it understood them | Sees "Matches your role · In Bengaluru · Pays above your minimum" on the top result |
| 2 | A poor match ranks high | Concludes the sort is broken and switches to Most recent | Sees it matched only on freshness, and understands why |
| 3 | Wondering whether preferences are working | No feedback loop; preferences feel like a form that vanished | Chips reflect their stated preferences back, confirming the settings took effect |

---

## Solution

`scoreJob()` already knows which signals fired for a job; it just doesn't say so.

1. **`scoreJob()` returns `{ score, reasons[] }`** instead of a bare number. Each
   reason carries a `type`, a display `label`, and the `weight` that fired.
2. **`decorate()` attaches `matchReasons`** — the top three after the selection
   rule below — to each job in the API response, alongside the existing
   `isSaved` / `hasApplied` fields.
3. **`job-card.tsx` renders them** as a row of small chips beneath the salary
   chip, only when `sort=recommended`.
4. **The sort label changes** from "Recommended" to "Best match for you", which
   sets the expectation the chips then satisfy.

### The selection rule

This is the part that matters, and it is not the obvious implementation.

Measured across the 32 seeded jobs for the demo persona
(`evidence/signal-distribution.txt`):

| Signal | Fires | Discriminating? |
| --- | :---: | :---: |
| freshness | **100%** | No |
| roleType | **91%** | Barely |
| salary | 75% | Weakly |
| location | 53% | **Yes** |
| role title | 50% | **Yes** |
| remote | 34% | **Yes** |

A signal that fires on every job explains nothing. Ordering chips by score
weight — the natural implementation — would put `freshness` and `roleType` first
on most cards, burying the two signals that actually distinguish one job from
another.

**Rule:** classify signals as *discriminating* (role, location, remote, salary)
or *ambient* (roleType, freshness). Show discriminating signals first, capped at
three. Show ambient signals **only** when fewer than three discriminating
signals fired.

This also handles the freshness-only case (1 job in 32) without special-casing
it: that job simply falls through to the ambient tier and shows "Posted this
week".

> The 3-chip cap is evidence-led: 13 of 32 jobs fire five or six signals, and
> the card already carries salary, equity and skill chips.

**Surfaces touched**

| File | Change |
| --- | --- |
| `api/src/jobs/jobs.service.ts` | `scoreJob()` returns reasons; `decorate()` attaches `matchReasons`; add the discriminating/ambient split |
| `web/src/lib/types.ts` | Add `matchReasons: MatchReason[]` to `Job` |
| `web/src/components/jobs/job-card.tsx` | Render the chip row |
| `web/src/app/(portal)/jobs/page.tsx` | Sort label copy |

**Constraints that shape this** (`context/product-wiki.md`)
- **C4** — the scorer runs in memory, so adding returned data costs nothing in
  SQL and needs no query change.
- **Change-cost tier: Cheap→Moderate.** Purely additive to an existing response
  path. No new table, no migration, no backfill.
- **C2 does not apply** — nothing here needs to become filterable.

---

## User flows

### Happy path
1. Candidate opens `/jobs`; sort defaults to "Best match for you".
2. API returns each job with `matchReasons` (max 3).
3. Each card shows the chips beneath the salary chip.
4. Candidate reads the top result: "Matches your role · In Bengaluru · Pays above your minimum".

### Unhappy paths
- **Sort is not `recommended`** → no chips rendered. The ordering is already
  explained by the sort's name.
- **Candidate has no `JobPreference`** → only freshness can fire. Show no chips
  at all rather than "Posted this week" on every card, and surface the existing
  profile-completion prompt instead. *A chip that says nothing is worse than no chip.*
- **Only ambient signals fired** → show them, capped at two, since there is
  genuinely little to say.
- **`matchReasons` missing from the response** (older API) → card renders exactly
  as today. The field is optional on the client.

---

## Edge cases

| Case | Expected behaviour |
| --- | --- |
| Zero match reasons | Render nothing. No empty container, no placeholder. |
| Freshness only (1 in 32) | Falls to the ambient tier → single "Posted this week" chip. |
| All six signals fire (4 in 32) | Top three discriminating only. |
| Long location names | Chip truncates with ellipsis; full value in `title`. |
| Narrow viewport | Chip row wraps; never causes horizontal scroll. |
| Candidate edits preferences mid-session | Chips update on next fetch — TanStack Query already invalidates `['jobs']`. |
| Saved/hidden tabs | No chips. Neither list is ranked. |

---

## Out of scope

- **Job detail page parity** — arguably inconsistent, but the detail page is
  reached *after* the ranking decision has done its work. Revisit if reviewers
  disagree.
- **Explaining why a job ranked low** — a different and much harder problem.
- **Per-candidate weight tuning** — scored and killed at scoping (0.9).
- **Chips on other sorts.**

---

## Success metrics

| Metric | Baseline | Target | How measured |
| --- | --- | --- | --- |
| Share of sessions switching away from the default sort | `[unknown — needs baseline]` | Decrease | Sort-change event on `/jobs` |
| Preference-edit rate after viewing jobs | `[unknown — needs baseline]` | Increase | `PATCH /profile/preferences` following a jobs session |
| Apply rate from the Recommended sort | `[unknown — needs baseline]` | No decrease | Applications attributed to sort at time of apply |

**None of these are currently instrumented.** That is itself a finding: we
cannot measure whether this worked. Adding the sort-change event is a
prerequisite and should land with or before this change.

---

## Rollout

- **Reversibility:** high. It touches shared surfaces (`decorate()`,
  `job-card.tsx`), but removing the chip row restores current behaviour exactly;
  the API field can stay, unused.
- **Staging:** ship to everyone. Additive and non-destructive; a flag is more
  machinery than this warrants.
- **Rollback:** revert the `job-card.tsx` change alone. No data migration to
  unwind.

---

## Alternatives considered

Discussed in `01-solutions.md`.

| Option | Why not |
| --- | --- |
| **Rename the sort + generic tooltip** | Cheap and tempting, but explains the system identically for every job and never answers "why *this* job". The underlying problem survives the fix. Its rename is folded into this spec, since "Best match for you" sets up the chips well. |
| **Full explainability surface with weight tuning** | More than a week — persisting per-user weights means new columns on `JobPreference` plus a backfill, and it changes the ranking contract. An expensive bet on an assumption (that candidates want to tune weights) with no evidence behind it. |

> **The contestable call here** is that we rejected the near-free option in
> favour of a day's work. The argument is that a rename makes the ranking *sound*
> explained while leaving it exactly as unverifiable as before. If you disagree,
> that's the thing to push back on — reasoning in `01-solutions.md` §2.

---

## Open questions

| # | Question | Owner | Needed by |
| --- | --- | --- | --- |
| 1 | Should the job detail page show the same chips? | Head of Product | Before v2 |
| 2 | Is 3 the right cap on a 375px viewport, or is 2 better? | Design | Prototype review |
| 3 | Who owns adding the sort-change event? Without it we cannot measure success. | Head of Product | Before build starts |

---

## Changelog

Earlier versions are kept alongside this file.
