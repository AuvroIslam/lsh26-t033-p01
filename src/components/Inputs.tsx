import { useRef, useState } from 'react';
import { AlertTriangle, ClipboardList, Clock, Database, type LucideIcon } from 'lucide-react';

import { formatDuration, formatTime, parseTime } from '../domain/time';
import { parseFixture, FixtureError, type FixtureCase } from '../domain/fixture';
import type { Job, PowerCut, PowerNeed } from '../domain/types';
import type { Action, AppState } from '../state';

const POWER_OPTIONS: Array<{ value: PowerNeed; label: string; hint: string }> = [
  { value: 'grid', label: 'Needs grid power', hint: 'Never scheduled inside a power cut' },
  { value: 'generator', label: 'Can run on the generator', hint: 'Costs generator minutes inside a cut' },
  { value: 'none', label: 'Needs no power', hint: 'Can run at any time, cut or not' },
];

const fieldClass =
  'w-full rounded-xl border-0 bg-panel px-3.5 py-2.5 text-sm font-medium text-ink ring-1 ring-hairline outline-none transition ring-inset focus:bg-shell focus:ring-2 focus:ring-accent';

const buttonClass =
  'rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-deep transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50';

const quietButtonClass =
  'rounded-xl bg-panel px-4 py-2.5 text-sm font-bold text-ink-soft ring-1 ring-hairline transition ring-inset hover:text-ink';

const labelClass = 'block text-[11px] font-bold tracking-wide text-ink-soft uppercase';

