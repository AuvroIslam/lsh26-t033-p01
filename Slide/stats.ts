import { readFileSync, writeFileSync } from 'node:fs';
import { buildPlan } from '../src/domain/schedule';
import { parseFixture } from '../src/domain/fixture';

const { cases } = parseFixture(
  JSON.parse(readFileSync('sample-data/P01_load_shedding_public.json', 'utf8')),
);

const rows = cases.map((c) => {
  const plan = buildPlan({ window: c.window, cuts: c.cuts, jobs: c.jobs });
  return {
    caseId: c.caseId,
    jobs: c.jobs.length,
    placed: plan.placements.length,
    unplaced: plan.unplaced.length,
    generator: plan.totalGeneratorMinutes,
    cuts: plan.cuts.length,
    cutMinutes: plan.cuts.reduce((s, x) => s + (x.end - x.start), 0),
  };
});

const totals = rows.reduce(
  (acc, r) => ({
    jobs: acc.jobs + r.jobs,
    placed: acc.placed + r.placed,
    unplaced: acc.unplaced + r.unplaced,
    generator: acc.generator + r.generator,
  }),
  { jobs: 0, placed: 0, unplaced: 0, generator: 0 },
);

writeFileSync('Slide/assets/stats.json', JSON.stringify({ rows, totals }, null, 2));
console.log(totals);
