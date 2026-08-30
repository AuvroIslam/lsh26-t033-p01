import { useEffect, useMemo, useReducer } from 'react';
import { Zap } from 'lucide-react';

import { buildPlan } from './domain/schedule';
import { GeneratorSummary, Timeline } from './components/Timeline';
import {
  CutsPanel,
  DataPanel,
  IconTile,
  JobsPanel,
  ShopPanel,
  WindowPanel,
} from './components/Inputs';
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
        machines: state.machines,
        generatorBudgetMinutes: state.generatorBudget,
      }),
    [
      state.windowStart,
      state.windowEnd,
      state.cuts,
      state.jobs,
      state.machines,
      state.generatorBudget,
    ],
  );

  return (
    <div className="min-h-screen bg-ground px-3 py-4 sm:px-6 sm:py-8">
      <div className="lift-shell mx-auto max-w-6xl rounded-[2rem] bg-shell p-4 sm:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconTile icon={Zap} size={52} tone="accent" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">
                Load-Shedding Window Planner
              </h1>
              <p className="text-sm text-ink-faint">
                Plan a day's jobs around today's power cuts
              </p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-xs font-bold text-ink-faint">
            LSH26-T033 · P01
            {state.loadedCaseId && (
              <span className="rounded-full bg-panel px-2.5 py-1 text-ink-soft">
                {state.loadedCaseId}
              </span>
            )}
          </p>
        </header>

        <main className="space-y-5">
        <Timeline plan={plan} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <WindowPanel state={state} dispatch={dispatch} />
            <ShopPanel state={state} dispatch={dispatch} />
            <CutsPanel cuts={state.cuts} dispatch={dispatch} />
            <JobsPanel jobs={state.jobs} dispatch={dispatch} />
            <DataPanel state={state} dispatch={dispatch} />
          </div>

          <div className="space-y-5">
            <GeneratorSummary plan={plan} />
            <PlanPanel plan={plan} />
          </div>
        </div>
        </main>

        <footer className="mt-7 border-t border-hairline pt-5 text-xs text-ink-faint">
          Grid jobs are never scheduled inside a power cut. Generator minutes count only the time a
          generator-capable job spends inside a cut.
        </footer>
      </div>
    </div>
  );
}
