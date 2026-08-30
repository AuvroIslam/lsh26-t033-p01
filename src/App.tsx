import { useEffect, useMemo, useReducer } from 'react';

import { buildPlan } from './domain/schedule';
import { GeneratorSummary, Timeline } from './components/Timeline';
import { CutsPanel, DataPanel, JobsPanel, WindowPanel } from './components/Inputs';
import { PlanPanel } from './components/PlanPanel';
import { loadState, reducer, saveState } from './state';

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // The plan is derived, never stored, so the generator total in R4 can never
  // drift from the jobs and cuts on screen.
  const plan = useMemo(
    () =>
      buildPlan({
        window: { start: state.windowStart, end: state.windowEnd },
        cuts: state.cuts,
        jobs: state.jobs,
      }),
    [state.windowStart, state.windowEnd, state.cuts, state.jobs],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-2 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold">Load-Shedding Window Planner</h1>
            <p className="text-xs text-slate-500">
              Plan a day's jobs around today's power cuts
            </p>
          </div>
          <p className="text-xs text-slate-400">
            LSH26-T033 · P01
            {state.loadedCaseId && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                {state.loadedCaseId}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        <Timeline plan={plan} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <WindowPanel state={state} dispatch={dispatch} />
            <CutsPanel cuts={state.cuts} dispatch={dispatch} />
            <JobsPanel jobs={state.jobs} dispatch={dispatch} />
            <DataPanel state={state} dispatch={dispatch} />
          </div>

          <div className="space-y-4">
            <GeneratorSummary plan={plan} />
            <PlanPanel plan={plan} />
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400 sm:px-6">
        Grid jobs are never scheduled inside a power cut. Generator minutes count only the time a
        generator-capable job spends inside a cut.
      </footer>
    </div>
  );
}
