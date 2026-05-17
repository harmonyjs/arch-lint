/**
 * @fileoverview Application entry point — wires the domain greeting service and
 * the Clock component into a single line of program output.
 */
import { ClockDisplay } from '../domain/clock/index.js';
import { greet } from '../domain/greeting-service.js';
import { padTwo } from '../support/numbers.js';

/** Composes the greeting, the current clock label and a day-of-month stamp. */
export function run(name: string, now: Date): string {
  const clock = new ClockDisplay();
  return `${greet(name)} It is ${clock.label(now)} on day ${padTwo(now.getDate())}.`;
}
