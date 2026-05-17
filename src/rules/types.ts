/**
 * @fileoverview Rules type vocabulary — the Rule contract every rule implements,
 * the RuleContext the engine threads through, and CheckResult, the engine's output.
 */
import type { Project } from 'ts-morph';
import type { ConsumerGraph } from '../graph/types.js';
import type { Pack, ResolvedConfig } from '../config/types.js';
import type { SuppressIndex } from '../suppress/types.js';
import type { ActiveSeverity, Diagnostic, Location } from '../types.js';

/** How a rule computes — an axis orthogonal to its pack. */
export type RuleEngine = 'structural' | 'syntactic' | 'perfile' | 'manifest' | 'meta';

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
