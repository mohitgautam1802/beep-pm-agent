---
name: scope-problem
description: Narrow a broad problem statement down to one specific, buildable solution using a fixed option set and scoring rubric. Use when someone brings a raw problem, idea, complaint or "we should probably do something about X" and it needs to become a scoped, decision-ready recommendation with alternatives documented. Solves Problem Statement 5.
---

# Scope a problem down to one solution

Takes a broad problem. Produces **one specific solution**, plus every
alternative considered and why it lost.

The output must be specific enough to hand to design with nothing left to argue
about. "Improve the recommendations" is a failure. "Return the three highest
scoring signals per job from `decorate()` and render them as a row of chips
under the salary chip on the job card" is a pass.

## Before you start

Read, in order:
1. `context/product-wiki.md` — especially §3 constraints and §7 change-cost signals
2. `context/prioritisation-rubric.md` — the anchors, formula and tie-break ladder

Do not score anything from memory. The anchors exist so two people produce the
same numbers; paraphrasing them from recall defeats the entire mechanism.

---

## Step 1 — Capture the problem verbatim

Create `pipeline/<slug>/` and write `00-problem.md` containing the problem
**exactly as it was given**, plus who raised it and when.

Do not improve the wording. The raw phrasing is evidence — it shows how the
problem is actually experienced, and later steps get compared against it.

Pick a short kebab-case slug from the problem, e.g. `why-recommended`.

## Step 2 — Restate and bound

In `01-scoping.md`, write:

- **Problem** — one sentence, in the user's language, not the system's
- **Who hurts** — which persona, on which screen, doing what
- **Evidence** — what we actually know. Mark gaps `[unknown — needs data]`
- **In scope / out of scope** — two short lists. The out-of-scope list is what
  stops this expanding while you work
- **What "solved" looks like** — an observable change, not a feeling

If the problem contains two problems, stop and say so. Ask which one to scope.
Scoping a compound problem produces a compound solution, which is how teams end
up building the wrong thing twice.

## Step 3 — Generate the mandated option set

Exactly one option per tier from the rubric: **A Do nothing**, **B Process /
ops**, **C Configuration / copy**, **D Small build**, **E Large build**.
Optionally **F Hybrid** if genuinely distinct from D.

For each: a title, two or three sentences of what it actually is, and the
specific files or surfaces it touches (cite the wiki).

If a tier genuinely has no viable option, write "None viable" and one line of
why. Never silently skip a tier — the empty tiers are informative.

## Step 4 — Score every option

Score all five dimensions 1–5 against the written anchors. For each score,
record the anchor phrase or evidence you used. Effort **must** cite a
change-cost tier or constraint id (C1–C7).

Produce the table:

| Opt | Title | Reach | Impact | Conf | Effort | Risk | Value | Cost | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

`Value = R × I × C`, `Cost = E × Rk`, `Score = Value / Cost` to 1dp.

Then apply the **kill criteria**. If any trigger, the recommendation is "don't
build this yet" and you say so plainly — that is a real result, not a failure.

## Step 5 — Converge

Apply the tie-break ladder if scores are close.

Then apply the **judgement check**: does the top-scoring option actually solve
the problem in §2, or only its symptom? A cheap option that dodges the root
cause will often out-score the right one — that is the known weakness of any
scoring model.

If you override the score, you **must** record all three lines:
- which option the score picked
- which you chose instead
- **which specific criterion the score failed to capture**

An override missing the third line is not allowed. Delete it and re-think.

## Step 6 — Specify the winner

This is the step people rush. Don't. Write:

- **The solution**, in 3–5 sentences, concrete enough to build
- **Surfaces touched** — actual file paths from the wiki
- **Behaviour** — what changes, from the user's point of view
- **Explicitly not doing** — the adjacent things someone will otherwise assume
- **Open questions** — what design or engineering still needs to decide

Then the **rejected alternatives** table: every other option, its score, and one
sentence on why it lost. Reviewers read this more than the recommendation.

## Step 7 — Write state and stop

Write `state.json` with `stage: "AWAITING_SCOPE_CONFIRMATION"`.

### ⛔ GATE 1

Print a summary: the chosen option, its score, the runner-up, and the single
biggest open question.

Then **stop**. Ask the operator to confirm the option, pick a different one, or
send it back for re-scoping.

Do not run `/write-spec` yourself. Do not assume confirmation because the
reasoning is sound. Wait.

---

## Quality bar

Before you present, check:

- [ ] Every tier A–E has an option or an explicit "None viable"
- [ ] Every Effort score cites a change-cost tier or constraint id
- [ ] Every `[unknown]` is reflected in a low Confidence score
- [ ] Kill criteria were checked and the result stated
- [ ] The chosen solution names real files, not vague areas
- [ ] The rejected table has a reason per row, not just numbers
- [ ] Any override records which criterion the score missed
