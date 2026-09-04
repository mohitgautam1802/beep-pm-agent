/**
 * One-off analysis for the beep-pm-agent scoping doc (why-recommended).
 *
 * Question: if we show "match reason" chips, how many jobs would match on
 * freshness ALONE? If that is most of them, the chips are noise, not signal.
 *
 * Mirrors the signal logic in scoreJob() in src/jobs/jobs.service.ts.
 *
 * HOW TO RUN
 * Needs the API's Prisma client and its seeded database, so run it from inside
 * the wellfound-clone-api checkout:
 *
 *   copy this file into wellfound-clone-api/
 *   cd wellfound-clone-api && npm run setup && node analyse-match-signals.mjs
 *
 * Output as of 2026-09-04 is saved beside this file in signal-distribution.txt.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;

const profile = await prisma.profile.findFirst({
  where: { user: { email: 'demo@wellfound.dev' } },
  include: { preference: true },
});

const pref = profile.preference;
const desiredRoles = JSON.parse(pref.desiredRoles).map((s) => s.toLowerCase());
const desiredLocations = JSON.parse(pref.desiredLocations).map((s) => s.toLowerCase());
const desiredRoleTypes = JSON.parse(pref.desiredRoleTypes);

const jobs = await prisma.job.findMany({
  where: { isActive: true },
  include: { locations: true },
});

const tally = { role: 0, roleType: 0, location: 0, remote: 0, salary: 0, freshness: 0 };
let freshnessOnly = 0;
let zeroSignals = 0;
const counts = [];

for (const job of jobs) {
  const reasons = [];

  if (desiredRoles.some((r) => job.title.toLowerCase().includes(r))) reasons.push('role');
  if (desiredRoleTypes.includes(job.roleType)) reasons.push('roleType');
  if (job.locations.some((l) => desiredLocations.includes(l.city.toLowerCase()))) reasons.push('location');
  if (pref.openToRemote && job.locationType === 'REMOTE') reasons.push('remote');
  if (pref.desiredSalaryMin && job.salaryMax && job.salaryMax >= pref.desiredSalaryMin) reasons.push('salary');

  const ageDays = (Date.now() - job.postedAt.getTime()) / DAY_MS;
  const fresh = Math.max(0, 15 - ageDays / 2) > 0;
  if (fresh) reasons.push('freshness');

  for (const r of reasons) tally[r]++;
  if (reasons.length === 1 && reasons[0] === 'freshness') freshnessOnly++;
  if (reasons.length === 0) zeroSignals++;
  counts.push(reasons.length);
}

const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
const dist = {};
for (const c of counts) dist[c] = (dist[c] ?? 0) + 1;

console.log(`Jobs analysed: ${jobs.length}  (persona: demo@wellfound.dev)`);
console.log(`\nHow often each signal fires:`);
for (const [k, v] of Object.entries(tally)) {
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(2)} / ${jobs.length}  (${Math.round((v / jobs.length) * 100)}%)`);
}
console.log(`\nSignals per job — average: ${avg}`);
console.log(`  distribution (signals: jobs):`, dist);
console.log(`\nFRESHNESS-ONLY matches: ${freshnessOnly} / ${jobs.length}`);
console.log(`Zero-signal matches:    ${zeroSignals} / ${jobs.length}`);

await prisma.$disconnect();
