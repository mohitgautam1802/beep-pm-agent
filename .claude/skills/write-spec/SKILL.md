---
name: write-spec
description: Turn a confirmed scoping decision into a full PRD, create the Jira issue, and send it to the Head of Product for approval. Use after /scope-problem has been confirmed at Gate 1, or when an already-decided solution needs a spec written and routed for sign-off. Stops at the approval gate.
---

# Write the spec and send it for approval

Turns a confirmed solution into a PRD, files it in Jira, and requests sign-off.
Then stops.

## Input

The PM gives you **the solution they have decided to build**. It arrives one of
two ways, and both are equally valid:

1. **From a brainstorm** — `pipeline/<slug>/01-solutions.md` exists, with the
   decision captured at the end of `/brainstorm-solutions`.
2. **Directly from the PM** — they describe or paste the approved solution in
   the conversation. No brainstorm needed; sometimes the decision was already
   made elsewhere.

In case 2, create `pipeline/<slug>/` and write their description to
`01-solutions.md` under a "Decision" heading first, so the spec still has a
recorded source. Capture their words, not your paraphrase.

**Do not re-litigate the decision.** The PM has chosen. If you think the
solution is unclear or has a gap, ask a specific question before writing —
but do not quietly substitute a different solution, and do not re-open options
that were already ruled out.

If the solution is too vague to spec — "improve recommendations" — say so and
ask what specifically is being built. A spec written on a vague input just moves
the ambiguity downstream.

---

## Step 1 — Write the PRD

Use `templates/prd-template.md`. Fill every section. Write `None` where a
section genuinely doesn't apply — never delete a heading, because a reviewer
scanning for "Edge cases" needs to find it, even empty.

Save as `02-spec.v<n>.md` (v1 first time).

Carry forward from `01-solutions.md` rather than re-deriving:
- the problem statement and evidence
- the chosen solution and its scope boundaries
- the alternatives considered — reviewers ask "why not X?" and the answer should
  already be in the document. If the decision came straight from the PM with no
  alternatives discussed, write "Not formally compared — decision made by the
  PM" rather than inventing a comparison that never happened.

Add what scoping didn't cover:
- **User flows** — step by step, including the unhappy paths
- **Edge cases** — empty states, first run, permission failures, stale data
- **Success metrics** — how we'll know afterwards, with the current baseline if
  we have one and `[unknown — needs baseline]` if we don't
- **Rollout** — flagged? staged? reversible? (cite the Risk score from scoping)

Anchor every technical claim to `context/product-wiki.md`. If the spec says
something is cheap, the reader should be able to check why.

## Step 2 — Create the Jira issue

```bash
node tools/jira.mjs create --slug <slug> --spec 02-spec.v1.md
```

The adapter creates a Story with the spec summary in the description and a link
back to the spec file.

Record the returned key in `state.json` as `jiraKey`.

**If the adapter runs in dry-run** (no credentials), it writes the payload to
`pipeline/<slug>/jira/` instead. That is fine — but say so explicitly in your
output. Never phrase a dry-run as though a real issue was created.

## Step 3 — Send it for approval

Read `context/stakeholders.md` for the Gate 2 approver.

If this is the **first send of the session**, confirm with the operator before
sending. After that, send without re-asking.

Compose with the Gmail tools:

- **Subject:** `[Beep PM] Spec review — <title> (v<n>)`
- **Body** — short enough to read on a phone:
  1. One line: what this is and why it exists
  2. The recommendation in 2–3 sentences
  3. Jira link and issue key
  4. The single biggest open question
  5. **Exactly what response is wanted:** reply `APPROVE`, `CHANGES` (with
     notes), or `REJECT` (with reason)

Do not paste the whole PRD into the email. Link it. A wall of text gets deferred,
and a deferred review is a stalled gate.

## Step 4 — Record and stop

Update `state.json`:
- `stage: "AWAITING_SPEC_APPROVAL"`
- `gate.waitingOn`, `gate.since`, `gate.expects`
- append to `history`: spec version, Jira key, who it went to, when

### ⛔ GATE 2

Print: what was created, where it went, who owes a response, and what response
is expected.

Then **stop**.

Do not run `/build-prototype`. Do not draft the prototype "to save time" — a
prototype built against an unapproved spec is exactly the rework this pipeline
exists to prevent.

---

## When approval arrives

The operator will paste the reply, or you'll read it from the inbox or a Jira
comment.

**APPROVE** → record in `state.json.approvals` with timestamp and a direct
quote. Set `stage: "PROTOTYPING"`. Tell the operator they can run
`/build-prototype`.

**CHANGES** → write the notes to `03-feedback.v<n>.md`, produce `02-spec.v<n+1>.md`
applying them, append to `CHANGELOG.md`, update the Jira description, and send
again. The gate stays open.

**REJECT** → record it, set `stage: "EXPLORING"`, and say plainly that this goes
back to `/brainstorm-solutions`. Do not try to rescue a rejected spec by editing
it — a rejection is about the solution, not the wording.

Never record an approval you did not actually receive. If asked to "just assume
it's approved", say no and explain that the approval log is the audit trail —
faking one entry makes every other entry worthless.
