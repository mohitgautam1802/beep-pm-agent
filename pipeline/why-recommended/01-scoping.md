# Scoping — Candidates can't tell why a job is recommended

**Stage:** Gate 1 · awaiting confirmation
**Rubric:** `context/prioritisation-rubric.md`
**Product context:** `context/product-wiki.md`

## Recommendation

**Option D — return the matched signals from the API and show them as reasons on
the job card.**

This is a **score override**. Option C scored higher (30.0 vs 7.5) and is being
rejected anyway. The reasoning is in §5 — a reviewer who disagrees should start
there.

---

## 1. Problem, restated and bounded

**Problem.** A candidate looking at the Recommended sort on `/jobs` has no way
to tell why any particular job is in the position it is. The ordering asks to be
trusted without showing its work.

**Who hurts.** Every candidate on `/jobs`, which defaults to `sort=recommended`.
The demo persona — a Bengaluru APM with
`desiredRoles = ["Product Manager", "Associate Product Manager"]` — is typical.

**Evidence.**
- `scoreJob()` in `jobs.service.ts` computes an additive score from six signals
  (product-wiki §4). **The score is computed and then discarded** — `decorate()`
  never returns it, so the UI could not explain a ranking even if it wanted to.
  *This part is certain; it is read directly from the code.*
- Whether candidates are actively bothered: `[unknown — needs data]`. No support
  tickets, no research, no analytics on sort switching.

**In scope**
- The Recommended sort on the jobs list
- Explaining an individual job's position

**Out of scope**
- Changing the ranking algorithm itself — this is about making the existing
  ranking legible, not better
- Recruiter-side visibility
- The Recent and Salary sorts, which are self-explanatory by name

**Solved looks like.** A candidate can point at any job in the Recommended list
and say why it is there, without leaving the page.

---

## 2. Options considered

One per mandated tier.

**A — Do nothing.**
Leave the ranking opaque. Candidates who distrust the order switch to Most
recent, which is self-explanatory. Costs nothing; the escape hatch already
exists.

**B — Document the ranking in a help article.**
Write a help page explaining the six signals and their weights, and link it from
the sort control. No product change. Touches no code.

**C — Rename the sort and add a generic tooltip.**
Change "Recommended" to "Best match for you" and add a tooltip listing the
signals in general terms. Copy-only, in
`wellfound-clone-web/src/app/(portal)/jobs/page.tsx`.

**D — Return matched signals and render them on the card.**
`scoreJob()` already knows which signals fired. Return the top three from
`decorate()` and render them as chips under the salary chip on
`job-card.tsx` — e.g. "Matches your role", "In Bengaluru", "Posted this week".
Touches `jobs.service.ts` (`scoreJob`, `decorate`), `types.ts`, `job-card.tsx`.

**E — Explainability centre with weight tuning.**
A dedicated surface showing the full per-signal breakdown for every job, plus
controls to tune the weights per candidate. Requires persisting per-user
weights — new columns on `JobPreference` — and changing the ranking contract.

No hybrid option: D already contains the useful part of C.

---

## 3. Scoring

Anchors from `prioritisation-rubric.md` §2. `Value = R × I × C`,
`Cost = E × Rk`, `Score = Value / Cost`.

| Opt | Title | Reach | Impact | Conf | Effort | Risk | Value | Cost | **Score** |
| --- | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| A | Do nothing | 5 | 3 | 3 | 1 | 3 | 45 | 3 | **15.0*** |
| B | Help article | 2 | 2 | 4 | 1 | 1 | 16 | 1 | **16.0** |
| C | Rename + generic tooltip | 5 | 2 | 3 | 1 | 1 | 30 | 1 | **30.0** |
| D | Match reasons on the card | 5 | 3 | 3 | 2 | 3 | 45 | 6 | **7.5** |
| E | Explainability centre | 3 | 3 | 2 | 5 | 4 | 18 | 20 | **0.9** |

\* A's score measures the cost of inaction. It is not competing to win.

### Why each score

