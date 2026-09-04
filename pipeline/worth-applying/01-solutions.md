# Solutions — worth-applying

**Problem:** `00-problem.md`
**Decided by:** Mohit Gautam (Associate PM), in session, 2026-09-04
**Stage:** Gate 1 passed — solution chosen, nothing filed, nothing sent

---

## The decision

**Build a per-job fit verdict that is allowed to be negative**, driven by two
signals the product already stores and the ranker currently ignores.

### Signals

| Signal | Candidate side | Job side | Relation tables — no C2 cost |
| --- | --- | --- | :---: |
| Experience band | `Profile.yearsOfExperience` | `Job.experienceMin` / `experienceMax` | yes |
| Skill overlap | `ProfileSkill` | `JobSkill` | yes |

`Job.requirements` is a JSON string and is **deliberately not used** — matching
on it would mean making a JSON column filterable, which is the expensive tier
(C2). Résumé content is **out of scope for v1** (see "What changed", point 3).

### Derived values

```
expBand      = IN_BAND   if jobMin <= years <= jobMax
             = STRETCH   if years <  jobMin and (jobMin - years) <= 1
             = BELOW     if years <  jobMin and (jobMin - years) >  1
             = IN_BAND   if years >  jobMax          <- v1 rule, see open questions

skillOverlap = |ProfileSkill intersect JobSkill| / |JobSkill|
```

### Verdict rule

| | overlap >= 0.5 | 0.25 <= overlap < 0.5 | overlap < 0.25 |
| --- | --- | --- | --- |
| **IN_BAND** | `STRONG` | `STRETCH` | `UNDER_QUALIFIED` |
| **STRETCH** | `STRETCH` | `STRETCH` | `UNDER_QUALIFIED` |
| **BELOW** | `UNDER_QUALIFIED` | `UNDER_QUALIFIED` | `UNDER_QUALIFIED` |

### Scoring change — the first negative term

Wiki §4 describes `scoreJob()` as **additive**. That is precisely why the list
cannot say no: with only positive terms every job accumulates something, and the
measured result is **0 / 32 jobs with zero signals**. Making the verdict
meaningful requires a term that subtracts.

Proposed starting weights — **unvalidated, to be tuned in the spec once the
distribution is measured**:

| Condition | Points |
| --- | --- |
| `expBand = IN_BAND` | **+20** |
| `expBand = STRETCH` | **+5** |
| `expBand = BELOW` | **-25** |
| `skillOverlap >= 0.5` | **+20** |
| `0.25 <= skillOverlap < 0.5` | **+10** |
| `skillOverlap < 0.25` | **-10** |

These sit against an existing title match worth **+40** (§4). Engineering should
expect the relative balance to need adjustment — a job with a matching title but
no skill overlap and a below-band requirement currently nets +40, and would net
+5 under these weights. That is the intended behaviour change.

### API contract

`decorate()` in `jobs.service.ts` attaches a `fit` object per job:

```jsonc
"fit": {
  "verdict": "STRONG | STRETCH | UNDER_QUALIFIED",
  "reasons": ["5 yrs experience vs 6-10 required", "4 of 7 skills matched"],
  "experience": { "candidateYears": 5, "jobMin": 6, "jobMax": 10, "band": "STRETCH" },
  "skills": { "matched": ["SQL", "Figma"], "missing": ["Amplitude"], "overlap": 0.57 }
}
```

`src/lib/types.ts` is a **hand-written** mirror of API responses (§6) — it must
be updated by hand in the same change.

### UI

- Rendered in `src/components/jobs/job-card.tsx` as a single verdict badge with
  its reason line.
- **Never hides a job.** Labels only. An `UNDER_QUALIFIED` job stays in the list,
  stays applicable, and is not filtered out.
- Shown on **all sorts**, not only `sort=recommended` — the verdict describes the
  candidate/job pair, not the ordering.

### Empty-profile behaviour — required, not optional

If `Profile.yearsOfExperience` is null **or** the candidate has no `ProfileSkill`
rows, the verdict is **suppressed entirely** and the card shows a prompt to
complete the profile instead. Without this rule a new user is told
`UNDER_QUALIFIED` on every job in the product on their first visit.

### Effort

| Half | Tier | Anchor |
| --- | --- | --- |
| Scoring — new signals in `scoreJob()` | **Cheap, under a day** | C4 — ranked in memory, no SQL, no migration |
| Surfacing — `decorate()` + `types.ts` + `job-card.tsx` | **Moderate, 1–3 days** | §7 — "returning new derived data from `decorate()`" |

**~2–3 days total.** No schema change, no backfill, no migration.

---

## Why this one

The root cause is specific and evidenced: `scoreJob()` ranks on **stated
preferences** (desiredRoles, desiredRoleTypes, desiredLocations, openToRemote,
desiredSalaryMin) plus freshness — and touches **no** signal describing what the
candidate has actually done. Both sides of that comparison already exist in the
schema and are already accepted as filters by `GET /jobs` (`skills`,
`experience`, §5). The data is there; the ranking ignores it.

