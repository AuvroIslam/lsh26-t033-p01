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
  /** Minutes of this job that fall inside a cut while needing power. */
  generatorMinutes: number;
  segments: PlacementSegment[];
  /** Plain-language note on why the planner chose this slot. */
  note: string;
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
  placements: Placement[];
  unplaced: UnplacedJob[];
  totalGeneratorMinutes: number;
  scheduledMinutes: number;
  idleMinutes: number;
}
