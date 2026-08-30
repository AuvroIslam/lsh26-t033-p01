import { DAY_MINUTES, formatDuration, formatTime } from '../domain/time';
import type { Plan } from '../domain/types';

const HOUR_TICKS = Array.from({ length: 25 }, (_, hour) => hour);

const percent = (minutes: number): string => `${(minutes / DAY_MINUTES) * 100}%`;

const POWER_LABEL: Record<string, string> = {
  grid: 'Grid power',
  generator: 'Generator capable',
  none: 'No power needed',
};

/**
 * The full 24-hour timeline: cut bars on one row, the finished plan on the row
 * directly beneath so the two line up minute for minute (R1 and R3).
 */
export function Timeline({ plan }: { plan: Plan }) {
  const { window, cuts, placements } = plan;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">24-hour timeline</h2>
        <p className="text-xs text-slate-500">
          Working window {formatTime(window.start)} to {formatTime(window.end)}
        </p>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Hour scale */}
          <div className="relative h-5">
            {HOUR_TICKS.map((hour) => (
              <span
                key={hour}
                className="absolute -translate-x-1/2 text-[10px] tabular-nums text-slate-400"
                style={{ left: percent(hour * 60) }}
              >
                {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
              </span>
            ))}
          </div>

          <Row label="Power cuts">
            {cuts.length === 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                No power cuts entered
              </span>
            )}
            {cuts.map((cut) => (
              <div
                key={`${cut.start}-${cut.end}`}
                className="absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-md bg-rose-500/85 text-[10px] font-medium text-white"
                style={{ left: percent(cut.start), width: percent(cut.end - cut.start) }}
                title={`Power cut ${formatTime(cut.start)} to ${formatTime(cut.end)}`}
              >
                <span className="truncate px-1">
                  {formatTime(cut.start)}–{formatTime(cut.end)}
                </span>
              </div>
            ))}
          </Row>

          <Row label="Planned jobs">
            {placements.length === 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                Add jobs to build a plan
              </span>
            )}
            {placements.map((placement) =>
              placement.segments.map((segment, index) => (
                <div
                  key={`${placement.job.id}-${index}`}
                  className={[
                    'absolute inset-y-0 flex items-center overflow-hidden border-y text-[10px] font-medium',
                    index === 0 ? 'rounded-l-md border-l' : '',
                    index === placement.segments.length - 1 ? 'rounded-r-md border-r' : '',
                    segment.onGenerator
                      ? 'border-amber-600 bg-amber-400 text-amber-950'
                      : placement.job.power === 'grid'
                        ? 'border-sky-700 bg-sky-500 text-white'
                        : placement.job.power === 'generator'
                          ? 'border-emerald-700 bg-emerald-500 text-white'
                          : 'border-slate-500 bg-slate-400 text-white',
                  ].join(' ')}
                  style={{
                    left: percent(segment.start),
                    width: percent(segment.end - segment.start),
                  }}
                  title={`${placement.job.name} — ${POWER_LABEL[placement.job.power]} — ${formatTime(placement.start)} to ${formatTime(placement.end)}${
                    segment.onGenerator ? ' (on generator)' : ''
                  }`}
                >
                  {index === 0 && (
                    <span className="truncate px-1.5">{placement.job.name}</span>
                  )}
                </div>
              )),
            )}
          </Row>

          {/* Shading for the hours the shop is shut */}
          <div className="relative mt-1 h-1">
            <div
              className="absolute inset-y-0 rounded-full bg-slate-900/70"
              style={{
                left: percent(window.start),
                width: percent(Math.max(0, window.end - window.start)),
              }}
              title="Working window"
            />
          </div>
        </div>
      </div>

      <Legend />
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-600">{label}</span>
      <div className="relative h-8 flex-1 rounded-md bg-slate-100 ring-1 ring-inset ring-slate-200">
        {children}
      </div>
    </div>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ['bg-rose-500/85', 'Power cut'],
    ['bg-sky-500', 'Grid job'],
    ['bg-emerald-500', 'Generator-capable job'],
    ['bg-amber-400', 'Running on the generator'],
    ['bg-slate-400', 'Needs no power'],
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 pl-0 sm:pl-27">
      {items.map(([color, label]) => (
        <li key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className={`inline-block h-2.5 w-4 rounded-sm ${color}`} />
          {label}
        </li>
      ))}
    </ul>
  );
}

export function GeneratorSummary({ plan }: { plan: Plan }) {
  const onGenerator = plan.placements.filter((placement) => placement.generatorMinutes > 0);
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-5">
      <p className="text-xs font-medium tracking-wide text-amber-800 uppercase">
        Total generator minutes
      </p>
      <p className="mt-1 text-4xl font-semibold tabular-nums text-amber-950">
        {plan.totalGeneratorMinutes}
      </p>
      <p className="mt-1 text-sm text-amber-900">
        {plan.totalGeneratorMinutes === 0
          ? 'No job needs the generator in this plan.'
          : `${formatDuration(plan.totalGeneratorMinutes)} across ${onGenerator.length} job${
              onGenerator.length === 1 ? '' : 's'
            }.`}
      </p>
      {onGenerator.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-amber-200 pt-3">
          {onGenerator.map((placement) => (
            <li
              key={placement.job.id}
              className="flex items-baseline justify-between gap-3 text-sm text-amber-900"
            >
              <span className="truncate">{placement.job.name}</span>
              <span className="shrink-0 tabular-nums">{placement.generatorMinutes} min</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