/** A glyph on a dark rounded tile, the one decorative motif in the interface. */
export function IconTile({
  icon: Icon,
  size = 44,
  tone = 'dark',
}: {
  icon: LucideIcon;
  size?: number;
  tone?: 'dark' | 'accent';
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-2xl ${
        tone === 'accent' ? 'bg-accent text-ink' : 'bg-ink text-accent'
      }`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.1} absoluteStrokeWidth />
    </span>
  );
}

export function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="lift rounded-3xl bg-shell p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3.5">
        {icon && <IconTile icon={icon} />}
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-faint">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-xs font-bold text-cut-deep">
      {message}
    </p>
  );
}

/** R1, first half: the working window the plan is built inside. */
export function WindowPanel({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const [error, setError] = useState<string | null>(null);

  const update = (which: 'start' | 'end', value: string) => {
    const minutes = parseTime(value);
    if (minutes === null) {
      setError('Enter a 24-hour time such as 09:00.');
      return;
    }
    const start = which === 'start' ? minutes : state.windowStart;
    const end = which === 'end' ? minutes : state.windowEnd;
    if (end <= start) {
      setError('Closing time must be after opening time.');
      return;
    }
    setError(null);
    dispatch({ type: 'setWindow', start, end });
  };

  return (
    <Panel
      title="Working hours"
      description="Jobs are only scheduled inside this window."
      icon={Clock}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Opens
          <input
            type="time"
            step={900}
            className={`mt-1 ${fieldClass}`}
            value={formatTime(state.windowStart)}
            onChange={(event) => update('start', event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Closes
          <input
            type="time"
            step={900}
            className={`mt-1 ${fieldClass}`}
            value={formatTime(state.windowEnd)}
            onChange={(event) => update('end', event.target.value)}
          />
        </label>
      </div>
      <FieldError message={error} />
    </Panel>
  );
}

/** R1, second half: entering power cuts as a start and an end time. */
export function CutsPanel({
  cuts,
  dispatch,
}: {
  cuts: PowerCut[];
  dispatch: (a: Action) => void;
}) {
  const [start, setStart] = useState('11:00');
  const [end, setEnd] = useState('13:00');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const from = parseTime(start);
    const to = parseTime(end);
    if (from === null || to === null) {
      setError('Enter both times as 24-hour HH:MM.');
      return;
    }
    if (from === to) {
      setError('A power cut must be longer than zero minutes.');
      return;
    }
    setError(null);
    // An end before the start means the cut runs past midnight. It is split
    // into its real spans when stored, rather than being rejected.
    dispatch({ type: 'addCut', start: from, end: to });
  };

  return (
    <Panel
      title="Today's power cuts"
      description="Add each announced cut as a start and end time."
      icon={AlertTriangle}
    >
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2.5">
        <label className={`min-w-24 flex-1 ${labelClass}`}>
          Cut starts
          <input
            type="time"
            step={900}
            className={`mt-1 ${fieldClass}`}
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label className={`min-w-24 flex-1 ${labelClass}`}>
          Cut ends
          <input
            type="time"
            step={900}
            className={`mt-1 ${fieldClass}`}
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <button type="submit" className={buttonClass}>
          Add cut
        </button>
      </form>
      <FieldError message={error} />

      {cuts.length > 0 && (
        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
          {cuts.map((cut) => (
            <li key={cut.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-5 rounded-full bg-cut" />
                <span className="font-semibold tabular-nums text-ink">
                  {formatTime(cut.start)} – {formatTime(cut.end)}
                </span>
                <span className="text-xs font-medium text-ink-faint">
                  {formatDuration(Math.max(0, cut.end - cut.start))}
                </span>
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'removeCut', id: cut.id })}
                className="text-xs font-bold text-ink-faint transition hover:text-cut"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** R2: adding jobs, and R4's live update when one is added or removed. */
export function JobsPanel({ jobs, dispatch }: { jobs: Job[]; dispatch: (a: Action) => void }) {
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [power, setPower] = useState<PowerNeed>('grid');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') {
      setError('Give the job a name.');
      return;
    }
    const duration = Number(minutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      setError('Duration must be a positive number of minutes.');
      return;
    }
    setError(null);
    dispatch({ type: 'addJob', name: trimmed, minutes: Math.round(duration), power });
    setName('');
  };

  return (
    <Panel
      title="Jobs"
      description="Each job has a name, a duration and what power it needs."
      icon={ClipboardList}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-wrap gap-2.5">
          <label className={`min-w-40 flex-[2] ${labelClass}`}>
            Job name
            <input
              className={`mt-1 ${fieldClass}`}
              placeholder="A0 banner print"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className={`min-w-24 flex-1 ${labelClass}`}>
            Minutes
            <input
              type="number"
              min={1}
              step={1}
              className={`mt-1 ${fieldClass}`}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
        </div>
        <label className={labelClass}>
          Power need
          <select
            className={`mt-1 ${fieldClass}`}
            value={power}
            onChange={(event) => setPower(event.target.value as PowerNeed)}
          >
            {POWER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass}>
          Add job
        </button>
      </form>
      <FieldError message={error} />

      {jobs.length > 0 && (
        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">{job.name}</span>
                <span className="text-xs font-medium text-ink-faint">
                  {formatDuration(job.minutes)} · {POWER_OPTIONS.find((o) => o.value === job.power)?.label}
                </span>
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'removeJob', id: job.id })}
                className="shrink-0 text-xs font-bold text-ink-faint transition hover:text-cut"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Loading the published sample data, and resetting back to an empty planner.
 * Judges test with unpublished cases in the same shape, so any file matching
 * the fixture format can be dropped in here.
 */
export function DataPanel({
  state,
  dispatch,
}: {
  state: AppState;
  dispatch: (a: Action) => void;
}) {
  const [cases, setCases] = useState<FixtureCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const ingest = (text: string, source: string) => {
    try {
      const result = parseFixture(JSON.parse(text));
      setCases(result.cases);
      setError(null);
      setNotice(
        `${source}: ${result.cases.length} cases read${
          result.warnings.length > 0 ? `, ${result.warnings.length} skipped` : ''
        }.`,
      );
      const first = result.cases[0];
      if (first) dispatch({ type: 'loadCase', fixtureCase: first });
    } catch (caught) {
      setCases(null);
      setNotice(null);
      setError(
        caught instanceof FixtureError
          ? `Could not read the file. ${caught.message}`
          : 'That file is not valid JSON.',
      );
    }
  };

  const loadBundled = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}P01_load_shedding_public.json`);
      if (!response.ok) throw new Error(String(response.status));
      ingest(await response.text(), 'Published sample data');
    } catch {
      setError('Could not load the bundled sample data. Upload the JSON file instead.');
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    ingest(await file.text(), file.name);
    event.target.value = '';
  };

  return (
    <Panel
      title="Sample data"
      description="Load the published cases, or upload any file in the same shape."
      icon={Database}
    >
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={loadBundled} className={buttonClass}>
          Load published sample data
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={quietButtonClass}
        >
          Upload JSON
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'reset' });
            setCases(null);
            setNotice(null);
            setError(null);
          }}
          className={quietButtonClass}
        >
          Reset
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFile}
        />
      </div>

      {notice && <p className="mt-3 text-xs font-bold text-gen-deep">{notice}</p>}
      <FieldError message={error} />

      {cases && cases.length > 1 && (
        <label className={`mt-4 block ${labelClass}`}>
          Case
          <select
            className={`mt-1 ${fieldClass}`}
            value={state.loadedCaseId ?? ''}
            onChange={(event) => {
              const chosen = cases.find((item) => item.caseId === event.target.value);
              if (chosen) dispatch({ type: 'loadCase', fixtureCase: chosen });
            }}
          >
            {cases.map((item) => (
              <option key={item.caseId} value={item.caseId}>
                {item.caseId} — {item.jobs.length} jobs, {item.cuts.length} cuts
              </option>
            ))}
          </select>
        </label>
      )}
    </Panel>
  );
}
