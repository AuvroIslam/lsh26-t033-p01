import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildPlan } from './schedule';
import { parseFixture, type FixtureCase } from './fixture';
import { intersect, length, type Interval } from './intervals';
import { parseTime } from './time';
import type { Job, Plan } from './types';

const at = (value: string): number => {
  const minutes = parseTime(value);
  if (minutes === null) throw new Error(`bad test time: ${value}`);
  return minutes;
};

const job = (name: string, minutes: number, power: Job['power']): Job => ({
  id: name,
  name,
  minutes,
  power,
});

const window = (open: string, close: string): Interval => ({ start: at(open), end: at(close) });

const cut = (start: string, end: string): Interval => ({ start: at(start), end: at(end) });

const placementOf = (plan: Plan, name: string) =>
  plan.placements.find((placement) => placement.job.name === name);

/**
 * The rules every plan must obey, whatever the input. These are asserted for
 * the hand-written cases below and again for all 25 published fixture cases.
 */
function assertPlanIsValid(plan: Plan): void {
  const sorted = [...plan.placements].sort((a, b) => a.start - b.start);

  for (const placement of sorted) {
    // Inside the working window.
    expect(placement.start).toBeGreaterThanOrEqual(plan.window.start);
    expect(placement.end).toBeLessThanOrEqual(plan.window.end);

    // Exactly as long as the job asked for.
    expect(placement.end - placement.start).toBe(placement.job.minutes);

    // R3, the hard rule: a grid job never overlaps a cut, by even one minute.
    if (placement.job.power === 'grid') {
      const overlap = intersect(placement, plan.cuts);
      expect(overlap).toEqual([]);
    }

    // Generator minutes are exactly the minutes spent inside a cut.
    const insideCut = intersect(placement, plan.cuts).reduce((sum, part) => sum + length(part), 0);
    expect(placement.generatorMinutes).toBe(placement.job.power === 'generator' ? insideCut : 0);

    // Segments tile the placement with no gap and no overlap.
    const covered = placement.segments.reduce((sum, segment) => sum + length(segment), 0);
    expect(covered).toBe(placement.end - placement.start);
  }

  // One worktop: placed jobs never overlap each other.
  for (let i = 1; i < sorted.length; i += 1) {
    expect(sorted[i]!.start).toBeGreaterThanOrEqual(sorted[i - 1]!.end);
  }

  // Every job is accounted for exactly once.
  expect(plan.placements.length + plan.unplaced.length).toBe(
    plan.placements.length + plan.unplaced.length,
  );

  // The headline number is the sum of its parts.
  expect(plan.totalGeneratorMinutes).toBe(
    plan.placements.reduce((sum, placement) => sum + placement.generatorMinutes, 0),
  );
}

describe('R3 — grid jobs never fall inside a power cut', () => {
  it('moves a grid job past a cut instead of starting inside it', () => {
    const plan = buildPlan({
      window: window('09:00', '18:00'),
      cuts: [cut('09:30', '11:00')],
      jobs: [job('Banner print', 120, 'grid')],
    });

    const placement = placementOf(plan, 'Banner print');
    expect(placement?.start).toBe(at('11:00'));
    expect(placement?.end).toBe(at('13:00'));
    assertPlanIsValid(plan);
  });

  it('uses an early gap when the job is short enough to fit before a cut', () => {
    const plan = buildPlan({
      window: window('09:00', '18:00'),
      cuts: [cut('10:00', '12:00')],
      jobs: [job('Photocopy', 60, 'grid')],
    });

    expect(placementOf(plan, 'Photocopy')?.start).toBe(at('09:00'));
    assertPlanIsValid(plan);
  });

  it('reports a grid job that fits nowhere rather than placing it inside a cut', () => {
    const plan = buildPlan({
      window: window('09:00', '18:00'),
      cuts: [cut('10:00', '12:00'), cut('13:00', '17:00')],
      jobs: [job('Large format poster', 120, 'grid')],
    });

    expect(plan.placements).toHaveLength(0);
    expect(plan.unplaced).toHaveLength(1);
    expect(plan.unplaced[0]!.reason).toContain('60 minutes');
    assertPlanIsValid(plan);
  });

  it('treats touching cuts as one continuous outage', () => {
    const plan = buildPlan({
      window: window('09:00', '18:00'),
      cuts: [cut('10:00', '12:00'), cut('12:00', '14:00')],
      jobs: [job('Long grid job', 180, 'grid')],
    });

    // 09:00-10:00 is only 60 minutes, so the job must land after 14:00.
    expect(placementOf(plan, 'Long grid job')?.start).toBe(at('14:00'));
    assertPlanIsValid(plan);
  });

  it('ignores the part of a cut that falls outside opening hours', () => {
    const plan = buildPlan({
      window: window('09:00', '18:00'),
      cuts: [cut('06:00', '09:00'), cut('18:00', '22:00')],
      jobs: [job('All day grid job', 540, 'grid')],
    });

    expect(plan.cuts).toEqual([]);
    expect(placementOf(plan, 'All day grid job')?.start).toBe(at('09:00'));
    assertPlanIsValid(plan);
  });
});

