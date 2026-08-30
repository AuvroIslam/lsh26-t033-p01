import { formatDuration, formatTime } from '../domain/time';
import type { Plan } from '../domain/types';
import { Panel } from './Inputs';

const POWER_BADGE: Record<string, { label: string; className: string }> = {
  grid: { label: 'Grid', className: 'bg-sky-100 text-sky-800 ring-sky-200' },
  generator: { label: 'Generator', className: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  none: { label: 'No power', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

/** The finished plan in words, beside the timeline bars (R3). */
export function PlanPanel({ plan }: { plan: Plan }) {
  return (
    <Panel
      title="The plan"
      description={
        plan.placements.length === 0
          ? 'Nothing scheduled yet.'
          : `${plan.placements.length} job${plan.placements.length === 1 ? '' : 's'} scheduled, ${formatDuration(plan.scheduledMinutes)} of work, ${formatDuration(plan.idleMinutes)} idle.`
      }
    >
      {plan.placements.length > 0 && (
        <ol className="divide-y divide-slate-100 border-t border-slate-100">
          {plan.placements.map((placement) => {
            const badge = POWER_BADGE[placement.job.power]!;
            return (
              <li key={placement.job.id} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-slate-900">
                    {placement.job.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-sm text-slate-700">
                    {formatTime(placement.start)} – {formatTime(placement.end)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-xs text-slate-500">{formatDuration(placement.job.minutes)}</span>
                  {placement.generatorMinutes > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                      {placement.generatorMinutes} generator min
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{placement.note}</p>
              </li>
            );
          })}
        </ol>
      )}

      {plan.unplaced.length > 0 && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <h3 className="text-sm font-semibold text-rose-900">
            Could not be scheduled ({plan.unplaced.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {plan.unplaced.map((entry) => (
              <li key={entry.job.id} className="text-sm">
                <span className="font-medium text-rose-900">{entry.job.name}</span>
                <span className="text-rose-700"> · {formatDuration(entry.job.minutes)}</span>
                <p className="text-xs text-rose-700">{entry.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
