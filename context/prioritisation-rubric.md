# Prioritisation rubric

The assignment's bar for the scoping tool is:

> Given the same problem, two different people using your tool converge on a
> similarly specific solution — i.e. the process is repeatable, not just
> vibes-based.

Free-form judgement cannot clear that bar. This rubric is the mechanism that
does. Three things make it repeatable:

1. **A mandated option set** — so two people generate comparable candidates.
2. **Written anchors for every score** — so "Impact: 4" means the same thing twice.
3. **A fixed formula and a fixed tie-break ladder** — so identical inputs give
   identical winners, with no discretion at the final step.

---

## 1. The mandated option set

Always generate **exactly one option per tier**, in this order. If a tier has no
sensible option, write "None viable" and say why — never silently skip it.

| # | Tier | What it means |
| --- | --- | --- |
| A | **Do nothing** | Live with it. Always listed, so "is this worth solving at all?" is a real answer. |
| B | **Process / ops workaround** | Fix it with a human step, a doc, or a manual sweep. No code. |
| C | **Configuration / copy** | Fix it by changing text, defaults, thresholds or existing settings. |
| D | **Small build** | Fits the "Cheap" or "Moderate" tier in the product wiki's change-cost signals. |
| E | **Large build** | Hits an "Expensive" signal — new tables, backfills, uploads, architecture. |

Optionally add **F — Hybrid**, but only if it is genuinely distinct from D.

This forces the cheap answers to be considered *before* the expensive ones,
which is the failure mode the assignment names: teams jumping straight to
building.

---

## 2. Scoring dimensions

Score every option **1–5** on all five dimensions using these anchors. Anchors
are not suggestions — pick the row that matches and record the evidence.

### Reach — how many candidates encounter this per month

| Score | Anchor |
| --- | --- |
| 1 | A handful. Edge case or rare configuration. |
| 2 | A minority — under ~10% of active candidates. |
| 3 | A meaningful slice — roughly 10–35%. |
| 4 | Most — roughly 35–75%. |
| 5 | Effectively everyone. Sits on a core flow (`/jobs`, `/applied`, sign-in). |

### Impact — how bad is it when someone hits it

| Score | Anchor |
| --- | --- |
| 1 | Cosmetic. Noticed, not felt. |
| 2 | Mild friction. Adds a step or a moment of confusion. |
| 3 | Real friction. Causes rework, a support question, or a wrong choice. |
| 4 | Blocks a primary task, or causes silent data loss the user can't see. |
| 5 | Breaks trust or loses the candidate entirely. |

### Confidence — how good is the evidence

| Score | Anchor |
| --- | --- |
| 1 | Someone's hunch. No evidence. |
| 2 | A single anecdote or one support ticket. |
| 3 | Repeated qualitative signal, or a clear reasoned argument from the code. |
| 4 | Quantitative signal from data, or several independent reports. |
| 5 | Directly measured, with a baseline number we can quote. |

### Effort — cost to build, calibrated to *this* codebase

Map directly onto the **change-cost signals** in `product-wiki.md`. Cite the
signal (C1–C7) or tier you used.

| Score | Anchor |
| --- | --- |
| 1 | Under half a day. Copy, a constant, a `format.ts` change. |
| 2 | About a day. "Cheap" tier — new vocabulary value, new filter on an existing column, scorer tweak. |
| 3 | 1–3 days. "Moderate" tier — new field + DTO + UI, or a new endpoint over existing tables. |
| 4 | About a week. Several moving parts, or one "Expensive" signal. |
| 5 | More than a week. Migration + backfill, file storage, or architectural change. |

### Risk — blast radius and reversibility

| Score | Anchor |
| --- | --- |
| 1 | Trivially reversible. Feature-flagged or copy-only. |
| 2 | Additive. Nothing existing changes behaviour. |
| 3 | Touches a shared surface (`job-card.tsx`, `api.ts`, `decorate()`), but is revertible. |
| 4 | Changes stored data or an existing contract. Reverting needs care. |
| 5 | Irreversible without a migration, or it changes something candidates already rely on. |

---

## 3. The formula

```
Value = Reach × Impact × Confidence      (1 – 125)
Cost  = Effort × Risk                    (1 – 25)
Score = Value / Cost                     (round to 1 decimal place)
```

Higher wins. Multiplicative on purpose: an option that is high-reach but
zero-confidence should not beat a well-evidenced one, and multiplying punishes a
weak dimension harder than adding would.

**Option A (Do nothing)** is scored differently: `Effort = 1`, `Risk` = the risk
of *leaving it alone*. If A wins, the honest output is "don't build this yet."

---

## 4. Tie-break ladder

Apply in order, stopping at the first that separates them. The last rung is
arbitrary but deterministic — that is the point.

1. Higher **Confidence**
2. Lower **Effort**
3. Higher **Reach**
4. Lower **Risk**
5. Alphabetical by option title

---

## 5. Kill criteria

Stop and recommend **Do nothing** if any hold:

- `Reach × Impact ≤ 4` — too rare and too mild to spend a sprint on.
- `Confidence ≤ 2` **and** `Effort ≥ 4` — an expensive bet on a hunch. Go get
  evidence first; that is itself the recommendation.
- The winning option scores below **1.0** — cost exceeds value on our own numbers.

Recommending "don't build this" is a valid, and often the most valuable, output.

---

## 6. Worked calibration example

Problem: *"Candidates can't tell why a job is recommended."*

| Opt | Title | R | I | C | E | Rk | Value | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | Do nothing | 4 | 3 | 4 | 1 | 3 | 48 | 3 | 16.0* |
| B | Document the algorithm in help text | 4 | 2 | 4 | 1 | 1 | 32 | 1 | 32.0 |
| C | Rename the sort to "Best match for you" | 5 | 2 | 3 | 1 | 1 | 30 | 1 | 30.0 |
| D | Return match reasons and show them on the card | 5 | 3 | 4 | 2 | 2 | 60 | 4 | 15.0 |
| E | Full explainability centre with weight tuning | 3 | 3 | 2 | 5 | 4 | 18 | 20 | 0.9 |

\* A's score is read inversely — it measures the cost of inaction, not a win.

Raw scores favour B. But B and C treat the symptom (candidates are *confused*)
without addressing the cause (the ranking is *unverifiable*), so they fail the
problem statement rather than solve it. **This is exactly where judgement
belongs, and it must be written down** — see §7.

---

## 7. Where judgement is allowed, and how it is recorded

The rubric ranks. It does not decide. A human may override the top-scoring
option, but only by recording, in the scoping doc:

- Which option the score picked
- Which option was chosen instead
- **Which specific criterion the score failed to capture**

An override without that third line is not permitted. This keeps the process
repeatable while staying honest that scoring models miss things — and it leaves
a trail a reviewer can argue with later.
