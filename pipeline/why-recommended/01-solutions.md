# Solutions — Candidates can't tell why a job is recommended

**Outcome:** decided · **Decided by:** Mohit Gautam (APM) · **Date:** 2026-09-04

## Decision

**Show up to three "match reason" chips on each job card in the Recommended
sort**, explaining why that specific job ranked where it did.

`scoreJob()` already computes which signals fired for every job — role match,
location, remote, salary, role type, freshness — and then throws the result away
before it reaches the UI. We return the signals that fired, pick the three most
informative, and render them as chips beneath the existing salary chip. The sort
label changes from "Recommended" to "Best match for you" at the same time.

**Concretely:**

| File | Change |
| --- | --- |
| `api/src/jobs/jobs.service.ts` | `scoreJob()` returns `{ score, reasons[] }`; `decorate()` attaches `matchReasons` |
| `web/src/lib/types.ts` | Add `matchReasons: MatchReason[]` to `Job` |
| `web/src/components/jobs/job-card.tsx` | Render the chip row |
| `web/src/app/(portal)/jobs/page.tsx` | Sort label copy |

**Effort:** about a day. No schema change, no migration — the scorer runs in
memory (C4) and `decorate()` is already where per-user fields get attached.

---

## 1. The problem

A candidate opening `/jobs` lands on the Recommended sort by default. The
ordering asks to be trusted without showing its work.

**Who hurts:** every candidate on `/jobs` — it's the default sort, so this is
the first ordering anyone sees.

**What we know:** `scoreJob()` computes an additive score from six signals and
discards it. The UI *could not* explain a ranking even if it wanted to. Read
straight from the code — this part is certain.

**What we're assuming:** that candidates are bothered by it.
`[unknown — needs data]` — no support tickets, no research, no analytics on
sort-switching. Worth stating plainly, because it shaped how ambitious an option
was worth picking.

**Root cause vs symptom:** the symptom is confusion. The cause is that the
ranking is *unverifiable* — there is no way to check whether it understood you.
That distinction decided this.

---

## 2. Options discussed

### A — Rename the sort and add a tooltip
Change "Recommended" to "Best match for you" and add a tooltip listing the
signals in general terms. Copy-only, in `jobs/page.tsx`.

- **Impact:** low. Sets expectations, explains nothing specific.
- **Effort:** under half a day. Copy only.
- **Risk:** almost none. Trivially reversible.
- **Doesn't solve:** the actual question. It explains the *system* identically
  for every job, and never answers "why **this** job".

### B — Match reasons on the card *(chosen)*
Return the signals that fired and show the top three as chips per job.

- **Impact:** high. The candidate can see the ranking's reasoning per job, and
  can tell when it has misread them.
- **Effort:** ~1 day. Additive to an existing response path (C4). No migration.
- **Risk:** moderate — touches shared surfaces (`decorate()`, `job-card.tsx`),
  but removing the chip row restores current behaviour exactly.
- **Doesn't solve:** why a job ranked *low*, or why something isn't shown at all.

### C — Full explainability surface with weight tuning
A dedicated view showing the per-signal breakdown for every job, plus controls
to tune weights per candidate.

- **Impact:** high for the few who'd use it.
- **Effort:** more than a week. Persisting per-user weights means new columns on
  `JobPreference` plus a backfill, and it changes the ranking contract.
- **Risk:** high. Changes stored data and an existing contract.
- **Doesn't solve:** anything for the majority who will never open a tuning
  screen — and it rests on an assumption (that candidates want to tune weights)
  with no evidence behind it at all.

**Recommendation at the time:** B. A is cheap and tempting, but ship it alone
and the underlying problem is untouched — the candidate still can't verify a
single ranking. C is an expensive bet on an unevidenced assumption, which is the
worst combination available. B is the smallest change that makes the ranking
actually checkable, and it's cheap to undo if we're wrong.

A's rename was folded into B, since "Best match for you" sets up the chips well.

---

## 3. What changed during the discussion

The brainstorm raised a fair objection: **every job has some freshness score, so
would most cards just show "Posted recently" and look useless?**

That was answerable rather than debatable, so it was measured against the 32
seeded jobs for the demo persona (`evidence/analyse-match-signals.mjs`):

| Signal | Fires | Discriminating? |
| --- | :---: | :---: |
| freshness | **100%** | No |
| roleType | **91%** | Barely |
| salary | 75% | Weakly |
| location | 53% | **Yes** |
| role title | 50% | **Yes** |
| remote | 34% | **Yes** |

Signals per job: **average 4.0**. Thirteen of 32 jobs fire five or six.

**Three things came out of this:**

1. **The objection was mostly wrong** — freshness-*only* is 1 job in 32, and no
   job matches nothing.
2. **But it exposed a real design flaw.** A signal that fires on every job
   explains nothing. Ordering chips by score weight — the obvious
   implementation — would have surfaced the *least* informative signals first on
   most cards.
3. **So the design changed.** Split signals into **discriminating** (role,
   location, remote, salary) and **ambient** (roleType, freshness). Show
   discriminating first, capped at three; fall back to ambient only when fewer
   than three discriminating signals fired. That also handles the freshness-only
   case without special-casing it.

The 3-chip cap became evidence-led rather than a guess: with 13 of 32 jobs
firing five or six signals, showing all of them would put six chips on a card
that already carries salary, equity and skill chips.

> This is the part worth noticing. Five minutes of querying real data changed
> the shape of the solution **before** any design existed. Left to a prototype
> round, it would have cost a week.

---

## 4. Open questions

| # | Question | Owner |
| --- | --- | --- |
| 1 | Should the job detail page show the same chips? | Head of Product |
| 2 | Is 3 the right cap on a 375px viewport, or is 2 better? | Design |
| 3 | Who owns adding the sort-change event? Without it we can't measure whether this worked. | Head of Product |

Question 3 is the uncomfortable one: **none of the success metrics are
instrumented today.** We can ship this and have no way of knowing if it helped.
That's worth resolving before build starts, not after.
