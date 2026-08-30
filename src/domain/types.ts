import type { Interval } from './intervals';

/**
 * What a job needs in order to run.
 * - `grid`      — mains only. It must never be placed inside a power cut.
 * - `generator` — normally runs on mains, but keeps running on the generator
 *                 during a cut. Any minute it spends inside a cut is a
 *                 generator minute the plan has to pay for.
 * - `none`      — needs no power at all, so a cut does not affect it.
 */
export type PowerNeed = 'grid' | 'generator' | 'none';

export interface Job {
  id: string;
  name: string;
  minutes: number;
  power: PowerNeed;
  /**
   * A promised collection time. The job must finish by this, or it is reported
   * as unschedulable rather than being placed late.
   */
  dueBy?: number | null;
  /** Earliest the job can start — material or artwork arriving, for instance. */
  readyAt?: number | null;
  /** Urgent jobs get first choice of the day's usable time. */
  urgent?: boolean;
}

export interface PowerCut extends Interval {
  id: string;
}

/** One stretch of a placed job, flagged if it is drawing on the generator. */
export interface PlacementSegment extends Interval {
  onGenerator: boolean;
}

export interface Placement {
  job: Job;
  start: number;
  end: number;
  /** Which machine runs it, counting from 0. */
  machine: number;
  /** Minutes of this job that fall inside a cut while needing power. */
  generatorMinutes: number;
  segments: PlacementSegment[];
  /** Plain-language note on why the planner chose this slot. */
  note: string;
  /** Minutes of slack left before the job's promised time, when it has one. */
  slackMinutes: number | null;
}

export interface UnplacedJob {
  job: Job;
  reason: string;
}

export interface Plan {
  window: Interval;
  /**
   * Every cut as entered, merged but not clamped. R1 asks for the cuts to be
   * shown on a 24-hour timeline, including any that fall outside opening hours.
   */
  enteredCuts: Interval[];
  /** Cuts after merging and clamping to the working window; drives the plan. */
  cuts: Interval[];
  machines: number;
  placements: Placement[];
  unplaced: UnplacedJob[];
  totalGeneratorMinutes: number;
  /** Fuel ceiling in generator minutes, or null when the generator is unlimited. */
  generatorBudgetMinutes: number | null;
  /** How much of that ceiling is left. */
  generatorBudgetRemaining: number | null;
  scheduledMinutes: number;
  /** Machine time available across every machine, and how much sits unused. */
  capacityMinutes: number;
  idleMinutes: number;
}
