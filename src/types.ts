/**
 * @fileoverview Canonical shared type contract for arch-lint — config, graph,
 * rules, diagnostics, suppress and baseline. Every module imports its types
 * from here; public-api re-exports the published subset (spec Appendix A).
 */
import type { Project } from 'ts-morph';
import type { Pack, ResolvedConfig } from './config/types.js';

// ── Primitives ───────────────────────────────────────────────────────────────

export type Severity = 'off' | 'info' | 'warning' | 'error';

/** Severity of a rule that is actually executed ('off' rules never run). */
export type ActiveSeverity = Exclude<Severity, 'off'>;

/** How a rule computes — an axis orthogonal to its pack. */
export type RuleEngine = 'structural' | 'syntactic' | 'perfile' | 'manifest' | 'meta';

// ── Graph ────────────────────────────────────────────────────────────────────

export interface Location {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

export interface Node {
  readonly id: string;
  readonly kind: 'file' | 'folder';
  readonly isEntity: boolean;
  readonly placementMode: 'reactive' | 'explicit';
  readonly cluster?: string;
}

export interface Edge {
  readonly consumer: string;
  readonly producer: string;
  readonly symbol: string;
  readonly typeOnly: boolean;
  readonly syntacticPath?: string;
}

export type UnresolvedReason =
  | 'ambiguous-wildcard'
  | 'alias-unresolved'
  | 'depth-exceeded'
  | 'parse-error'
  | 'missing';

export interface UnresolvedImport {
  readonly file: string;
  readonly specifier: string;
  readonly symbol: string;
  readonly location: Location;
  readonly reason: UnresolvedReason;
}

export interface ConsumerGraph {
  readonly nodes: ReadonlyMap<string, Node>;
  readonly edges: readonly Edge[];
  readonly consumersOf: ReadonlyMap<string, readonly Edge[]>;
  readonly producersOf: ReadonlyMap<string, readonly Edge[]>;
  readonly entityConsumersOf: ReadonlyMap<string, readonly string[]>;
  readonly unresolved: readonly UnresolvedImport[];
  readonly builtAt: Date;
  readonly rootDir: string;
}

/** Internal transit type of the resolver; not exported from public-api. */
export type Resolution =
  | {
      readonly kind: 'resolved';
      readonly file: string;
      readonly symbol: string;
      readonly typeOnly: boolean;
    }
  | { readonly kind: 'external' }
  | { readonly kind: 'unresolved'; readonly reason: UnresolvedReason }
  | { readonly kind: 'cycle' };

// ── Rules ────────────────────────────────────────────────────────────────────

export interface Rule<TOptions = unknown> {
  readonly id: string;
  readonly pack: Pack;
  readonly engine: RuleEngine;
  readonly defaultSeverity: ActiveSeverity;
  readonly check: (
    graph: ConsumerGraph,
    config: ResolvedConfig,
    context: RuleContext<TOptions>,
  ) => Diagnostic[];
}

export interface RuleContext<TOptions = unknown> {
  readonly ruleId: string;
  readonly severity: ActiveSeverity;
  readonly options: TOptions;
  readonly suppress: SuppressIndex;
  /**
   * Parsed source project (decision D9). Syntactic and perfile rules read AST
   * from it (e.g. external imports, which are absent from ConsumerGraph). The
   * engine populates it once per run; structural and meta rules ignore it.
   */
  readonly project: Project;
}

// ── Diagnostics ──────────────────────────────────────────────────────────────

export interface ConsumerInfo {
  readonly file: string;
  readonly symbol: string;
  readonly importPath: string;
  readonly resolved: string;
  readonly location: Location;
}

export interface Suggestion {
  readonly action: 'move' | 'inline' | 'split' | 'add-barrel' | 'remove-suppress' | 'custom';
  readonly target?: string;
  readonly rationale: string;
}

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

// ── Baseline ─────────────────────────────────────────────────────────────────

export interface BaselineRecord {
  readonly ruleId: string;
  readonly entity: string;
  readonly fingerprint?: string;
  readonly firstSeenAt?: string;
  readonly note?: string;
}

export interface BaselineFile {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly generatorVersion: string;
  readonly records: readonly BaselineRecord[];
}

// ── Runner ───────────────────────────────────────────────────────────────────

export interface CheckResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly summary: {
    readonly total: number;
    readonly bySeverity: Record<ActiveSeverity, number>;
    readonly new: number;
    readonly inBaseline: number;
  };
  readonly exitCode: 0 | 1;
}
