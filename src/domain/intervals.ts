/** A half-open span `[start, end)` in minutes from midnight. */
export interface Interval {
  start: number;
  end: number;
}

export const length = (interval: Interval): number =>
  Math.max(0, interval.end - interval.start);

/**
 * Sorts and merges a set of spans so that no two overlap or touch.
 * Touching spans are merged too (`10:00-11:00` and `11:00-12:00` become one),
 * because for scheduling purposes they are a single uninterrupted block.
 */
export function normalize(intervals: readonly Interval[]): Interval[] {
  const usable = intervals.filter((i) => length(i) > 0).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const current of usable) {
    const last = merged[merged.length - 1];
    if (last && current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }
  return merged;
}

/** The parts of `interval` that also fall inside one of `others`. */
export function intersect(interval: Interval, others: readonly Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const other of normalize(others)) {
    const start = Math.max(interval.start, other.start);
    const end = Math.min(interval.end, other.end);
    if (end > start) result.push({ start, end });
  }
  return result;
}

/** The parts of `interval` left once every span in `others` is removed. */
export function subtract(interval: Interval, others: readonly Interval[]): Interval[] {
  const result: Interval[] = [];
  let cursor = interval.start;
  for (const other of normalize(others)) {
    if (other.end <= cursor) continue;
    if (other.start >= interval.end) break;
    if (other.start > cursor) result.push({ start: cursor, end: Math.min(other.start, interval.end) });
    cursor = Math.max(cursor, other.end);
    if (cursor >= interval.end) break;
  }
  if (cursor < interval.end) result.push({ start: cursor, end: interval.end });
  return result;
}

/** Total minutes of `interval` that overlap any span in `others`. */
export function overlapMinutes(interval: Interval, others: readonly Interval[]): number {
  return intersect(interval, others).reduce((sum, part) => sum + length(part), 0);
}

/**
 * Splits a span that runs past midnight into the one or two real spans it
 * covers. A cut entered as `22:00`–`02:00` is a genuine overnight cut, so it
 * becomes `22:00`–`24:00` plus `00:00`–`02:00` rather than being rejected.
 */
export function splitOvernight(start: number, end: number, dayMinutes: number): Interval[] {
  if (end > start) return [{ start, end }];
  if (end === start) return [];
  return [
    { start, end: dayMinutes },
    { start: 0, end },
  ];
}
