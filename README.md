# Beep PM Agent

**Hiring assignment — Associate Product Manager, Beep**
Solves **Problem Statements 5, 6 and 7** as one connected pipeline.

An agent that takes a raw problem, narrows it to one buildable solution, writes
the PRD, files it in Jira, builds a clickable prototype, auto-shares it for
review, and keeps the PRD in sync as feedback arrives — stopping at every point
where a human has to decide.

| PS | Ask | Built as |
| --- | --- | --- |
| **5** | Problem space → exact solution | `/scope-problem` |
| **6** | Solution → prototype, auto-shared, with feedback | `/build-prototype` |
| **7** | Changed prototype → updated PRD with a diff | `/sync-prd` |

`/write-spec` sits between 5 and 6 — it turns the scoping decision into a PRD,
files the Jira issue, and routes it for approval.

---

## Why it's built on a real codebase

Most PRD generators produce plausible documents about nothing. This one reasons
about a **real product**: a Wellfound candidate-portal clone
([API](https://github.com/mohitgautam1802/wellfound-clone-api),
[web](https://github.com/mohitgautam1802/wellfound-clone-web)) with 32 seeded
jobs, 16 companies, a real Prisma schema and real architectural constraints.

That's what `context/product-wiki.md` encodes. It's why the agent can say
*"~1 day, no migration, because the score already exists in `scoreJob()` and
`decorate()` is already where per-user fields get attached (C4)"* instead of
*"this is a medium-sized effort."*

**An estimate you can check beats an estimate that sounds confident.**

---

## The problem it actually solves

Three failures this is built against, all named in the brief:

1. **Teams jump straight to building.** The scoping skill *forces* five options
   — including "do nothing" and two non-code options — to be scored before any
   build option can win.
2. **Scoping isn't repeatable.** The brief's bar is that two people converge on
   a similar answer. Free-form judgement can't clear that, so scoring uses
   written anchors, a fixed formula, and a deterministic tie-break ladder.
3. **PRDs drift from prototypes.** Every sync writes a *new version* plus a
   changelog and a diff. Nothing is ever silently overwritten.

---

## How it works end to end

```
  raw problem
      │
      ▼
  ① /scope-problem        → 01-scoping.md  (5 options, scored, alternatives kept)
      │                     ⛔ GATE 1 — operator confirms the option
      ▼
  ② /write-spec           → 02-spec.v1.md + Jira issue + review email
      │                     ⛔ GATE 2 — Head of Product approves
      ▼
  ③ /build-prototype      → prototype artifact + feedback form, auto-shared
      │                     ⛔ GATE 3 — reviewers respond
      ▼
  ④ /sync-prd             → spec.v2 + CHANGELOG + diff + Jira update
      │
      └───► loops back to ③ while feedback keeps arriving
```

Each stage is a skill in `.claude/skills/`, written as an explicit step-by-step
process with a quality checklist. State lives in `pipeline/<slug>/state.json`.

### Gates are the point

A gate is a **full stop**. The agent is instructed never to advance because
output "looks approved", never to read silence as approval, and never to
fabricate a stakeholder response. Approval must be **evidenced** — an email
reply, an artifact comment, a Jira comment — and recorded with a timestamp and a
verbatim quote.

That's the difference between a process tool and a document generator.

---

## What's in here

```
CLAUDE.md                        operating manual + state machine + honesty rules
context/
  product-wiki.md                the product: domain model, constraints C1–C7,
                                 change-cost tiers used for every estimate
  prioritisation-rubric.md       option tiers, 1–5 anchors, formula, tie-breaks
  stakeholders.md                who approves what, sending rules
.claude/skills/
  scope-problem/                 PS5
  write-spec/                    PRD → Jira → approval request
  build-prototype/               PS6
  sync-prd/                      PS7
templates/prd-template.md
tools/jira.mjs                   Jira Cloud adapter (live + dry-run)
pipeline/why-recommended/        a real worked example, start to finish
```

---

## The worked example

**"Candidates can't tell why a job is recommended."**

Run through `/scope-problem`, it produced
[`pipeline/why-recommended/01-scoping.md`](pipeline/why-recommended/01-scoping.md).
Two things in it are worth reading, because they're where the design earns its
keep:

**1. It rejected its own top-scoring option — and had to justify it.**
Option C (rename the sort, add a tooltip) scored **30.0**. Option D (show match
reasons on the card) scored **7.5**. The rubric picked C; the agent chose D.

The override is only permitted if it records *which criterion the score failed
to capture*, and it did: the rubric measures friction severity, not whether an
explanation is **verifiable per item**. C explains the system identically for
every job and never answers "why **this** job". A cheap symptom-fix will always
out-score a correct fix when Effort sits in the denominator — that's the known
weakness of any scoring model, and the override clause exists for exactly it.

**2. It measured instead of guessing — and changed its own design.**
An open question ("what if a job matches on freshness only?") was answerable, so
it was measured against the 32 seeded jobs rather than argued about
([evidence](pipeline/why-recommended/evidence/)):

| Signal | Fires |
| --- | :---: |
| freshness | **100%** |
| roleType | **91%** |
| salary | 75% |
| location | 53% |
| role title | 50% |
| remote | 34% |

Freshness-only turned out to be 1 job in 32 — a non-issue. But the data surfaced
something the spec had wrong: **a signal that fires for every job explains
nothing.** Ordering chips by score weight — the obvious implementation — would
have shown the *least* informative signals first on most cards.

So the solution changed: rank chips by **information value, not weight**. Caught
at scoping, before a line of design existed.

---

## Setup

```bash
# Jira (optional — without it the adapter runs in dry-run)
cp .env.example .env      # fill in JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
node tools/jira.mjs verify
```

Then open the repo in Claude Code and run `/scope-problem` with a problem.

`verify` prints whether you're in **LIVE** or **DRY-RUN** mode and, in live mode,
confirms the project and lists valid issue types.

---

## Assumptions and shortcuts

Taken knowingly, given the time constraint:

- **One approver per gate.** `stakeholders.md` lists a single Head of Product.
  Real teams need design/eng/QA reviewers with required-vs-optional distinctions.
  The routing logic doesn't change — only the rows in that table.
- **Both demo email addresses belong to the project author.** The Head of
  Product is a stand-in so the flow could be demonstrated end to end without
  mailing a real person.
- **Feedback is pulled, not pushed.** The agent reads responses when run; it
  isn't a daemon watching an inbox. Escalation ("chase after 2 days") is written
  into the process but fires when the agent next runs, not on a timer.
- **Jira dry-run is a first-class mode.** With no credentials the adapter writes
  the exact payload it *would* have sent. The agent is explicitly instructed to
  say so rather than imply a real issue exists.
- **Markdown → ADF conversion is partial.** Jira Cloud v3 needs Atlassian
  Document Format; the converter handles headings, bullets and paragraphs. Tables
  degrade to paragraphs — lossy, but it never breaks the call.
- **The product wiki is maintained by hand.** If it drifts from the repos, every
  downstream estimate quietly degrades. Generating it from the schema and route
  files is the obvious fix and isn't done.
- **No developer-side ticket generation.** PS9/PS10 were deliberately not
  attempted — the brief asks for depth over quantity.

---

## What I'd improve with more time

The weakest link is that `context/product-wiki.md` is hand-maintained: the
agent's entire credibility rests on that file being accurate, and nothing
currently enforces it. I'd generate the domain model and API surface sections
directly from `schema.prisma` and the Nest route decorators in CI, so the wiki
fails the build when it drifts rather than silently producing confident, wrong
estimates. After that, I'd close the feedback loop properly — right now the
agent pulls responses when invoked, so a webhook from Jira and artifact comments
would let a reviewer's "request changes" trigger the spec sync automatically
instead of waiting for someone to run it. Third, I'd calibrate the rubric
against real decisions: the anchors are reasoned but unvalidated, and the honest
test is to score ten past decisions and check whether the model would have picked
what the team actually picked — the override in the worked example suggests the
Effort denominator may be over-weighted, and one data point isn't enough to
know.

---

## Repos

| Repo | What |
| --- | --- |
| [beep-pm-agent](https://github.com/mohitgautam1802/beep-pm-agent) | This — the PM agent (PS 5, 6, 7) |
| [wellfound-clone-api](https://github.com/mohitgautam1802/wellfound-clone-api) | The product it reasons about — backend |
| [wellfound-clone-web](https://github.com/mohitgautam1802/wellfound-clone-web) | The product it reasons about — frontend |
