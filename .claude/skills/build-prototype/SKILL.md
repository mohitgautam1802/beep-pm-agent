---
name: build-prototype
description: Turn an approved spec into a clickable prototype published as a shareable artifact, auto-share it with reviewers, and collect structured feedback. Use once the Head of Product has approved the spec at Gate 3, or when an existing prototype needs a new version. Handles both first creation and updates. Solves Problem Statement 6.
---

# Build, share and collect feedback on a prototype

Creates a clickable prototype from an approved spec, publishes it at a real URL,
sends it to reviewers automatically, and gathers responses in one place.

The point of this skill is that **sharing is not a separate thing someone has to
remember**. Publishing and notifying happen in the same run, every time,
including on updates.

## Preconditions

- `state.json` shows the spec **approved by the Head of Product at Gate 3**,
  with the approval recorded
- `02-spec.v<n>.md` exists

A spec the PM has reviewed (Gate 2) but the Head of Product has not yet approved
is **not** ready to prototype. If Gate 3 is still open, stop and say so.

For an update, `state.json.artifactUrl` already exists — you will republish to
the same path so the URL stays stable.

---

## Step 1 — Decide what the prototype must show

Re-read the approved spec's user flows and edge cases.

A prototype here is **a clickable HTML page that demonstrates the flow**, not a
polished product and not a picture of one. It must show:

- the primary flow end to end
- the empty state and at least one unhappy path
- realistic data — reuse the seed personas from `product-wiki.md` §8, not
  `Lorem ipsum` or `User 1`

State up front, in the page itself, that it is a prototype with mock data. A
reviewer who mistakes a prototype for a build gives you the wrong feedback.

## Step 2 — Build it

Write to `pipeline/<slug>/prototype/index.html`.

**Use the same visual language as the real product** so reviewers judge the idea
rather than the styling: white cards, hairline borders, near-white page, black
type, blue accent for interactive elements. Match `wellfound-clone-web` — the
prototype should look like it belongs.

Load the `artifact-design` skill before writing the page.

Include, in the page:
- a header naming the idea, the spec version and the prototype version
- the flow itself, clickable
- a short "what changed in this version" note for v2 and later
- the **feedback form** (Step 3)

## Step 3 — Attach the feedback form

Feedback must be structured and it must come back somewhere readable — not
scattered across replies and DMs.

Load the `artifact-capabilities` skill and declare persistence, so responses are
stored with the artifact rather than lost on refresh.

The form asks for:
- **Verdict** — Approve / Request changes / Reject (required)
- **What specifically** — free text
- **Which part** — which flow step or screen the comment is about
- **Reviewer name**

Show submitted responses on the page so reviewers can see each other's — it
prevents four people filing the same note.

If persistence is unavailable, fall back to a `mailto:` submit that pre-fills a
structured body, and **say in the page that responses come back by email**.
Never imply responses are being stored when they are not.

## Step 4 — Publish

Publish with the `Artifact` tool.

- First version: new file path, gets a fresh URL. Record it as
  `state.json.artifactUrl`.
- Later versions: **same file path**, so it redeploys to the same URL. The link
  in earlier emails keeps working, which is the whole point of stable URLs.

Record `prototypeVersion` in `state.json`, and write
`04-prototype.v<n>.md` with: the URL, version, what it demonstrates, what
changed since the previous version, and known gaps.

## Step 5 — Auto-share

This step is not optional and does not wait to be asked. Publishing without
notifying is the manual step this skill exists to remove.

Read reviewers from `context/stakeholders.md` (Gate 4).

If this is the **first send of the session**, confirm with the operator. Then
send:

- **Subject:** `[Beep PM] Prototype review — <title> (v<n>)`
- **Body:**
  1. One line on what to look at
  2. The prototype URL
  3. For v2+: what changed since the last version, in two or three bullets
  4. The specific question you want answered — "does this flow make sense?"
     beats "any thoughts?"
  5. How to respond: the form on the page, or a reply

Update `state.json`: `stage: "AWAITING_PROTOTYPE_FEEDBACK"`, and set the gate
fields.

### ⛔ GATE 4

Print the URL, who it went to, and what you're waiting for. Then **stop**.

## Step 6 — Collect feedback (when it arrives)

Read responses from the artifact's stored data and its comment threads. Also
check email replies.

Write everything to `03-feedback.v<n>.md`, one entry per reviewer:
- reviewer, verdict, timestamp
- their comment **verbatim** — do not paraphrase; paraphrasing is where
  intent gets quietly lost
- which flow step it refers to
- your read on whether it is in scope for this spec or a new problem

Then summarise: how many approved, what must change, what is deferred, and
whether anything contradicts something else. **Contradictory feedback is a
decision for a human, not something for you to resolve silently.** Surface it.

Update `state.json` and tell the operator to run `/sync-prd` to fold the
feedback into the spec.

---

## Quality bar

- [ ] Page states plainly that it is a prototype with mock data
- [ ] Realistic data from the seed personas, not placeholders
- [ ] Empty state and one unhappy path are both shown
- [ ] Feedback form captures a verdict, not just free text
- [ ] v2+ says what changed, in the page and in the email
- [ ] Same file path reused on update, so the URL is stable
- [ ] Reviewers were actually emailed — not just "should be emailed"