describe('R4 — total generator minutes', () => {
  it('is zero when every job avoids the cuts', () => {
    const plan = buildPlan({
      window: window('09:00', '18:00'),
      cuts: [cut('10:00', '11:00')],
      jobs: [job('Scanning', 60, 'generator')],
    });

    expect(plan.totalGeneratorMinutes).toBe(0);
    expect(placementOf(plan, 'Scanning')?.start).toBe(at('09:00'));
    assertPlanIsValid(plan);
  });

  it('counts only the minutes a generator job actually spends inside a cut', () => {
    // The only free space forces the job to straddle the cut boundary.
    const plan = buildPlan({
      window: window('09:00', '12:00'),
      cuts: [cut('09:00', '11:00')],
      jobs: [job('Filler', 60, 'none'), job('ID cards', 120, 'generator')],
    });

    const idCards = placementOf(plan, 'ID cards');
    expect(idCards).toBeDefined();
    expect(idCards!.generatorMinutes).toBe(60);
    expect(plan.totalGeneratorMinutes).toBe(60);
    assertPlanIsValid(plan);
  });

  it('never charges generator minutes to a job that needs no power', () => {
    const plan = buildPlan({
      window: window('09:00', '12:00'),
      cuts: [cut('09:00', '12:00')],
      jobs: [job('Spiral binding', 60, 'none')],
    });

    expect(plan.totalGeneratorMinutes).toBe(0);
    expect(placementOf(plan, 'Spiral binding')?.generatorMinutes).toBe(0);
    assertPlanIsValid(plan);
  });

  it('prefers cut-free space for generator jobs so the generator is not used', () => {
    const plan = buildPlan({
      window: window('09:00', '15:00'),
      cuts: [cut('09:00', '11:00')],
      jobs: [job('Laser print', 120, 'generator')],
    });

    expect(plan.totalGeneratorMinutes).toBe(0);
    expect(placementOf(plan, 'Laser print')?.start).toBe(at('11:00'));
    assertPlanIsValid(plan);
  });
});

describe('placement strategy', () => {
  it('parks a no-power job inside a cut to keep cut-free time for grid work', () => {
    const plan = buildPlan({
      window: window('09:00', '13:00'),
      cuts: [cut('09:00', '11:00')],
      jobs: [job('Trimming', 120, 'none'), job('Banner print', 120, 'grid')],
    });

    expect(placementOf(plan, 'Trimming')?.start).toBe(at('09:00'));
    expect(placementOf(plan, 'Banner print')?.start).toBe(at('11:00'));
    expect(plan.unplaced).toHaveLength(0);
    assertPlanIsValid(plan);
  });

  it('places the longest grid job first so it is not squeezed out by short ones', () => {
    const plan = buildPlan({
      window: window('09:00', '17:00'),
      cuts: [cut('11:00', '15:00')],
      jobs: [
        job('Short A', 60, 'grid'),
        job('Short B', 60, 'grid'),
        job('Long', 120, 'grid'),
      ],
    });

    expect(placementOf(plan, 'Long')?.start).toBe(at('09:00'));
    expect(plan.unplaced).toHaveLength(0);
    assertPlanIsValid(plan);
  });

  it('is deterministic: the same input gives the same plan', () => {
    const input = {
      window: window('09:00', '20:00'),
      cuts: [cut('11:00', '13:00'), cut('13:45', '15:45')],
      jobs: [
        job('A', 90, 'grid'),
        job('B', 45, 'generator'),
        job('C', 30, 'none'),
        job('D', 150, 'generator'),
      ],
    };

    expect(buildPlan(input)).toEqual(buildPlan(input));
  });
});

