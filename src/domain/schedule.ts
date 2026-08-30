import { formatTime } from './time';
import {
  intersect,
  length,
  normalize,
  overlapMinutes,
  subtract,
  type Interval,
} from './intervals';
import type { Job, Placement, PlacementSegment, Plan, UnplacedJob } from './types';

export interface ScheduleInput {
  /** Working window, normally the shop's opening hours. */
  window: Interval;
  cuts: readonly Interval[];
  jobs: readonly Job[];
}

/**
 * Where a job would rather sit. The planner tries the preferred kind of space
 * first and only falls back when nothing of that kind is left.
 */
type Preference = 'cut-free' | 'inside-cut' | 'anywhere' | 'cheapest';

interface Candidate {
  start: number;
  /** Index into the free list, so the chosen span can be removed cheaply. */
  freeIndex: number;
}

interface Group {
  power: Job['power'];
  preference: Preference;
  allowFallback: boolean;
}

/**
 * Builds a plan.
 *
 * The shop is treated as one worktop: jobs run one at a time and never overlap
 * each other. A job is not split across a break either, so a 90 minute job
 * needs 90 uninterrupted minutes.
 *
 * Jobs are placed most-constrained first, and within each group longest first,
 * because a long job has the fewest gaps it can fit into:
 *
 * 1. `grid` jobs, which may only use cut-free space. This is a hard rule: if no
 *    cut-free gap is long enough, the job is reported as unplaced rather than
 *    placed somewhere invalid.
 * 2. `generator` jobs, which take the slot costing the fewest generator
 *    minutes. That is cut-free space wherever it exists, since it costs
 *    nothing; otherwise the slot overlapping the cuts by the least.
 * 3. `none` jobs, which prefer to sit inside cuts. They need no power, so
 *    parking them in a cut keeps scarce cut-free space available for the rest.
 *
 * The result is deterministic: the same input always produces the same plan.
 */
export function buildPlan(input: ScheduleInput): Plan {
  const window: Interval = {
    start: Math.min(input.window.start, input.window.end),
    end: Math.max(input.window.start, input.window.end),
  };

  // A cut outside opening hours cannot affect the plan, so clamp it away.
  const cuts = normalize(input.cuts.flatMap((cut) => intersect(cut, [window])));

  let free: Interval[] = length(window) > 0 ? [{ ...window }] : [];
  const placements: Placement[] = [];
  const unplaced: UnplacedJob[] = [];

  const order: readonly Group[] = [
    { power: 'grid', preference: 'cut-free', allowFallback: false },
    { power: 'generator', preference: 'cheapest', allowFallback: false },
    { power: 'none', preference: 'inside-cut', allowFallback: true },
  ];

  for (const group of order) {
    const jobs = input.jobs
      .map((job, index) => ({ job, index }))
      .filter((entry) => entry.job.power === group.power)
      .sort((a, b) => b.job.minutes - a.job.minutes || a.index - b.index);

    for (const { job } of jobs) {
      if (!Number.isFinite(job.minutes) || job.minutes <= 0) {
        unplaced.push({ job, reason: 'Duration must be at least 1 minute.' });
        continue;
      }
      if (job.minutes > length(window)) {
        unplaced.push({
          job,
          reason: `Longer than the whole working window, which is ${length(window)} minutes.`,
        });
        continue;
      }

      let candidate =
        group.preference === 'cheapest'
          ? findCheapestSlot(free, cuts, job.minutes)
          : findSlot(free, cuts, job.minutes, group.preference);
      let usedFallback = false;
      if (!candidate && group.allowFallback) {
        candidate = findSlot(free, cuts, job.minutes, 'anywhere');
        usedFallback = candidate !== null;
      }

      if (!candidate) {
        unplaced.push({ job, reason: reasonForFailure(job, free, cuts, group.preference) });
        continue;
      }

      const span: Interval = { start: candidate.start, end: candidate.start + job.minutes };
      placements.push(buildPlacement(job, span, cuts, group.preference, usedFallback));
      free = occupy(free, candidate.freeIndex, span);
    }
  }

  placements.sort((a, b) => a.start - b.start || a.job.name.localeCompare(b.job.name));

  const totalGeneratorMinutes = placements.reduce((sum, p) => sum + p.generatorMinutes, 0);
  const scheduledMinutes = placements.reduce((sum, p) => sum + (p.end - p.start), 0);

  return {
    window,
    cuts,
    placements,
    unplaced,
    totalGeneratorMinutes,
    scheduledMinutes,
    idleMinutes: Math.max(0, length(window) - scheduledMinutes),
  };
}

