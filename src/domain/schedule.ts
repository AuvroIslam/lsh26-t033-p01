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
  /** How many jobs the shop can run at once. One machine by default. */
  machines?: number;
  /**
   * Fuel ceiling, in generator minutes. The plan will not exceed it: a job that
   * would is left unplaced with that reason. `null` means unlimited.
   */
  generatorBudgetMinutes?: number | null;
}

/**
 * Where a job would rather sit. The planner tries the preferred kind of space
 * first and only falls back when nothing of that kind is left.
 */
type Preference = 'cut-free' | 'inside-cut' | 'anywhere' | 'cheapest';

interface Candidate {
  start: number;
  machine: number;
  /** Index into that machine's free list, so the span can be removed cheaply. */
  freeIndex: number;
  /** Generator minutes this slot would cost. */
  cost: number;
}

interface Group {
  power: Job['power'];
  preference: Preference;
  allowFallback: boolean;
}

const MAX_MACHINES = 8;

/**
 * Builds a plan.
 *
 * Each machine runs one job at a time, and a job is never split across a break,
 * so a 90 minute job needs 90 uninterrupted minutes on one machine.
 *
 * Jobs are placed most-constrained first — `grid`, then `generator`, then
 * `none` — and within each group urgent work first, then earliest promised
 * time, then longest:
 *
 * 1. `grid` jobs may only use cut-free space. This is a hard rule: if no
 *    cut-free gap is long enough, the job is reported as unplaced rather than
 *    placed somewhere invalid.
 * 2. `generator` jobs take the slot costing the fewest generator minutes — that
 *    is cut-free space wherever it exists, since it costs nothing, otherwise
 *    the slot overlapping the cuts by the least. A slot that would break the
 *    fuel budget is never taken.
 * 3. `none` jobs prefer to sit inside cuts. They need no power, so parking them
 *    in a cut keeps scarce cut-free space available for the rest.
 *
 * A job may also carry a ready time, a promised finish time, or both. Those are
 * hard constraints too: a job that cannot be finished by the time it was
 * promised is reported, never quietly placed late.
 *
 * The result is deterministic: the same input always produces the same plan.
 */
export function buildPlan(input: ScheduleInput): Plan {
  const window: Interval = {
    start: Math.min(input.window.start, input.window.end),
    end: Math.max(input.window.start, input.window.end),
  };

  const machines = clampMachines(input.machines);
  const budget = normalizeBudget(input.generatorBudgetMinutes);

  // Shown in full on the timeline, because a cut is real even when the shop is
  // shut. Only the part inside opening hours can affect the plan, so the
  // scheduler works from the clamped set.
  const enteredCuts = normalize(input.cuts);
  const cuts = normalize(enteredCuts.flatMap((cut) => intersect(cut, [window])));

  const free: Interval[][] = Array.from({ length: machines }, () =>
    length(window) > 0 ? [{ ...window }] : [],
  );
  const placements: Placement[] = [];
  const unplaced: UnplacedJob[] = [];
  let generatorUsed = 0;

  const order: readonly Group[] = [
    { power: 'grid', preference: 'cut-free', allowFallback: false },
    { power: 'generator', preference: 'cheapest', allowFallback: false },
    { power: 'none', preference: 'inside-cut', allowFallback: true },
  ];

  for (const group of order) {
    for (const job of sortForPlacement(input.jobs, group.power, window)) {
      const rejection = rejectOutright(job, window);
      if (rejection) {
        unplaced.push({ job, reason: rejection });
        continue;
      }

      const reach = reachableWindow(job, window);
      const budgetFor =
        job.power === 'generator' && budget !== null ? budget - generatorUsed : null;

      let candidate =
        group.preference === 'cheapest'
          ? findCheapestSlot(free, cuts, job.minutes, reach, budgetFor)
          : findSlot(free, cuts, job.minutes, group.preference, reach);
      let usedFallback = false;
      if (!candidate && group.allowFallback) {
        candidate = findSlot(free, cuts, job.minutes, 'anywhere', reach);
        usedFallback = candidate !== null;
      }

      if (!candidate) {
        unplaced.push({
          job,
          reason: reasonForFailure(job, free, cuts, group.preference, reach, budgetFor),
        });
        continue;
      }

      const span: Interval = { start: candidate.start, end: candidate.start + job.minutes };
      placements.push(
        buildPlacement(job, span, candidate.machine, cuts, group.preference, usedFallback),
      );
      generatorUsed += candidate.cost;
      free[candidate.machine] = occupy(free[candidate.machine]!, candidate.freeIndex, span);
    }
  }

  placements.sort(
    (a, b) => a.start - b.start || a.machine - b.machine || a.job.name.localeCompare(b.job.name),
  );

  const totalGeneratorMinutes = placements.reduce((sum, p) => sum + p.generatorMinutes, 0);
  const scheduledMinutes = placements.reduce((sum, p) => sum + (p.end - p.start), 0);
  const capacityMinutes = length(window) * machines;

  return {
    window,
    enteredCuts,
    cuts,
    machines,
    placements,
    unplaced,
    totalGeneratorMinutes,
    generatorBudgetMinutes: budget,
    generatorBudgetRemaining: budget === null ? null : Math.max(0, budget - totalGeneratorMinutes),
    scheduledMinutes,
    capacityMinutes,
    idleMinutes: Math.max(0, capacityMinutes - scheduledMinutes),
  };
}

