# Beep PM Agent

**Hiring assignment — Associate Product Manager, Beep**
Solves **Problem Statements 5, 6 and 7** as one connected pipeline.

An agent that takes a raw problem, thinks through solutions *with* you, writes
the PRD, files it in Jira, builds a clickable prototype, auto-shares it for
review, and keeps the PRD in sync as feedback arrives — stopping at every point
where a human has to decide.

| PS | Ask | Built as |
| --- | --- | --- |
| **5** | Problem space → exact solution | `/brainstorm-solutions` |
| **6** | Solution → prototype, auto-shared, with feedback | `/build-prototype` |
| **7** | Changed prototype → updated PRD with a diff | `/sync-prd` |

`/write-spec` sits between 5 and 6 — it turns the decision into a PRD, files the
Jira issue, and routes it for approval.

---

## Why it runs on a real codebase

Most PRD generators produce plausible documents about nothing. This one reasons
about a **working product**: a Wellfound candidate-portal clone
([API](https://github.com/mohitgautam1802/wellfound-clone-api),
[web](https://github.com/mohitgautam1802/wellfound-clone-web)) with 32 seeded
jobs, a real Prisma schema and real architectural constraints, built as the
substrate for this agent to think about.

That's what `context/product-wiki.md` encodes. It's why the agent says
*"about a day — the score already exists in `scoreJob()` and `decorate()` is
already where per-user fields get attached (C4), so no schema change"* rather
than *"this is a medium-sized effort."*

**An estimate you can check beats an estimate that sounds confident.**

It also means the agent can *test its own assumptions* — see below.

---

## The design bet

A PM tool can fail in two directions. It can be so rigid it produces
box-ticking, or so loose it just agrees with you.

This one is built as a **thinking partner that argues back**, with three things
keeping it honest:

1. **It's grounded.** Every effort claim cites a named constraint in the product
   wiki. Vague estimates are the thing `solution-heuristics.md` §2 exists to kill.
2. **It measures instead of speculating.** When a question is answerable in a
   five-minute query against real data, the agent is instructed to answer it
   rather than debate it — and it did exactly that on the worked example, which
   changed the design.
3. **It never decides.** It proposes, argues, recommends — then hands the call to
   the PM and records what they chose.

---

## How a person uses it

Open the repo in Claude Code and type slash commands. There's no UI to host —
the repo *is* the tool, which is deliberate: a PM tool nobody installs is a PM
tool nobody uses.

```
> /brainstorm-solutions "Candidates can't tell why a job is recommended"
    → 2-3 real options, with impact / effort / risk and what each doesn't solve
    → then it argues with you until you decide
    ⛔ GATE 1 — the PM chooses what to build

> /write-spec
    → PRD drafted. Nothing filed, nothing sent.
    ⛔ GATE 2 — the PM reads the draft
    → then, and only then: Jira issue created + approval email sent
    ⛔ GATE 3 — Head of Product approves

> /build-prototype
    → prototype published at a real URL, auto-shared with a feedback form
    ⛔ GATE 4 — reviewers respond

> /sync-prd
    → spec v2 + changelog + diff, pushed back to Jira
```

Stage 1 is a **conversation**, not a report — expect several rounds. The rest
are transactional: one invocation, one artifact, one gate.

**Nothing leaves the building before Gate 2.** Draft → review → file → send, so
a wording fix costs a re-read rather than an edit to a live ticket plus a second
email to a stakeholder who already read the first one. Spec version numbers only
start advancing after publication; every round of PM review before Gate 2 is
still v1.

`/write-spec` also accepts a solution you hand it directly, with no brainstorm,
for when the decision was already made elsewhere.

### Gates are the design

A gate is a **full stop**. The agent is instructed never to advance because
output "looks approved", never to read silence as consent, and never to
fabricate a stakeholder response. Approval must point to real evidence — an
email reply, an artifact comment — recorded with a timestamp and a verbatim
quote.

That's the difference between a process tool and a document generator.

---

## The worked example

**"Candidates can't tell why a job is recommended"** — run end to end in
[`pipeline/why-recommended/`](pipeline/why-recommended/).

Three options were put up: rename the sort and add a tooltip (near-free), show
match-reason chips per job (~1 day), or build a full explainability surface with
weight tuning (a week-plus, schema change, no supporting evidence).

**Then the brainstorm did its job.** A fair objection came back: *every job has
some freshness score — won't most cards just say "Posted recently" and look
useless?*

That was answerable rather than arguable, so the agent
[measured it](pipeline/why-recommended/evidence/) across the 32 seeded jobs:

| Signal | Fires | Discriminating? |
| --- | :---: | :---: |
| freshness | **100%** | No |
| roleType | **91%** | Barely |
| salary | 75% | Weakly |
| location | 53% | **Yes** |
| role title | 50% | **Yes** |
| remote | 34% | **Yes** |

The objection turned out to be mostly wrong — freshness-*only* is 1 job in 32.
**But it exposed a real flaw.** A signal that fires on every job explains
nothing, and ordering chips by score weight — the obvious implementation — would
have surfaced the *least* informative signals first on most cards.

So the design changed: split signals into **discriminating** and **ambient**,
show discriminating first, fall back to ambient only when nothing better fired.
The 3-chip cap also became evidence-led — 13 of 32 jobs fire five or six signals.

**Five minutes of querying changed the shape of the solution before any design
existed.** Left to a prototype round, it would have cost a week.

---

## What's in here

```
CLAUDE.md                        operating manual, state machine, honesty rules
context/
  product-wiki.md                the product: domain model, constraints C1–C7,
                                 change-cost tiers behind every estimate
  solution-heuristics.md         what separates a real solution from a
                                 plausible-sounding one
  stakeholders.md                who approves what, sending rules
.claude/skills/
  brainstorm-solutions/          PS5
  write-spec/                    PRD → Jira → approval request
  build-prototype/               PS6
  sync-prd/                      PS7
templates/prd-template.md
tools/jira.mjs                   Jira Cloud adapter (live + dry-run)
pipeline/why-recommended/        the worked example, start to finish
```

---

## Setup

```bash
cp .env.example .env      # fill in JIRA_* values
node tools/jira.mjs verify
```

`verify` prints whether you're in **LIVE** or **DRY-RUN** mode and, when live,
confirms the project and lists valid issue types. `projects` lists the projects
your account can see, for finding the right key.

Without credentials the adapter runs **dry-run**: it writes the exact REST
payload it *would* have sent to `pipeline/<slug>/jira/`. The agent is explicitly
instructed to say so rather than imply a real issue exists.

---

## Assumptions and shortcuts

Taken knowingly, given the time constraint:

- **One approver per gate.** `stakeholders.md` lists a single Head of Product.
  Real teams need design/eng/QA reviewers with required-vs-optional
  distinctions. The routing logic doesn't change — only the rows in that table.
- **Both demo email addresses belong to the project author.** The Head of
  Product is a stand-in so the flow could be demonstrated without mailing a real
  person. Note this also means the demo reviewer can't open the Jira link — a
  real stakeholder would need a seat.
- **Feedback is pulled, not pushed.** The agent reads responses when run; it
  isn't a daemon watching an inbox. Escalation is written into the process but
  fires when the agent next runs, not on a timer.
- **Markdown → ADF conversion is partial.** Jira Cloud v3 needs Atlassian
  Document Format; the converter handles headings, bullets and paragraphs.
  Tables degrade to paragraphs — lossy, but it never breaks the call.
- **The product wiki is maintained by hand.** If it drifts from the repos, every
  downstream estimate quietly degrades.
- **No developer-side ticket generation.** PS9/PS10 deliberately not attempted —
  the brief asks for depth over quantity.

---

## What I'd improve with more time

The weakest link is that `context/product-wiki.md` is hand-maintained: the
agent's entire credibility rests on that file being accurate, and nothing
enforces it. I'd generate the domain-model and API sections directly from
`schema.prisma` and the Nest route decorators in CI, so the wiki fails the build
when it drifts rather than silently producing confident, wrong estimates.

Second, I'd close the feedback loop — the agent currently *pulls* responses when
invoked, so a Jira webhook and artifact-comment subscription would let a
reviewer's "request changes" trigger the spec sync automatically instead of
waiting for someone to run it.

Third, and least comfortably: the agent is only as good as its judgement, and
judgement is exactly what's hardest to verify in a one-day build. The honest
test is running it on ten real problems and checking whether a PM found the
proposals genuinely useful or just plausible. I have one worked example. It
happened to catch something real — the signal-distribution finding — but one
data point isn't evidence that it reliably will.

---

## Repos

| Repo | What |
| --- | --- |
| [beep-pm-agent](https://github.com/mohitgautam1802/beep-pm-agent) | This — the PM agent (PS 5, 6, 7) |
| [wellfound-clone-api](https://github.com/mohitgautam1802/wellfound-clone-api) | The product it reasons about — backend |
| [wellfound-clone-web](https://github.com/mohitgautam1802/wellfound-clone-web) | The product it reasons about — frontend |
