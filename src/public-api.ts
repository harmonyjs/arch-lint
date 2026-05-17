/**
 * @fileoverview Public API surface of @avavilov/arch-lint — the single package
 * entry point re-exporting the published types and functions. The internal
 * Resolution type and the config helper modules are intentionally not
 * re-exported.
 */

export { resolveConfig } from './config/resolve-defaults.js';
// ── Functions ────────────────────────────────────────────────────────────────
export { defineConfig } from './define-config.js';
export { buildGraph } from './graph/build.js';
export { check } from './runner/index.js';

// ── Types: config ────────────────────────────────────────────────────────────
export type {
  BaselineConfig,
  CiRunMode,
  Config,
  ConventionsConfig,
  ExplicitPlacementRule,
  LayerConfig,
  LayersConfig,
  Pack,
  PreCommitRunMode,
  ProjectConfig,
  ReportCliConfig,
  ReportConfig,
  ResolveConfig,
  ResolvedConfig,
  ResolvedRuleSetting,
  RuleSetting,
  RuleSettingObject,
  RunModeConfig,
  WatchRunMode,
} from './config/types.js';

// ── Types: graph (Resolution excluded — internal resolver helper) ────────────
export type {
  ConsumerGraph,
  Edge,
  Node,
  UnresolvedImport,
  UnresolvedReason,
} from './graph/types.js';

// ── Types: baseline ──────────────────────────────────────────────────────────
export type { BaselineFile, BaselineRecord } from './baseline/types.js';

// ── Types: core ──────────────────────────────────────────────────────────────
export type {
  ActiveSeverity,
  // Runner
  CheckResult,
  // Diagnostics
  ConsumerInfo,
  Diagnostic,
  // Graph
  Location,
  // Suppress
  ParsedSuppress,
  // Rules
  Rule,
  RuleContext,
  RuleEngine,
  // Primitives
  Severity,
  Suggestion,
  SuppressIndex,
} from './types.js';
