/**
 * @fileoverview NullLogger — swallows every message; the default in contexts
 * that should stay silent (tests, library use).
 */
import type { Logger } from './types.js';

/** A Logger that discards every message. */
export class NullLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  debug(): void {}
}
