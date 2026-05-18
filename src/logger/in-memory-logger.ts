/**
 * @fileoverview InMemoryLogger — accumulates messages in an array so tests can
 * assert on what was logged.
 */
import type { Logger } from './types.js';

/** A single recorded log message. */
export interface LogEntry {
  readonly level: 'info' | 'warn' | 'error' | 'debug';
  readonly message: string;
}

/** A Logger that records every message for later assertion. */
export class InMemoryLogger implements Logger {
  readonly entries: LogEntry[] = [];
  info(message: string): void {
    this.entries.push({ level: 'info', message });
  }
  warn(message: string): void {
    this.entries.push({ level: 'warn', message });
  }
  error(message: string): void {
    this.entries.push({ level: 'error', message });
  }
  debug(message: string): void {
    this.entries.push({ level: 'debug', message });
  }
}
