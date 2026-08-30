/** Minutes in one day. A timeline position is always minutes from 00:00. */
export const DAY_MINUTES = 24 * 60;

/**
 * Parses a 24-hour `HH:MM` string into minutes from midnight.
 * Returns `null` for anything that is not a valid time, so callers can show a
 * field error instead of silently scheduling against a wrong number.
 * `24:00` is accepted and means the end of the day (1440).
 */
export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (minutes > 59) return null;
  if (hours === 24 && minutes === 0) return DAY_MINUTES;
  if (hours > 23) return null;
  return hours * 60 + minutes;
}

/** Formats minutes from midnight as `HH:MM`. 1440 renders as `24:00`. */
export function formatTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(DAY_MINUTES, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** Formats a duration in minutes as `2h 30m`, `45m` or `3h`. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
