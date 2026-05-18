/**
 * @fileoverview ConsoleLogger — writes every level to process.stderr, the
 * default sink for arch-lint runs.
 */
import type { Logger } from './types.js';

/** A Logger that writes every level, verbatim, to process.stderr. */
export class ConsoleLogger implements Logger {
  info(message: string): void {
    process.stderr.write(`${message}\n`);
  }
  warn(message: string): void {
    process.stderr.write(`${message}\n`);
  }
  error(message: string): void {
    process.stderr.write(`${message}\n`);
  }
  debug(message: string): void {
    process.stderr.write(`${message}\n`);
  }
}
