/**
 * @fileoverview Rules type vocabulary — the Rule contract every rule implements,
 * the RuleContext the engine threads through, and CheckResult, the classified
 * outcome of a check run that the runner assembles from the engine's diagnostics.
 */
import type { Project } from 'ts-morph';
import type { Pack, ResolvedConfig } from '../config/types.js';
import type { ConsumerGraph } from '../graph/types.js';
import type { SuppressIndex } from '../suppress/types.js';
import type { ActiveSeverity, Diagnostic, Location } from '../types.js';
import type { NpmrcDoc } from './hygiene/support/npmrc.js';
import type { PackageJsonDoc } from './hygiene/support/package-json.js';
import type { EffectiveTsconfig } from './hygiene/support/tsconfig-effective.js';

/** How a rule computes — an axis orthogonal to its pack. */
export type RuleEngine = 'graph' | 'syntactic' | 'manifest';

/** The three project manifests, each parsed once per run; null when absent on disk. */
export interface ManifestBundle {
  readonly packageJson: PackageJsonDoc | null;
  readonly npmrc: NpmrcDoc | null;
  readonly tsconfig: EffectiveTsconfig | null;
}

/** Fields shared by every rule variant, regardless of engine. */
interface RuleBase<TOptions = unknown> {
  readonly id: string;
  readonly pack: Pack;
  readonly defaultSeverity: ActiveSeverity;
  readonly options?: TOptions;
}

/** A rule that reads the frozen ConsumerGraph (structural traversal, meta checks). */
export interface GraphRule<TOptions = unknown> extends RuleBase<TOptions> {
  readonly engine: 'graph';
  readonly check: (
    graph: ConsumerGraph,
    config: ResolvedConfig,
    context: GraphRuleContext<TOptions>,
  ) => Diagnostic[];
}

/** A rule that reads file AST from the ts-morph project (syntactic, per-file checks). */
export interface SyntacticRule<TOptions = unknown> extends RuleBase<TOptions> {
  readonly engine: 'syntactic';
  readonly check: (
    graph: ConsumerGraph,
    config: ResolvedConfig,
    context: SyntacticRuleContext<TOptions>,
  ) => Diagnostic[];
}

/** A rule that reads the parsed project manifests and nothing else. */
export interface ManifestRule<TOptions = unknown> extends RuleBase<TOptions> {
  readonly engine: 'manifest';
  readonly check: (context: ManifestRuleContext<TOptions>) => Diagnostic[];
}

/** A rule — a discriminated union over `engine`. */
export type Rule<TOptions = unknown> =
  | GraphRule<TOptions>
  | SyntacticRule<TOptions>
  | ManifestRule<TOptions>;

/** Fields shared by every rule-context variant. */
interface RuleContextBase<TOptions = unknown> {
  readonly ruleId: string;
  readonly severity: ActiveSeverity;
  readonly options: TOptions;
}

/** Context threaded into a GraphRule — carries the suppress index. */
export interface GraphRuleContext<TOptions = unknown> extends RuleContextBase<TOptions> {
  readonly suppress: SuppressIndex;
}

/** Context threaded into a SyntacticRule — adds the parsed source project. */
export interface SyntacticRuleContext<TOptions = unknown> extends RuleContextBase<TOptions> {
  readonly suppress: SuppressIndex;
  /**
   * Parsed source project. Syntactic rules read AST from it (e.g. external
   * imports, which are absent from ConsumerGraph). The engine populates it once
   * per run.
   */
  readonly project: Project;
}

/** Context threaded into a ManifestRule — carries the parsed manifests and project root. */
export interface ManifestRuleContext<TOptions = unknown> extends RuleContextBase<TOptions> {
  readonly manifests: ManifestBundle;
  readonly cwd: string;
}

/** The default RuleContext alias — the syntactic variant, used by test-support factories. */
export type RuleContext<TOptions = unknown> = SyntacticRuleContext<TOptions>;

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
