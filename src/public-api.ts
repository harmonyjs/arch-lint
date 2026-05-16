/**
 * @fileoverview Public API surface of @avavilov/arch-lint — the single package
 * entry point re-exporting the published types and functions. The internal
 * Resolution type and the config helper modules are intentionally not
 * re-exported. buildGraph (M2) and check (M7) are added by their milestones.
 */

export { resolveConfig } from './config/resolve-defaults.js';
// ── Functions ────────────────────────────────────────────────────────────────
export { defineConfig } from './define-config.js';

// ── Types (Resolution excluded — internal, §5.2) ─────────────────────────────
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
