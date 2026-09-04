# <Title — the change, not the problem>

> **Status:** Draft | In review | Approved | Superseded
> **Spec version:** v1 · **Prototype:** — · **Jira:** —
> **Author:** Beep PM agent · **Approver:** Head of Product
> **Last updated:** YYYY-MM-DD

## Decision

<Two or three sentences. What we are building and why, stated up front so a
reviewer never has to scroll to find the point. If they read only this, they
should know what they are approving.>

---

## Problem

<One paragraph in the user's language. What goes wrong, for whom, on which
screen. No solution language here.>

**Evidence**
- <What we actually know. Mark gaps `[unknown — needs data]`.>

**Why now**
- <What makes this worth doing this cycle rather than next.>

---

## Goals

- <Observable outcome, not an activity. "Candidates can tell why a job ranked
  where it did" — not "ship match reasons".>

## Non-goals

- <The adjacent things we are deliberately not doing. This list prevents the
  scope creep that "goals" alone invites.>

---

## Users and scenarios

**Primary user:** <persona, from product-wiki §8 where possible>

| # | Scenario | Today | After |
| --- | --- | --- | --- |
| 1 | <what they're trying to do> | <what happens now> | <what happens instead> |

---

## Solution

<The specific change. Concrete enough to hand to design with nothing left to
infer.>

**Surfaces touched**

| File / area | Change |
| --- | --- |
| `path/to/file` | <what changes> |

**Constraints that shape this**
- <Cite product-wiki constraint ids (C1–C7) and change-cost tier. This is what
  makes the effort estimate checkable rather than a guess.>

---

## User flows

### Happy path
1. <step>
2. <step>

### Unhappy paths
- **<condition>** → <behaviour>

---

## Edge cases

| Case | Expected behaviour |
| --- | --- |
| Empty / zero results | |
| First run, no data yet | |
| Stale or cached data | |
| Failure of the underlying call | |

---

## Out of scope

- <Explicitly deferred, with one line on why. Different from non-goals: these
  are things we may well do later.>

---

## Success metrics

| Metric | Baseline | Target | How measured |
| --- | --- | --- | --- |
| | `[unknown — needs baseline]` | | |

---

## Rollout

- **Reversibility:** <cite the Risk score from scoping>
- **Staging:** <flagged? behind a setting? straight to everyone?>
- **Rollback plan:** <what we do if it goes wrong>

---

## Alternatives considered

<Carried over from scoping. Reviewers read this more than the recommendation,
because it answers "why not the obvious cheaper thing?".>

| Option | Score | Why not |
| --- | --- | --- |

---

## Open questions

| # | Question | Owner | Needed by |
| --- | --- | --- | --- |
| 1 | | | |

> An empty Open questions section is almost always a lie. If there are genuinely
> none, write "None — all resolved in v<n>, see CHANGELOG."

---

## Changelog

See `CHANGELOG.md` for the full version history and diffs.