**Reach.** A, C, D = 5: they sit on `/jobs`, which defaults to this sort, so
effectively every candidate meets them (anchor 5: "sits on a core flow"). B = 2:
only candidates who go looking for help docs (anchor 2: "under ~10%"). E = 3: a
tuning surface is used by engaged candidates, not everyone.

**Impact.** D and A = 3: "real friction — causes rework, a support question, or
a wrong choice" — a candidate mis-reading the ordering applies to the wrong
roles. B and C = 2: "mild friction; adds a moment of confusion" — both explain
the *system* without explaining *this job*.

**Confidence.** 3 for anything resting on "candidates are confused" — anchor 3,
"a clear reasoned argument from the code", which is exactly what we have and no
more. B = 4 because we are confident the doc would be *accurate* (we can read
`scoreJob`), regardless of whether anyone reads it. E = 2: that candidates want
to tune weights is a hunch with no support at all.

**Effort.** C, B = 1: copy only, under half a day. D = 2: "Cheap" tier in
product-wiki §7 — the score already exists (C4), `decorate()` is already the
place where per-user fields are attached, and there is **no schema change and no
migration**. E = 5: persisting per-user weights means new columns plus a
backfill, and it changes the ranking contract.

**Risk.** B, C = 1: copy is trivially reversible. D = 3 by the anchor's own
words — it "touches a shared surface (`job-card.tsx`, `api.ts`, `decorate()`)",
all three of which it touches. E = 4: changes stored data and an existing
contract.

### Kill criteria

- `Reach × Impact` for the problem = 5 × 3 = **15** — well above the ≤ 4 floor. ✅
- The winner is not an expensive bet on a hunch (`Confidence 3`, `Effort 2`). ✅
- **Option E scores 0.9, below the 1.0 floor — killed by rule**, not by opinion.

---

## 4. Tie-break

Not needed. C (30.0) and D (7.5) are not close.

---

## 5. Judgement override

Recorded per rubric §7. All three lines are required.

- **The score picked:** Option C — rename the sort and add a generic tooltip (30.0).
- **Chosen instead:** Option D — return matched signals and render them on the card (7.5).
- **Which criterion the score failed to capture:** *The rubric measures how
  severe the friction is, not whether the explanation is verifiable for a
  specific job.* The problem statement is per-job — "why is **this** job
  recommended **to me**". C answers a different, general question ("what does
  this sort consider?") and answers it identically for every job on the page. It
  scores well because it is nearly free and touches everyone, not because it
  solves the stated problem. Under the rubric, a cheap symptom-level fix will
  always out-score a correct one when Effort and Risk sit in the denominator;
  this is the known weakness of the model, and §7 exists for exactly this case.

**Cost of the override.** We are choosing an option that is 4× more expensive
and touches three shared files, on Confidence 3. That is a real trade and it
should be argued with rather than nodded through. The mitigation is that D is
still only a ~1-day change with no migration, so being wrong is cheap to undo.

**Note.** C is not discarded — its rename is folded into D as a copy change,
since "Best match for you" sets the right expectation for the chips that follow.

---

## 6. The chosen solution, specified

`scoreJob()` already computes which signals fired for each job; today the result
is thrown away after sorting. Change it to return the contributing signals
alongside the score, have `decorate()` attach the **top three by weight** to each
job in the API response as a `matchReasons` array, and render them on the job
card as a row of chips beneath the existing salary chip. Rename the sort option
from "Recommended" to "Best match for you" at the same time.

**Surfaces touched**

| File | Change |
| --- | --- |
| `api/src/jobs/jobs.service.ts` | `scoreJob()` returns `{ score, reasons[] }`; `decorate()` attaches `matchReasons` |
| `web/src/lib/types.ts` | Add `matchReasons: MatchReason[]` to `Job` |
| `web/src/components/jobs/job-card.tsx` | Render the chips |
| `web/src/app/(portal)/jobs/page.tsx` | Sort label copy change |

**Behaviour.** On the Recommended sort, each job card shows up to three short
chips explaining its position — role match, location match, freshness, salary
fit, remote fit. Other sorts show no chips, because the ordering there is
already implied by the sort name.

**Explicitly not doing**
- Not showing the numeric score. It is an internal weight, not a meaningful
  quantity to a candidate, and exposing it invites arguments about calibration.
