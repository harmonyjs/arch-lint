/**
 * @fileoverview Cross-cutting type lexicon for arch-lint — the thin set of types
 * shared by two or more independent subsystems. Diagnostic is the shared finding
 * shape; Severity and Location are reused project-wide. Subsystem-specific types
 * live in that subsystem's own types.ts. The back-import of ConsumerInfo and
 * Suggestion is deliberate: they are rules-authored sub-shapes of Diagnostic.
 */
import type { ConsumerInfo, Suggestion } from './rules/types.js';

// ── Primitives ───────────────────────────────────────────────────────────────

export type Severity = 'off' | 'info' | 'warning' | 'error';

/** Severity of a rule that is actually executed ('off' rules never run). */
export type ActiveSeverity = Exclude<Severity, 'off'>;

// ── Graph ────────────────────────────────────────────────────────────────────

export interface Location {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

// ── Diagnostics ──────────────────────────────────────────────────────────────

export interface Diagnostic {
  readonly ruleId: string;
  readonly severity: ActiveSeverity;
  readonly entity: string;
  readonly fingerprint?: string;
  readonly status?: 'new' | 'inBaseline';
  readonly message: string;
  readonly expected?: string;
  readonly actual: string;
  readonly consumers?: readonly ConsumerInfo[];
  readonly reason: string;
  readonly suggestions: readonly Suggestion[];
  readonly location: Location;
  readonly typeOnly?: boolean;
}

// ── Entity resolution ────────────────────────────────────────────────────────

/**
 * The graph↔suppress boundary contract: graph/ implements it, suppress/ consumes
 * it. Suppress depends on this interface, never on the graph's entity model
 * directly; tests supply a hand-written mock.
 */
export interface SuppressEntity {
  readonly id: string;
  readonly name: string;
  readonly entryFilePath: string;
}
export interface EntityResolver {
  /** Every placement entity the suppress index should parse decision data for. */
  listEntities(): readonly SuppressEntity[];
}
