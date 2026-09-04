# Raw problem

> **Captured verbatim. Do not edit.**
> The original phrasing is evidence — it shows how the problem is actually
> experienced, and later stages are checked back against it.

**Raised by:** Mohit Gautam (Associate PM), speaking first-hand as a candidate
**Date:** 2026-09-04
**Channel:** In session, during `/brainstorm-solutions`

---

> "currenly as a user i will have to scroll dozens of job opneing from the company and I prefer to apply them in all, platform do have my resume, but I am not able to get good response positive, as mostly are not relevant to me based on my expereince in resume hence do not get a revert or get rejected, not knowing any which are relevant makes me apply to of them which takes a lot of time and cstom message needs to be crafted"

---

## Intake notes

Kept separate from the statement itself.

- This is the **first first-hand candidate account** in the pipeline. The
  `why-recommended` problem came from the team reading the code; this came from
  someone using the product. That is better evidence — but it is still **n = 1**,
  and that one person is the agent's operator. Not user research.
- The statement contains **three distinct problems** (see `01-solutions.md`
  §"Scoping the statement"): no fit signal, high cost per application, and no
  positive response. They are related but do not share a solution.
- **One premise in the statement is false against this product.** "platform do
  have my resume" — it does not. `Profile.resumeFileName` stores a *file name
  only* (wiki §1), and there is no object storage (C5). Nothing in the product
  can read résumé content. This is recorded here because it shapes what is
  buildable, not to correct the reporter: the candidate's belief that the
  platform is using their résumé is itself a finding.

---

## Addendum — 2026-09-04, correction from the PM

The intake note above called "platform do have my resume" a false premise. **The
PM has corrected this:** the companion repo is a clone, and résumé storage was
left out of it for that reason. In the real product résumé content *is*
readable, and options may assume it.

The correction is recorded rather than folded into the note above, so the
reasoning that ran on the earlier assumption stays auditable.

Two consequences, both carried into `01-solutions.md`:

1. **The wiki is now known-stale on this point.** §1 ("résumés are stored as a
   file name only") and C5 ("no object storage") are true of the clone and false
   of the real product. `CLAUDE.md` warns that wiki drift silently degrades every
   downstream estimate — so any résumé-dependent effort claim below is explicitly
   marked as *unanchored*, because the wiki can no longer support it.
2. **It matters less than it appears.** The structured equivalent of a résumé —
   `WorkExperience`, `Education`, `ProfileSkill` (with per-skill years),
   `Profile.yearsOfExperience`, `headline`, `bio`, `achievements` — is already in
   the schema, already readable, and already *extracted*. The scorer ignores all
   of it. Résumé text is not the missing input; using the candidate's history at
   all is.