/** Earliest start at which `minutes` fit into free space of the wanted kind. */
function findSlot(
  free: readonly Interval[],
  cuts: readonly Interval[],
  minutes: number,
  preference: Preference,
): Candidate | null {
  let best: Candidate | null = null;
  free.forEach((gap, freeIndex) => {
    const slices =
      preference === 'cut-free'
        ? subtract(gap, cuts)
        : preference === 'inside-cut'
          ? intersect(gap, cuts)
          : [gap];
    for (const slice of slices) {
      if (length(slice) < minutes) continue;
      if (!best || slice.start < best.start) best = { start: slice.start, freeIndex };
      break; // Slices are ordered, so the first fit here is this gap's earliest.
    }
  });
  return best;
}

/**
 * Slot for a generator job that costs the fewest generator minutes, breaking
 * ties towards the earliest start.
 *
 * Overlap with the cuts, seen as a function of the start time, only changes
 * direction where the job's leading or trailing edge crosses a cut boundary.
 * Checking the start of each gap, the latest start in each gap, and every cut
 * edge therefore covers a true minimum without scanning minute by minute.
 * When a cut-free slot exists this returns it, because its cost is zero.
 */
function findCheapestSlot(
  free: readonly Interval[],
  cuts: readonly Interval[],
  minutes: number,
): Candidate | null {
  let best: (Candidate & { cost: number }) | null = null;

  free.forEach((gap, freeIndex) => {
    if (length(gap) < minutes) return;

    const starts = new Set<number>([gap.start, gap.end - minutes]);
    for (const cut of cuts) {
      starts.add(cut.end);
      starts.add(cut.start - minutes);
    }

    for (const start of starts) {
      if (start < gap.start || start + minutes > gap.end) continue;
      const cost = overlapMinutes({ start, end: start + minutes }, cuts);
      if (!best || cost < best.cost || (cost === best.cost && start < best.start)) {
        best = { start, freeIndex, cost };
      }
    }
  });

  return best;
}

/** Removes an occupied span from the free list, keeping the list sorted. */
function occupy(free: readonly Interval[], freeIndex: number, span: Interval): Interval[] {
  const next: Interval[] = [];
  free.forEach((gap, index) => {
    if (index !== freeIndex) {
      next.push(gap);
      return;
    }
    next.push(...subtract(gap, [span]).filter((part) => length(part) > 0));
  });
  return next.sort((a, b) => a.start - b.start);
}

function buildPlacement(
  job: Job,
  span: Interval,
  cuts: readonly Interval[],
  preference: Preference,
  usedFallback: boolean,
): Placement {
  const insideCut = intersect(span, cuts);
  const outsideCut = subtract(span, cuts);

  const segments: PlacementSegment[] = [
    ...outsideCut.map((part) => ({ ...part, onGenerator: false })),
    ...insideCut.map((part) => ({ ...part, onGenerator: job.power === 'generator' })),
  ].sort((a, b) => a.start - b.start);

  const generatorMinutes = job.power === 'generator' ? overlapMinutes(span, cuts) : 0;

  return {
    job,
    start: span.start,
    end: span.end,
    generatorMinutes,
    segments,
    note: describe(job, span, generatorMinutes, preference, usedFallback),
  };
}

function describe(
  job: Job,
  span: Interval,
  generatorMinutes: number,
  preference: Preference,
  usedFallback: boolean,
): string {
  const slot = `${formatTime(span.start)} to ${formatTime(span.end)}`;
  if (job.power === 'grid') {
    return `Placed at ${slot}, clear of every power cut.`;
  }
  if (job.power === 'generator') {
    return generatorMinutes > 0
      ? `Placed at ${slot}. No cut-free gap was long enough, so the cheapest slot was used and ${generatorMinutes} minutes run on the generator.`
      : `Placed at ${slot} in cut-free time, so it needs no generator.`;
  }
  if (preference === 'inside-cut' && !usedFallback) {
    return `Placed at ${slot}, inside a cut on purpose. It needs no power, which keeps cut-free time free for other jobs.`;
  }
  return `Placed at ${slot}. It needs no power, so a cut does not affect it.`;
}

function reasonForFailure(
  job: Job,
  free: readonly Interval[],
  cuts: readonly Interval[],
  preference: Preference,
): string {
  if (preference === 'cut-free') {
    const longest = free
      .flatMap((gap) => subtract(gap, cuts))
      .reduce((max, gap) => Math.max(max, length(gap)), 0);
    return longest === 0
      ? 'No cut-free time is left in the working window.'
      : `Needs ${job.minutes} uninterrupted minutes clear of every cut, but the longest such gap left is ${longest} minutes.`;
  }
  const longest = free.reduce((max, gap) => Math.max(max, length(gap)), 0);
  return longest === 0
    ? 'The working window is already full.'
    : `Needs ${job.minutes} uninterrupted minutes, but the longest free gap left is ${longest} minutes.`;
}
