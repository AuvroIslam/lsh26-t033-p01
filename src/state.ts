import { DAY_MINUTES, parseTime } from './domain/time';
import { splitOvernight } from './domain/intervals';
import type { Job, PowerCut, PowerNeed } from './domain/types';
import type { FixtureCase } from './domain/fixture';

export interface AppState {
  windowStart: number;
  windowEnd: number;
  cuts: PowerCut[];
  jobs: Job[];
  /** Which fixture case is loaded, shown so judges can see what they are looking at. */
  loadedCaseId: string | null;
}

export type Action =
  | { type: 'setWindow'; start: number; end: number }
  | { type: 'addCut'; start: number; end: number }
  | { type: 'removeCut'; id: string }
  | { type: 'addJob'; name: string; minutes: number; power: PowerNeed }
  | { type: 'removeJob'; id: string }
  | { type: 'loadCase'; fixtureCase: FixtureCase }
  | { type: 'reset' };

const STORAGE_KEY = 'lsh26-t033-p01/state/v1';

const time = (value: string): number => parseTime(value) ?? 0;

/** The state a first-time visitor sees, and what Reset restores. */
export const initialState: AppState = {
  windowStart: time('09:00'),
  windowEnd: time('21:00'),
  cuts: [],
  jobs: [],
  loadedCaseId: null,
};

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setWindow':
      return { ...state, windowStart: action.start, windowEnd: action.end };

    case 'addCut': {
      // A cut running past midnight is stored as the one or two real spans it
      // covers, so nothing downstream has to cope with an end before its start.
      const spans = splitOvernight(action.start, action.end, DAY_MINUTES).map((span) => ({
        id: newId(),
        ...span,
      }));
      return {
        ...state,
        cuts: [...state.cuts, ...spans].sort((a, b) => a.start - b.start),
      };
    }

    case 'removeCut':
      return { ...state, cuts: state.cuts.filter((cut) => cut.id !== action.id) };

    case 'addJob':
      return {
        ...state,
        jobs: [
          ...state.jobs,
          { id: newId(), name: action.name, minutes: action.minutes, power: action.power },
        ],
      };

    case 'removeJob':
      return { ...state, jobs: state.jobs.filter((job) => job.id !== action.id) };

    case 'loadCase':
      return {
        windowStart: action.fixtureCase.window.start,
        windowEnd: action.fixtureCase.window.end,
        cuts: action.fixtureCase.cuts.map((cut) => ({ ...cut, id: newId() })),
        jobs: action.fixtureCase.jobs.map((job) => ({ ...job, id: newId() })),
        loadedCaseId: action.fixtureCase.caseId,
      };

    case 'reset':
      return initialState;

    default:
      return state;
  }
}

/**
 * Reads saved state. Storage can be unavailable or hold something from an older
 * build, so anything unreadable falls back to the starting state rather than
 * breaking the page.
 */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return initialState;
    const candidate = parsed as Partial<AppState>;
    if (
      typeof candidate.windowStart !== 'number' ||
      typeof candidate.windowEnd !== 'number' ||
      !Array.isArray(candidate.cuts) ||
      !Array.isArray(candidate.jobs)
    ) {
      return initialState;
    }
    return {
      windowStart: candidate.windowStart,
      windowEnd: candidate.windowEnd,
      cuts: candidate.cuts as PowerCut[],
      jobs: candidate.jobs as Job[],
      loadedCaseId: candidate.loadedCaseId ?? null,
    };
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A private window or blocked storage must not stop the planner working.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; the reducer has already reset the in-memory state.
  }
}