- Not changing any weight in `scoreJob()`.
- Not adding chips to the job detail page in v1 — see open questions.

**Open questions**
1. ~~Three chips, or all that fired?~~ **Resolved — three.** See §6a.
2. ~~What shows when a job matches on freshness only?~~ **Resolved — a 3% edge
   case, handled by the low-information rule.** See §6a.
3. Does the job detail page need the same treatment for consistency? **Still
   open** — deferred out of v1.

---

## 6a. Evidence check — measured against the real seed data

Questions 1 and 2 were answerable rather than debatable, so they were measured
instead of argued. Script: `evidence/analyse-match-signals.mjs`, run against the
32 seeded jobs for the demo persona.

**How often each signal fires**

| Signal | Fires | Share |
| --- | :---: | :---: |
| freshness | 32 / 32 | **100%** |
| roleType | 29 / 32 | **91%** |
| salary | 24 / 32 | 75% |
| location | 17 / 32 | 53% |
| role title | 16 / 32 | 50% |
| remote | 11 / 32 | 34% |

Signals per job — **average 4.0**. Distribution: 1 signal → 1 job, 2 → 2, 3 → 9,
4 → 7, 5 → 9, 6 → 4.

**What this settles**

1. **Cap at three — confirmed.** 13 of 32 jobs fire five or six signals. Showing
   all of them would put six chips on a card that already carries salary, equity
   and skill chips. The cap is now evidence-backed, not a guess.

2. **Freshness-only is a 3% case** — 1 job of 32, and zero jobs match nothing at
   all. It does not need dedicated design, but it is still handled by the rule
   below rather than left to chance.

3. **A signal that always fires explains nothing** — and this is a genuine
   change to the solution. Freshness fires for 100% of jobs and `roleType` for
   91%. A chip saying "Full time" or "Posted recently" on nearly every card is
   visual noise that dilutes the two chips that actually discriminate — role
   title (50%) and location (53%).

**Consequent design change.** Rank the chips by **information value, not by
score weight**: prefer signals that fire for fewer jobs in the current result
set. Concretely — suppress `roleType` and `freshness` whenever at least one
discriminating signal (role, location, remote, salary) is present, and fall back
to them only when nothing else fired. That fallback is exactly the 1-in-32 case
from finding 2, so the edge case and the noise problem share one fix.

> Ordering chips by `scoreJob` weight — the obvious implementation — would have
> put the *least* informative signals first on most cards. The data caught that
> before design started, which is the entire point of doing this check at
> scoping time rather than after a prototype round.

---

## 7. Rejected alternatives

| Option | Score | Why not |
| --- | :---: | --- |
| A — Do nothing | 15.0* | The escape hatch (switch to Most recent) works, but it means abandoning the default sort rather than fixing it. |
| B — Help article | 16.0 | Accurate but unread. Requires the candidate to leave the page and go looking, which almost none will. |
| C — Rename + tooltip | 30.0 | Highest scoring, rejected per §5 — explains the system, not the individual job. Its rename is folded into D. |
| E — Explainability centre | 0.9 | Killed by rule (below the 1.0 floor). Expensive, needs schema change and a backfill, and rests on Confidence 2. |

---

## 8. Gate 1

**Waiting on:** Associate PM (operator), in session.

**Decide:** confirm Option D, pick a different option, or send back for
re-scoping.

**Biggest open question:** none blocking. The two design questions were measured
and resolved in §6a; the surviving question (job detail page parity) is
deliberately deferred out of v1 and does not change the shape of the work.

**What the reviewer should push back on**, if anything:
- The **§5 override** — we are rejecting the highest-scoring option on
  judgement. That is the one genuinely contestable call here.
- **Confidence 3.** Nothing about the *problem* has been measured. §6a measured
  the *solution's* behaviour against real data, which sharpened the design but
  did not raise our confidence that candidates are bothered. The scores are
  unchanged and deliberately so.

**Estimated cost if confirmed:** ~1 day. No schema change, no migration (C4,
product-wiki §7 "Cheap" tier).
