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

// ── Types (Resolution excluded — internal resolver helper) ───────────────────
export type {
  ActiveSeverity,
  BaselineConfig,
  BaselineFile,
  // Baseline
  BaselineRecord,
  // Runner
  CheckResult,
  CiRunMode,
  Config,
  ConsumerGraph,
  // Diagnostics
  ConsumerInfo,
  ConventionsConfig,
  Diagnostic,
  Edge,
  ExplicitPlacementRule,
  LayerConfig,
  LayersConfig,
  // Graph
  Location,
  Node,
  // Primitives
  Pack,
  // Suppress
  ParsedSuppress,
  PreCommitRunMode,
  // Config
  ProjectConfig,
  ReportCliConfig,
  ReportConfig,
  ResolveConfig,
  ResolvedConfig,
  ResolvedRuleSetting,
  // Rules
  Rule,
  RuleContext,
  RuleEngine,
  RuleSetting,
  RuleSettingObject,
  RunModeConfig,
  Severity,
  Suggestion,
  SuppressConfig,
  SuppressIndex,
  UnresolvedImport,
  UnresolvedReason,
  WatchRunMode,
} from './types.js';
