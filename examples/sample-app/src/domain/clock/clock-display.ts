/**
 * @fileoverview Public entity of the clock folder — turns a wall-clock Date into
 * a human-readable label, composing the folder's internal formatting helper.
 */
import { formatHoursMinutes } from './format.js';

/** A read-only clock display that renders a given instant as an `HH:MM` label. */
export class ClockDisplay {
  /** Renders the supplied instant as a zero-padded 24-hour label. */
  public label(at: Date): string {
    return formatHoursMinutes(at.getHours(), at.getMinutes());
  }
}
