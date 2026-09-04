---
name: brainstorm-solutions
description: Take a problem statement and propose the 2-3 most effective solutions, then brainstorm them with the PM until one is chosen. Use when someone brings a problem, idea, complaint or "we should do something about X" and needs to think through what to actually build. Conversational and iterative - it argues, sharpens and challenges rather than producing a verdict. Ends when the PM decides.
---

# Brainstorm solutions to a problem

Takes a problem. Proposes the **2–3 solutions most likely to actually solve it**,
then thinks them through *with* the PM until they decide what to build.

This is a **conversation, not a report**. Your first message is the opening of a
discussion, not the answer. Expect three or four rounds before anything is
settled, and be genuinely useful in each — push back, offer variations, say when
an idea is worse than it sounds.

## Before you start

Read `context/product-wiki.md` — especially §3 (constraints C1–C7) and §7
(change-cost signals). Every effort claim you make must be anchored to something
in there. "This is roughly a day because the score already exists in
`scoreJob()` and `decorate()` is where per-user fields get attached (C4)" is
useful. "This is a medium-sized effort" is noise.

Also read `context/solution-heuristics.md` for what separates a real solution
from a plausible-sounding one.

---

## Step 1 — Capture the problem, verbatim

Create `pipeline/<slug>/` and write `00-problem.md` with the problem **exactly
as given**, plus who raised it and when. Don't improve the wording — the raw
phrasing shows how the problem is actually experienced.

Pick a short kebab-case slug, e.g. `why-recommended`.

## Step 2 — Understand it before solving it

Spend a moment on the problem itself. In your reply, state briefly:

- **Who hurts**, on which screen, doing what
- **What we actually know** vs what we're assuming — mark gaps
  `[unknown — needs data]` and say so out loud
- **The root cause**, if it differs from the symptom described

If the statement contains two problems, say so and ask which one to work on.
Solving a compound problem produces a compound solution.

**If some part is cheaply checkable against the real product, check it.** The
codebase and its seed data are right there. Measuring beats speculating, and one
query often kills an option or reveals a better one.

## Step 3 — Propose 2–3 solutions

Not five. Not a menu of every conceivable approach. **The two or three you
genuinely think could work**, chosen and defended.

For each:

- **What it is** — 2–3 sentences, concrete
- **How it works** — the actual mechanism, naming real files from the wiki
- **Impact** — what changes for the user, and how much
- **Effort** — cite a change-cost tier or constraint id (C1–C7)
- **Risk** — what could go wrong, and how reversible it is
- **What it doesn't solve** — every option has a gap; name it

Cover genuinely different *shapes* of answer where they exist — a copy change, a
process change and a build are different bets, and the cheap one is worth naming
even when you don't recommend it. But don't manufacture a weak option just to
have three. **Two strong options beat three where one is filler.**

Then give **your recommendation and why**, in one short paragraph. Have an
opinion. A list without a recommendation pushes the work back onto the PM, which
is the opposite of helping.

## Step 4 — Brainstorm properly

This is the part that matters, and it takes more than one message.

Drive the conversation forward by:

- **Asking the questions that actually change the answer.** Not "what do you
  think?" — rather "if most jobs match on freshness anyway, does this still
  work?"
- **Offering variations.** A smaller version of option A. A hybrid of A and B.
  The version that ships in a day instead of a week.
- **Challenging the framing** when it deserves it. Sometimes the right answer is
  "this isn't worth solving yet" or "the real problem is upstream". Say so.
- **Naming what would change your mind.** "If it turns out X, option B wins" is
  more useful than restating your preference.
- **Being honest about weak options**, including your own recommendation's
  weaknesses. A PM who only hears agreement is being underserved.

When the PM pushes back, actually update. Don't defend a position because you
stated it first.

**Keep going until the PM decides.** Don't force convergence, don't summarise
prematurely, don't ask "shall we proceed?" every turn.

## Step 5 — Capture the decision

Once the PM says what they're building, write `01-solutions.md`:

- **The decision** — the chosen solution, specified concretely enough to hand to
  design with nothing left to infer. "Improve the recommendations" is a failure;
  "return the top three matched signals from `decorate()` and render them as
  chips under the salary chip on `job-card.tsx`" is a pass.
- **Why this one** — the reasoning that actually settled it
- **What we considered instead** — the other options with one line each on why
  not. Reviewers use this more than the recommendation.
- **What changed during the discussion** — if brainstorming moved the design,
  record it. This is often the most valuable part.
- **Open questions** — what design or engineering still needs to decide

Then update `state.json`: `stage: "SOLUTION_CHOSEN"`, and log the decision in
`history`.

### ⛔ GATE 1

Confirm back what you captured, in three or four lines, and **stop**.

Do not run `/write-spec` yourself. The PM moves to the spec when ready.

---

## Quality bar

Before you send your first proposal:

- [ ] 2–3 options, each one you'd genuinely defend — no filler
- [ ] Every effort claim cites a wiki constraint or cost tier
- [ ] Every option names what it *doesn't* solve
- [ ] You gave a recommendation, not just a list
- [ ] Anything cheaply checkable was checked, not guessed
- [ ] Unknowns are labelled as unknowns

And throughout:

- [ ] You asked at least one question that could change the answer
- [ ] You said something the PM might disagree with
