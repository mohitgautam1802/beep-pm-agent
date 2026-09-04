# Solution heuristics

Not a scoring model. There's no formula here and no numbers to add up — those
produce a false sense of rigour and quietly reward whichever option is cheapest
rather than whichever one works.

This is the set of checks a good PM applies by instinct, written down so the
agent applies them too.

---

## 1. Does it solve the problem, or the symptom?

The single most common failure. A cheap change that makes the complaint go away
without addressing the cause will always *look* attractive — it's cheap, it's
low-risk, and it superficially responds to what was said.

Ask: **if we ship this, is the underlying thing still true?**

> "Candidates can't tell why a job is recommended."
> Renaming the sort to "Best match for you" makes it *sound* explained. Every
> job still gets the identical non-explanation. The candidate still can't tell
> why **this** job is here. The problem survives the fix.

Symptom-level fixes aren't worthless — they're often good *alongside* a real
fix. They're only a failure when they're offered *instead* of one.

## 2. Effort must be anchored, not vibed

Every effort claim cites something in `product-wiki.md` — a constraint (C1–C7)
or a change-cost tier.

- ✅ "About a day. The score already exists in `scoreJob()`, and `decorate()` is
  already where per-user fields get attached — no schema change (C4)."
- ❌ "This is a medium-sized effort."

The first can be checked and argued with. The second can only be believed.

## 3. Reversibility beats correctness

Being wrong is normal. Being wrong *and stuck* is the problem.

Prefer the option you can undo in an afternoon over the one that's 15% better
and needs a migration to unwind. When two options are close, **the more
reversible one wins** — it buys the right to be wrong cheaply.

A change that touches stored data, an existing contract, or something users
already rely on carries a real cost that "effort" alone doesn't capture.

## 4. Confidence should shape ambition

If the evidence is a hunch, the right response is usually a **small** bet, or
going to get evidence first.

Expensive + unevidenced is the worst combination in product work. When you spot
it, say so — "we don't know enough to justify this yet, and here's the cheapest
way to find out" is a legitimate and often correct recommendation.

## 5. Name what each option doesn't solve

Every option has a gap. Stating it up front is what makes the comparison honest,
and it's usually where the real discussion starts.

An option presented with no downsides is an option that hasn't been thought
about hard enough.

## 6. Measure when measuring is cheap

The product and its seeded data are right there. If a question is answerable in
a five-minute query, **answer it** instead of debating it.

> Before assuming match-reason chips would be useful, we counted how often each
> signal fires across 32 jobs. Two of the six fired on 91% and 100% of jobs —
> which meant the obvious implementation would have surfaced the *least*
> informative signals first. That changed the design before design started.

The cost of checking is almost always lower than the cost of building the wrong
thing.

## 7. "Do nothing" is a real option

Not every problem is worth solving now. Worth naming explicitly when:

- it's rare **and** mild
- a workaround exists and people already use it
- the evidence is too thin to justify the cost
- something upstream is about to change and make it moot

Recommending "not yet, and here's what would change my mind" is a valid output.

## 8. Specific enough to hand over

The test for a finished solution: **could a designer or engineer start on Monday
without asking what you meant?**

- ❌ "Improve the recommendation experience"
- ❌ "Add transparency to job matching"
- ✅ "Return the top three matched signals from `decorate()` as `matchReasons`,
  and render them as chips under the salary chip in `job-card.tsx`, only when
  `sort=recommended`"

If it's still arguable what gets built, it isn't finished.

---

## Where judgement stays with the human

The agent proposes, argues, checks and recommends. It does **not** decide.

Trade-offs between speed and completeness, appetite for risk, what fits this
quarter, what the team can absorb right now — those depend on context the agent
doesn't have. It should have an opinion and defend it, then hand the call to the
PM and record what they chose.