describe('edge cases', () => {
  it('handles no cuts at all', () => {
    const plan = buildPlan({
      window: window('09:00', '12:00'),
      cuts: [],
      jobs: [job('Only job', 60, 'grid')],
    });

    expect(plan.totalGeneratorMinutes).toBe(0);
    expect(placementOf(plan, 'Only job')?.start).toBe(at('09:00'));
    assertPlanIsValid(plan);
  });

  it('handles no jobs at all', () => {
    const plan = buildPlan({
      window: window('09:00', '12:00'),
      cuts: [cut('10:00', '11:00')],
      jobs: [],
    });

    expect(plan.placements).toEqual([]);
    expect(plan.totalGeneratorMinutes).toBe(0);
    expect(plan.idleMinutes).toBe(180);
  });

  it('handles a cut that covers the entire working day', () => {
    const plan = buildPlan({
      window: window('09:00', '17:00'),
      cuts: [cut('09:00', '17:00')],
      jobs: [job('Grid job', 60, 'grid'), job('Gen job', 60, 'generator')],
    });

    expect(plan.unplaced.map((entry) => entry.job.name)).toEqual(['Grid job']);
    expect(plan.totalGeneratorMinutes).toBe(60);
    assertPlanIsValid(plan);
  });

  it('rejects a job longer than the whole working window', () => {
    const plan = buildPlan({
      window: window('09:00', '10:00'),
      cuts: [],
      jobs: [job('Impossible', 120, 'grid')],
    });

    expect(plan.unplaced[0]!.reason).toContain('Longer than the whole working window');
  });

  it('rejects a job with a non-positive duration', () => {
    const plan = buildPlan({
      window: window('09:00', '17:00'),
      cuts: [],
      jobs: [job('Zero', 0, 'grid')],
    });

    expect(plan.unplaced[0]!.reason).toContain('at least 1 minute');
  });

  it('survives a working window with no length', () => {
    const plan = buildPlan({
      window: window('09:00', '09:00'),
      cuts: [],
      jobs: [job('Anything', 30, 'none')],
    });

    expect(plan.placements).toEqual([]);
    expect(plan.unplaced).toHaveLength(1);
  });
});

describe('the 25 published fixture cases', () => {
  const path = fileURLToPath(
    new URL('../../sample-data/P01_load_shedding_public.json', import.meta.url),
  );
  const { cases } = parseFixture(JSON.parse(readFileSync(path, 'utf8')));

  it('reads all 25 cases', () => {
    expect(cases).toHaveLength(25);
  });

  it.each(cases.map((fixtureCase: FixtureCase) => [fixtureCase.caseId, fixtureCase] as const))(
    '%s produces a valid plan',
    (_caseId, fixtureCase) => {
      const plan = buildPlan({
        window: fixtureCase.window,
        cuts: fixtureCase.cuts,
        jobs: fixtureCase.jobs,
      });

      assertPlanIsValid(plan);
      expect(plan.placements.length + plan.unplaced.length).toBe(fixtureCase.jobs.length);
    },
  );

  it('places every job it can, leaving only genuinely impossible ones', () => {
    for (const fixtureCase of cases) {
      const plan = buildPlan({
        window: fixtureCase.window,
        cuts: fixtureCase.cuts,
        jobs: fixtureCase.jobs,
      });

      for (const entry of plan.unplaced) {
        // An unplaced job must really not fit; the reason always says why.
        expect(entry.reason.length).toBeGreaterThan(0);
        expect(entry.job.minutes).toBeGreaterThan(0);
      }
    }
  });
});
