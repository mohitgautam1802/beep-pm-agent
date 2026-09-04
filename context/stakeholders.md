# Stakeholders

Who gets sent what, and who can approve. Skills read this file rather than
hard-coding addresses, so changing a reviewer is a one-line edit here.

---

## People

| Role | Name | Email | Approves | Notified about |
| --- | --- | --- | --- | --- |
| Head of Product | Head of Product | mohitkrishan025@gmail.com | Published specs (Gate 3), prototypes (Gate 4) | Everything |
| Associate PM (agent operator) | Mohit Gautam | mohit01krishan@gmail.com | Solution choice (Gate 1), spec drafts (Gate 2) | Everything |

> **Demo note.** Both addresses belong to the project author. In a real
> deployment this table would list design, engineering and QA reviewers
> separately. The routing logic does not change — only the rows.

---

## Approval matrix

| Gate | Artifact | Who must respond | Accepted responses |
| --- | --- | --- | --- |
| 1 | Solution decision | Associate PM (in session) | pick a solution / keep discussing |
| 2 | Spec draft | Associate PM (in session) | approve / changes / wrong solution |
| 3 | Spec, once published | Head of Product | approve / request changes / reject |
| 4 | Prototype | Head of Product | approve / request changes / reject |

**Gates 1 and 2 are internal** — the PM answers them in session, and nothing
leaves the building. Gates 3 and 4 are external: a real ticket exists and a real
person has been emailed.

**One approver is enough at each gate for this project.** With more reviewers,
the rule would be: all *required* approvers must approve; *optional* reviewers
are notified but do not block.

---

## Sending rules

- **Confirm with the user before the first send of a session.** After that, send
  as the skills direct without re-asking.
- Every email must contain: what the artifact is, the direct link, exactly what
  response is wanted, and how to give it.
- Subject line format: `[Beep PM] <Gate> — <idea title> (v<n>)`
  e.g. `[Beep PM] Spec review — Why-recommended explanations (v1)`
- Always send plain, skimmable text. Assume it's read on a phone.
- Never send to an address that is not in the table above.

## Escalation

If a gate has been waiting more than **2 working days**, send one reminder that
quotes the original ask and the link. Send at most one reminder — after that,
surface the stall to the operator rather than continuing to chase.