function clampMachines(machines: number | undefined): number {
  if (machines === undefined || !Number.isFinite(machines)) return 1;
  return Math.max(1, Math.min(MAX_MACHINES, Math.round(machines)));
}

function normalizeBudget(budget: number | null | undefined): number | null {
  if (budget === null || budget === undefined) return null;
  if (!Number.isFinite(budget) || budget < 0) return null;
  return Math.round(budget);
}

/**
 * Urgent work first, then earliest promised time, then longest.
 *
 * Earliest-deadline-first is the standard ordering for meeting promised times,
 * and longest-first packs better among jobs with no promise attached, because a
 * long job has the fewest gaps it can fit into.
 */
function sortForPlacement(jobs: readonly Job[], power: Job['power'], window: Interval): Job[] {
  return jobs
    .map((job, index) => ({ job, index }))
    .filter((entry) => entry.job.power === power)
    .sort((a, b) => {
      const urgency = Number(b.job.urgent ?? false) - Number(a.job.urgent ?? false);
      if (urgency !== 0) return urgency;
      const dueA = a.job.dueBy ?? window.end;
      const dueB = b.job.dueBy ?? window.end;
      if (dueA !== dueB) return dueA - dueB;
      if (a.job.minutes !== b.job.minutes) return b.job.minutes - a.job.minutes;
      return a.index - b.index;
    })
    .map((entry) => entry.job);
}

/** Problems that need no search to detect, reported in the user's terms. */
function rejectOutright(job: Job, window: Interval): string | null {
  if (!Number.isFinite(job.minutes) || job.minutes <= 0) {
    return 'Duration must be at least 1 minute.';
  }
  if (job.minutes > length(window)) {
    return `Longer than the whole working window, which is ${length(window)} minutes.`;
  }
  const reach = reachableWindow(job, window);
  if (length(reach) <= 0) {
    return 'Its ready time and promised time leave no usable window today.';
  }
  if (job.minutes > length(reach)) {
    return `Needs ${job.minutes} minutes but only ${length(reach)} fit between ${formatTime(reach.start)} and ${formatTime(reach.end)}.`;
  }
  return null;
}

/** The span a job is allowed to occupy, once its own times are applied. */
function reachableWindow(job: Job, window: Interval): Interval {
  return {
    start: Math.max(window.start, job.readyAt ?? window.start),
    end: Math.min(window.end, job.dueBy ?? window.end),
  };
}

/** Earliest start at which `minutes` fit into free space of the wanted kind. */
function findSlot(
  free: readonly Interval[][],
  cuts: readonly Interval[],
  minutes: number,
  preference: Preference,
  reach: Interval,
): Candidate | null {
  let best: Candidate | null = null;

  free.forEach((lane, machine) => {
    lane.forEach((gap, freeIndex) => {
      for (const usable of intersect(gap, [reach])) {
        const slices =
          preference === 'cut-free'
            ? subtract(usable, cuts)
            : preference === 'inside-cut'
              ? intersect(usable, cuts)
              : [usable];
        for (const slice of slices) {
          if (length(slice) < minutes) continue;
          const cost = overlapMinutes({ start: slice.start, end: slice.start + minutes }, cuts);
          if (!best || slice.start < best.start) {
            best = { start: slice.start, machine, freeIndex, cost };
          }
          break; // Slices are ordered, so the first fit here is this gap's earliest.
        }
      }
    });
  });

  return best;
}

