/**
 * @fileoverview Config type vocabulary — the user-facing Config input and the
 * fully-defaulted ResolvedConfig, plus every per-section shape. ResolvedConfig
 * is consumed cross-subsystem; the rest is config-internal lexicon.
 */
import type { Rule } from '../rules/types.js';
import type { Severity } from '../types.js';

export type Pack =
  | 'layers'
  | 'barrels'
  | 'placement'
  | 'perfile'
  | 'hygiene'
  | 'view'
  | 'meta'
  | 'metrics'
  | 'structure';

export interface ProjectConfig {
  readonly tsconfig: string;
  readonly sourceRoot: string;
  readonly cwd: string;
  readonly includeOutOfRoot: boolean;
  readonly rootAlias?: string;
}

export interface ConventionsConfig {
  readonly privateSegment: string;
  readonly sharedSegment: string;
  readonly libSegment: string;
  readonly hooksSegment: string;
  readonly explicitClusterSegment: string;
  readonly modelSegment: string;
  readonly indexFiles: readonly string[];
}

export interface ExplicitPlacementRule {
  readonly path: string;
  readonly cluster: string;
  readonly excludeRules?: readonly string[];
}

export interface ResolveConfig {
  readonly treatTypeOnlyAsEdge: boolean;
  readonly maxResolveDepth: number;
  readonly cacheSize: number;
  readonly extensions: readonly string[];
}

export interface LayerConfig {
  readonly canImport: readonly string[];
  readonly sideEffectOnly?: readonly string[];
}

export type LayersConfig = Readonly<Record<string, LayerConfig>>;

export interface BaselineConfig {
  readonly file: string;
  readonly sortRecords: 'alphabetical';
  readonly missingBehavior: 'error' | 'ignore';
}

export interface SuppressConfig {
  readonly marker: string;
  readonly minReasonLength: number;
  readonly expirySupport: boolean;
  readonly scanLocations: readonly ('leading-comment' | 'jsdoc')[];
  readonly maxDistanceLines: number;
}

export interface ReportCliConfig {
  readonly color: 'auto' | 'always' | 'never';
  readonly showSuggestions: boolean;
  readonly showConsumers: boolean;
  readonly hyperlinks: 'auto' | 'always' | 'never';
  readonly foldLongLists: boolean;
}

export interface ReportConfig {
  readonly cli: ReportCliConfig;
}

export interface WatchRunMode {
  readonly rules: 'all' | readonly string[];
  readonly debounceMs: number;
  readonly clearOnRerun: boolean;
}

export interface PreCommitRunMode {
  readonly rules: 'all' | readonly string[];
  readonly maxDurationMs: number;
  readonly failOnViolations: boolean;
}

export interface CiRunMode {
  readonly failOnViolations: boolean;
}

export interface RunModeConfig {
  readonly watch: WatchRunMode;
  readonly preCommit: PreCommitRunMode;
  readonly ci: CiRunMode;
}

/** A rule entry in user config: a bare severity string OR an options object. */
export type RuleSetting = Severity | RuleSettingObject;

export interface RuleSettingObject {
  readonly severity?: Severity;
  readonly [option: string]: unknown;
}

/** Normalized rule setting (ResolvedConfig only): always an object, severity set. */
export interface ResolvedRuleSetting {
  readonly severity: Severity;
  readonly [option: string]: unknown;
}

/** User-facing config input — only project.tsconfig is required. */
export interface Config {
  project: { tsconfig: string } & Partial<Omit<ProjectConfig, 'tsconfig'>>;
  conventions?: Partial<ConventionsConfig>;
  packs?: readonly Pack[];
  explicitPlacement?: readonly ExplicitPlacementRule[];
  resolve?: Partial<ResolveConfig>;
  layers?: LayersConfig;
  rules?: Readonly<Record<string, RuleSetting>>;
  perFileRules?: Readonly<Record<string, RuleSetting>>;
  ignore?: readonly string[];
  baseline?: Partial<BaselineConfig>;
  suppress?: Partial<SuppressConfig>;
  report?: { cli?: Partial<ReportCliConfig> };
  runMode?: {
    watch?: Partial<WatchRunMode>;
    preCommit?: Partial<PreCommitRunMode>;
    ci?: Partial<CiRunMode>;
  };
  plugins?: readonly Rule[];
}

/** Config with every default applied; hand-written, not Required<Config>. */
export interface ResolvedConfig {
  readonly project: ProjectConfig;
  readonly conventions: ConventionsConfig;
  readonly packs: readonly Pack[];
  readonly explicitPlacement: readonly ExplicitPlacementRule[];
  readonly resolve: ResolveConfig;
  readonly layers: LayersConfig;
  readonly rules: Readonly<Record<string, ResolvedRuleSetting>>;
  readonly perFileRules: Readonly<Record<string, ResolvedRuleSetting>>;
  readonly ignore: readonly string[];
  readonly baseline: BaselineConfig;
  readonly suppress: SuppressConfig;
  readonly report: ReportConfig;
  readonly runMode: RunModeConfig;
  readonly plugins: readonly Rule[];
}
