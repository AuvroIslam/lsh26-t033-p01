import { DAY_MINUTES, formatDuration, formatTime } from '../domain/time';
import type { Plan } from '../domain/types';

const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

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
    <section className="lift rounded-3xl bg-shell p-5 sm:p-7">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-ink">24-hour timeline</h2>
          <p className="mt-0.5 text-sm text-ink-faint">
            Every job placed around today's cuts, on one scale
          </p>
        </div>
        <p className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold tabular-nums text-ink-soft">
          Open {formatTime(window.start)} – {formatTime(window.end)}
        </p>
      </header>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[780px]">
          <div className="relative h-4 pl-28">
            <div className="relative h-full">
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  className="absolute -translate-x-1/2 text-[10px] font-semibold tabular-nums text-ink-faint"
                  style={{ left: percent(hour * 60) }}
                >
                  {String(hour).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>

          <Row label="Power cuts" window={window}>
            {cuts.length === 0 && <Empty>No power cuts entered</Empty>}
            {cuts.map((cut) => (
              <div
                key={`${cut.start}-${cut.end}`}
                className="absolute inset-y-1 flex items-center justify-center overflow-hidden rounded-lg bg-cut text-[11px] font-bold text-white"
                style={{ left: percent(cut.start), width: percent(cut.end - cut.start) }}
                title={`Power cut ${formatTime(cut.start)} to ${formatTime(cut.end)}`}
              >
                <span className="truncate px-1.5 tabular-nums">
                  {formatTime(cut.start)}–{formatTime(cut.end)}
                </span>
              </div>
            ))}
          </Row>

          <Row label="Planned jobs" window={window}>
            {placements.length === 0 && <Empty>Add jobs to build a plan</Empty>}
            {placements.map((placement) =>
              placement.segments.map((segment, index) => (
                <div
                  key={`${placement.job.id}-${index}`}
                  className={[
                    'absolute inset-y-1 flex items-center overflow-hidden text-[11px] font-bold',
                    index === 0 ? 'rounded-l-lg' : '',
                    index === placement.segments.length - 1 ? 'rounded-r-lg' : '',
                    segment.onGenerator
                      ? 'bg-accent text-accent-deep'
                      : placement.job.power === 'grid'
                        ? 'bg-grid text-white'
                        : placement.job.power === 'generator'
                          ? 'bg-gen text-white'
                          : 'bg-idle text-white',
                  ].join(' ')}
                  style={{
                    left: percent(segment.start),
                    width: percent(segment.end - segment.start),
                  }}
                  title={`${placement.job.name} — ${POWER_LABEL[placement.job.power]} — ${formatTime(placement.start)} to ${formatTime(placement.end)}${
                    segment.onGenerator ? ' (on generator)' : ''
                  }`}
                >
                  {index === 0 && <span className="truncate px-2">{placement.job.name}</span>}
                </div>
              )),
            )}
          </Row>

          <Legend />
        </div>
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-ink-faint">
      {children}
    </span>
  );
}

/**
 * One labelled track. Hour gridlines sit behind the bars so a bar's position
 * can be read off the scale, and the hours the shop is shut are dimmed.
 */
function Row({
  label,
  window,
  children,
}: {
  label: string;
  window: { start: number; end: number };
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-4">
      <span className="w-24 shrink-0 text-right text-xs font-bold tracking-wide text-ink-soft uppercase">
        {label}
      </span>
      <div className="relative h-12 flex-1 overflow-hidden rounded-xl bg-panel ring-1 ring-hairline ring-inset">
        {HOURS.slice(1, 24).map((hour) => (
          <span
            key={hour}
            className="absolute inset-y-0 w-px bg-hairline"
            style={{ left: percent(hour * 60) }}
          />
        ))}
        <span
          className="absolute inset-y-0 left-0 bg-ground/70"
          style={{ width: percent(window.start) }}
        />
        <span
          className="absolute inset-y-0 right-0 bg-ground/70"
          style={{ width: percent(DAY_MINUTES - window.end) }}
        />
        {children}
      </div>
    </div>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ['bg-cut', 'Power cut'],
    ['bg-grid', 'Grid job'],
    ['bg-gen', 'Generator-capable job'],
    ['bg-accent', 'Running on the generator'],
    ['bg-idle', 'Needs no power'],
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 pl-28">
      {items.map(([color, label]) => (
        <li key={label} className="flex items-center gap-2 text-xs font-medium text-ink-soft">
          <span className={`inline-block h-2.5 w-5 rounded-full ${color}`} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** R4: the headline number, recomputed from state on every change. */
export function GeneratorSummary({ plan }: { plan: Plan }) {
  const onGenerator = plan.placements.filter((placement) => placement.generatorMinutes > 0);
  return (
    <div className="lift rounded-3xl bg-accent-soft p-6">
      <p className="text-xs font-bold tracking-widest text-accent-deep uppercase">
        Total generator minutes
      </p>
      <p className="mt-2 text-6xl font-extrabold tracking-tight tabular-nums text-ink">
        {plan.totalGeneratorMinutes}
      </p>
      <p className="mt-2 text-sm font-medium text-accent-deep">
        {plan.totalGeneratorMinutes === 0
          ? 'No job needs the generator in this plan.'
          : `${formatDuration(plan.totalGeneratorMinutes)} across ${onGenerator.length} job${
              onGenerator.length === 1 ? '' : 's'
            }.`}
      </p>
      {onGenerator.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-accent/40 pt-4">
          {onGenerator.map((placement) => (
            <li
              key={placement.job.id}
              className="flex items-baseline justify-between gap-3 text-sm font-medium text-accent-deep"
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
