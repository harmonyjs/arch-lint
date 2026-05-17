/**
 * @fileoverview Internal time-formatting helper of the clock folder — a folder
 * internal that callers reach only through the clock barrel, never directly.
 */

/** Formats hours and minutes as a zero-padded 24-hour `HH:MM` string. */
export function formatHoursMinutes(hours: number, minutes: number): string {
  const hh = hours < 10 ? `0${hours}` : String(hours);
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hh}:${mm}`;
}
