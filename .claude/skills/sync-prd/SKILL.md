---
name: sync-prd
description: Update the PRD to match a changed prototype, producing an explicit changelog and diff rather than silently overwriting, then push the update to Jira. Use after prototype feedback arrives, or whenever a prototype changes and the spec needs to catch up. Keeps spec and prototype from drifting apart. Solves Problem Statement 7.
---

# Sync the PRD to the prototype

Prototypes change faster than specs. Left alone, the two drift until nobody
trusts the PRD and everyone reads the prototype instead — at which point the
edge cases and non-goals, which a prototype cannot express, are simply lost.

This skill closes that gap. Every sync produces a **new version plus a visible
diff**. Never a silent overwrite.

## Preconditions

- A prototype exists with `state.json.artifactUrl` and `prototypeVersion` set
- Either `03-feedback.v<n>.md` exists, or the operator states what changed

---

## Step 1 — Establish what actually changed

Build a concrete change list before touching the spec. Sources, in priority
order:

1. **Jira ticket comments** — the primary review channel. Read them with
   `node tools/jira.mjs comments --slug <slug>`. `NO_COMMENTS` means there is
   nothing to fold in from this source; proceed rather than waiting.
2. **Feedback** in `03-feedback.v<n>.md` — verdicts and requested changes
3. **The prototype itself** — compare `04-prototype.v<n>.md` against `v<n-1>`
4. **The PM**, if they described a change directly

For each change, capture: what changed, why, who asked, and which spec sections
it touches.

If a piece of feedback does **not** require a spec change, still list it and say
so. "Considered and deliberately not changed" is information a reviewer needs;
silence looks like an oversight.

If two pieces of feedback contradict, **stop and ask**. Do not average them, and
do not quietly pick the one you prefer.

## Step 2 — Write the new spec version

Copy `02-spec.v<n>.md` → `02-spec.v<n+1>.md` and apply the changes.

Rules:
- **Never edit an existing version in place.** Old versions are the audit trail.
- Keep section order and headings identical, so a reader can diff by eye.
- Update "Open questions" — resolved ones move out with their answer, new ones
  move in.
- If a change alters scope, update **both** the scope and the non-goals. Scope
  creep usually enters through a non-goal nobody updated.
- If a change contradicts something in `context/product-wiki.md`, flag it. It
  means either the estimate was wrong or the wiki is stale — both matter.

## Step 3 — Write the changelog entry

Append to `CHANGELOG.md`. Never rewrite earlier entries.

```markdown
## Spec v2 — 2026-09-04
Prototype: v2 · https://... · Jira: BEEP-12

### Changed
- **Match reasons capped at 3** (§Scope) — reviewers found 6 chips noisy.
  Requested by Head of Product, prototype v2 feedback.

### Added
- **Empty state for zero match reasons** (§Edge cases) — surfaced by the
  prototype; the original spec never considered a job matching on freshness alone.

### Removed
- **Weight-tuning controls** (§Out of scope) — deferred; not needed to answer
  "why am I seeing this?"

### Considered, not changed
- Colour-coding chips by signal type — deferred to a later version, adds
  legend complexity for marginal gain.

### Unresolved
- Whether match reasons appear on the job detail page as well as the card.
```

Every entry needs **what changed, which section, and who asked**. An entry
without attribution is not traceable, which defeats the purpose.

## Step 4 — Produce the diff

Generate a readable diff between versions:

```bash
git diff --no-index pipeline/<slug>/02-spec.v1.md pipeline/<slug>/02-spec.v2.md
```

Save to `pipeline/<slug>/diffs/spec-v1-to-v2.diff`.

The changelog is the human summary; the diff is the exact record. Ship both —
the assignment's bar is that a reviewer can see what changed **in under a
minute**, and a raw diff alone does not clear that.

## Step 5 — Update Jira

```bash
node tools/jira.mjs update --slug <slug> --spec 02-spec.v2.md
node tools/jira.mjs comment --slug <slug> --changelog
```

- `update` replaces the issue description with the new spec summary and updates
  the prototype link
- `comment` posts the changelog entry as a comment, so the Jira history shows
  the evolution rather than just a mutated description

The prototype URL must appear on the Jira issue. Anyone opening the ticket
should reach the current prototype without hunting through email.

If the adapter is in **dry-run**, say so explicitly. Do not imply Jira was
updated when a payload was written to disk.

## Step 6 — Re-share and record

Update `state.json`: `specVersion`, `history`, and clear the gate that this
sync resolved.

If the spec changed materially — scope, flows or non-goals — send it back to the
Head of Product for re-approval (Gate 3). Cosmetic or clarifying edits do not
need a new gate; **when in doubt, re-share**. An unnecessary email costs a
reviewer ten seconds. A silent scope change costs a sprint.

Show the PM the new version before it goes out, the same way `/write-spec` does
at Gate 2. The rule holds throughout: **the PM sees it before the stakeholder
does.**

Then tell the operator what changed, what's still open, and whether another
prototype iteration is needed.

---

## Quality bar

- [ ] A new version file was created; no earlier version was edited
- [ ] Changelog entry has what / which section / who asked, per change
- [ ] Feedback that was *not* acted on is listed with a reason
- [ ] A diff file exists alongside the changelog
- [ ] Jira description updated **and** changelog posted as a comment
- [ ] Prototype URL is on the Jira issue
- [ ] Contradictions were escalated, not silently resolved