/**
 * Slot for a generator job that costs the fewest generator minutes, breaking
 * ties towards the earliest start, and never exceeding the fuel left.
 *
 * Overlap with the cuts, seen as a function of the start time, only changes
 * direction where the job's leading or trailing edge crosses a cut boundary.
 * Checking the start of each gap, the latest start in each gap, and every cut
 * edge therefore covers a true minimum without scanning minute by minute.
 * When a cut-free slot exists this returns it, because its cost is zero.
 */
function findCheapestSlot(
  free: readonly Interval[][],
  cuts: readonly Interval[],
  minutes: number,
  reach: Interval,
  budgetLeft: number | null,
): Candidate | null {
  let best: Candidate | null = null;

  free.forEach((lane, machine) => {
    lane.forEach((gap, freeIndex) => {
      for (const usable of intersect(gap, [reach])) {
        if (length(usable) < minutes) continue;

        const starts = new Set<number>([usable.start, usable.end - minutes]);
        for (const cut of cuts) {
          starts.add(cut.end);
          starts.add(cut.start - minutes);
        }

        for (const start of starts) {
          if (start < usable.start || start + minutes > usable.end) continue;
          const cost = overlapMinutes({ start, end: start + minutes }, cuts);
          if (budgetLeft !== null && cost > budgetLeft) continue;
          if (
            !best ||
            cost < best.cost ||
            (cost === best.cost && start < best.start) ||
            (cost === best.cost && start === best.start && machine < best.machine)
          ) {
            best = { start, machine, freeIndex, cost };
          }
        }
      }
    });
  });

  return best;
}

/** Removes an occupied span from one machine's free list, keeping it sorted. */
function occupy(lane: readonly Interval[], freeIndex: number, span: Interval): Interval[] {
  const next: Interval[] = [];
  lane.forEach((gap, index) => {
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
  machine: number,
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
  const due = job.dueBy ?? null;

  return {
    job,
    start: span.start,
    end: span.end,
    machine,
    generatorMinutes,
    segments,
    note: describe(job, span, machine, generatorMinutes, preference, usedFallback),
    slackMinutes: due === null ? null : due - span.end,
  };
}

function describe(
  job: Job,
  span: Interval,
  machine: number,
  generatorMinutes: number,
  preference: Preference,
  usedFallback: boolean,
): string {
  const where = `Machine ${machine + 1}, ${formatTime(span.start)} to ${formatTime(span.end)}`;

  let why: string;
  if (job.power === 'grid') {
    why = 'clear of every power cut.';
  } else if (job.power === 'generator') {
    why =
      generatorMinutes > 0
        ? `no cut-free gap was long enough, so ${generatorMinutes} minutes run on the generator.`
        : 'in cut-free time, so it needs no generator.';
  } else if (preference === 'inside-cut' && !usedFallback) {
    why = 'inside a cut on purpose, since it needs no power, which keeps cut-free time for others.';
  } else {
    why = 'it needs no power, so a cut does not affect it.';
  }

  const due = job.dueBy ?? null;
  const promise =
    due === null ? '' : ` Promised by ${formatTime(due)}, with ${due - span.end} minutes to spare.`;

  return `${where}, ${why}${promise}`;
}

function reasonForFailure(
  job: Job,
  free: readonly Interval[][],
  cuts: readonly Interval[],
  preference: Preference,
  reach: Interval,
  budgetLeft: number | null,
): string {
  const gaps = free.flat().flatMap((gap) => intersect(gap, [reach]));

  if (preference === 'cut-free') {
    const longest = gaps
      .flatMap((gap) => subtract(gap, cuts))
      .reduce((max, gap) => Math.max(max, length(gap)), 0);
    return longest === 0
      ? 'No cut-free time is left in the window this job can use.'
      : `Needs ${job.minutes} uninterrupted minutes clear of every cut, but the longest such gap left is ${longest} minutes.`;
  }

  const longest = gaps.reduce((max, gap) => Math.max(max, length(gap)), 0);
  if (longest >= job.minutes && budgetLeft !== null) {
    return `Every remaining slot would run on the generator for longer than the ${budgetLeft} generator minutes still in budget.`;
  }
  return longest === 0
    ? 'No machine has time left in the window this job can use.'
    : `Needs ${job.minutes} uninterrupted minutes, but the longest free gap left is ${longest} minutes.`;
}
