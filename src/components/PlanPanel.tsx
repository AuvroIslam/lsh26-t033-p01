import { formatDuration, formatTime } from '../domain/time';
import type { Plan } from '../domain/types';
import { CalendarCheck } from 'lucide-react';

import { Panel } from './Inputs';

const POWER_BADGE: Record<string, { label: string; className: string }> = {
  grid: { label: 'Grid', className: 'bg-grid-soft text-grid-deep' },
  generator: { label: 'Generator', className: 'bg-gen-soft text-gen-deep' },
  none: { label: 'No power', className: 'bg-panel text-ink-soft' },
};

/** The finished plan in words, beside the timeline bars (R3). */
export function PlanPanel({ plan }: { plan: Plan }) {
  return (
    <Panel
      title="The plan"
      icon={CalendarCheck}
      description={
        plan.placements.length === 0
          ? 'Nothing scheduled yet.'
          : `${plan.placements.length} job${plan.placements.length === 1 ? '' : 's'} scheduled across ${plan.machines} machine${plan.machines === 1 ? '' : 's'}, ${formatDuration(plan.scheduledMinutes)} of work, ${formatDuration(plan.idleMinutes)} idle.`
      }
    >
      {plan.placements.length === 0 && plan.unplaced.length === 0 && (
        <div className="flex flex-col items-center px-4 py-6 text-center">
          <img
            src={`${import.meta.env.BASE_URL}mascot.png`}
            alt=""
            aria-hidden="true"
            className="w-44 max-w-full"
          />
          <p className="mt-4 max-w-xs text-sm font-medium text-ink-faint">
            Add today's power cuts and the jobs waiting to be done, and the plan appears here.
          </p>
        </div>
      )}

      {plan.placements.length > 0 && (
        <ol className="divide-y divide-hairline border-t border-hairline">
          {plan.placements.map((placement) => {
            const badge = POWER_BADGE[placement.job.power]!;
            return (
              <li key={placement.job.id} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-bold text-ink">
                    {placement.job.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-soft">
                    {formatTime(placement.start)} – {formatTime(placement.end)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-xs font-medium text-ink-faint">{formatDuration(placement.job.minutes)}</span>
                  {placement.generatorMinutes > 0 && (
                    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent-deep">
                      {placement.generatorMinutes} generator min
                    </span>
                  )}
                  {plan.machines > 1 && (
                    <span className="rounded-full bg-panel px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
                      Machine {placement.machine + 1}
                    </span>
                  )}
                  {placement.job.urgent && (
                    <span className="rounded-full bg-cut-soft px-2.5 py-0.5 text-[11px] font-bold text-cut-deep">
                      Rush
                    </span>
                  )}
                  {placement.slackMinutes !== null && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        placement.slackMinutes < 60
                          ? 'bg-cut-soft text-cut-deep'
                          : 'bg-gen-soft text-gen-deep'
                      }`}
                    >
                      {placement.slackMinutes} min before promised
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-ink-faint">{placement.note}</p>
              </li>
            );
          })}
        </ol>
      )}

      {plan.unplaced.length > 0 && (
        <div className="mt-5 rounded-2xl bg-cut-soft p-4">
          <h3 className="text-sm font-extrabold text-cut-deep">
            Could not be scheduled ({plan.unplaced.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {plan.unplaced.map((entry) => (
              <li key={entry.job.id} className="text-sm">
                <span className="font-bold text-cut-deep">{entry.job.name}</span>
                <span className="text-cut-deep/80"> · {formatDuration(entry.job.minutes)}</span>
                <p className="mt-0.5 text-xs text-cut-deep/80">{entry.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