The measured consequence, from the 2026-09-04 run over 32 seeded jobs
(`pipeline/why-recommended/evidence/signal-distribution.txt`): **average 4.0
signals per job, and 0 jobs matching nothing.** Every job looks like a match.
That is the reporter's complaint — *"not knowing any which are relevant"* —
stated as a number.

The decisive property is that this option is allowed to say **no**. Every
cheaper option makes the complaint quieter without making the list honest.

---

## What we considered instead

| Option | Why not |
| --- | --- |
| **Default the filters from the candidate's profile** — prefill `experience` and `skills` on `/jobs`, which needs no API change at all (cheap, under a day) | Makes the complaint go away by showing fewer jobs rather than by judging them. Ship it and the ranking is still unexplainable, just over a smaller set — heuristic §1. Still worth having later as a default-off chip. |
| **Pre-fill the cover letter** from profile/résumé plus the job, attacking cost-per-application | Attacks problem **B**, not **A**. If the list cannot tell you what fits, applying faster means spraying faster — which makes rejection worse, and rejection is what the reporter is actually experiencing. |
| **Backfill the profile from the résumé** — extract into `ProfileSkill`, `WorkExperience`, `yearsOfExperience` | An enabler, not a fix: it improves the inputs to a scorer that still cannot say no. Becomes the lead option only if profiles turn out to be mostly empty — currently `[unknown — needs data]`. Natural follow-on to this work. |
| **Do nothing** | Rejected. This is the first first-hand candidate account in the pipeline, and the root cause is confirmed in code rather than assumed. |

---

## What changed during the discussion

1. **The statement was three problems, not one.** (A) cannot tell what is
   relevant, (B) cost per application — *"takes a lot of time and cstom message
   needs to be crafted"*, (C) *"not able to get good response positive… get
   rejected"*. **C was ruled unfixable by this product**: wiki §7 records that no
   recruiter-side surface exists, so we never learn why a rejection happened.
   Rejection rate therefore **cannot be a success metric** for this work. The PM
   chose to solve A. **B is knowingly left unsolved.**

2. **The root cause was reframed from the symptom.** The reporter experienced it
   as "the résumé is not being used". The actual defect is that the scorer uses
   *stated preferences* and never *demonstrated history* — a different problem
   with a different and much cheaper fix.

3. **The résumé premise was contested, corrected, and then set aside.** The agent
   initially called *"platform do have my resume"* false, citing wiki §1 and C5.
   The PM corrected this: the clone omits résumé storage, but the real product
   can read résumé content. The correction was accepted — and then found not to
   matter for v1, because `WorkExperience`, `Education`, `ProfileSkill` (with
   per-skill years) and `Profile.yearsOfExperience` are a structured résumé that
   is **already extracted and already queryable**. Résumé text adds only the gap
   between profile and document, whose width is `[unknown — needs data]`.
   Keeping v1 on profile data keeps the whole estimate anchored to C4 and §7.

4. **The wiki is now known-stale.** §1 and C5 describe the clone, not the real
   product. `CLAUDE.md` warns that drift silently degrades every downstream
   estimate. Not corrected here — the agent has no access to the real repo to
   verify against, and guessing at ground truth is worse than a flagged gap.

5. **The additive-scoring insight.** Adding fit as positive-only points would
   have preserved the defect. The negative term is the part that makes the
   verdict real, and it is a genuine change to the character of `scoreJob()`.

---

## Open questions

**For engineering**

- **Over-qualified.** v1 treats `years > jobMax` as `IN_BAND`. Over-qualification
  is a real rejection cause, but labelling someone over-qualified is
  discouraging and the product cannot verify it mattered. Confirm or overturn.
- **Weights and thresholds are guesses.** The 0.5 / 0.25 overlap cut-offs and all
  six point values are unvalidated. They should be set against the measured
  distribution, not shipped as written.
- **Skill-data density is unmeasured.** If `JobSkill` rows are sparse across the
  32 seeded jobs, overlap is noise and the skills half of the verdict should be
  dropped or down-weighted. **This is the query the spec should run first.**

**Blocking evidence gap**

The agent **could not run any query this session** — `wellfound-clone-api` is not
checked out under this path (the parent directory holds only `beep-pm-agent` and
`README.md`). Everything numeric above is reused from the 2026-09-04 run, which
measured preference signals only and contains **no** experience or skill data.
Given a checkout path, the distribution script is a short job and should run
before the weights are fixed.

**For design**

- **Card collision.** `why-recommended` (KAN-15, awaiting Head of Product at
  Gate 3) puts match-reason chips on `job-card.tsx`; this puts a verdict badge on
  the same card. Wiki §6 already calls that file "the surface most feature
  requests touch". Two features landing on one card needs a single layout
  decision, not two independent ones.
- **Job detail page.** v1 is card-only. `/jobs/[id]` is where the decision to
  apply is actually made, so the verdict arguably belongs there too — deferred,
  not decided.
- **Tone of `UNDER_QUALIFIED`.** The label must be honest without being
  discouraging, since the job stays applicable. Wording is design's call.
