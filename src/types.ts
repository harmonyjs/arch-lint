/**
 * @fileoverview Canonical shared type contract for arch-lint — config, graph,
 * rules, diagnostics, suppress and baseline. Every module imports its types
 * from here; public-api re-exports the published subset (spec Appendix A).
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

// ── Suppress ─────────────────────────────────────────────────────────────────

export interface ParsedSuppress {
  readonly ruleId: string | null;
  readonly reason: string;
  readonly expiry: Date | null;
  readonly location: Location;
}

export interface SuppressIndex {
  isSuppressed(diagnostic: Diagnostic): boolean;
  findExpired(): readonly ParsedSuppress[];
}
