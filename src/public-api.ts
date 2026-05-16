/**
 * @fileoverview Public API surface of @avavilov/arch-lint — the single package
 * entry point re-exporting the published types and functions. The internal
 * Resolution type and the config helper modules are intentionally not
 * re-exported. buildGraph (M2) and check (M7) are added by their milestones.
 */

// ── Functions ────────────────────────────────────────────────────────────────
export { defineConfig } from './define-config.js';
export { resolveConfig } from './config/resolve-defaults.js';

// ── Types (Resolution excluded — internal, §5.2) ─────────────────────────────
export type {
  // Primitives
  Pack,
  Severity,
  ActiveSeverity,
  RuleEngine,
  // Config
  ProjectConfig,
  ConventionsConfig,
  ExplicitPlacementRule,
  ResolveConfig,
  LayerConfig,
  LayersConfig,
  BaselineConfig,
  SuppressConfig,
  ReportCliConfig,
  ReportConfig,
  WatchRunMode,
  PreCommitRunMode,
  CiRunMode,
  RunModeConfig,
  RuleSetting,
  RuleSettingObject,
  ResolvedRuleSetting,
  Config,
  ResolvedConfig,
  // Graph
  Location,
  Node,
  Edge,
  UnresolvedReason,
  UnresolvedImport,
  ConsumerGraph,
  // Rules
  Rule,
  RuleContext,
  // Diagnostics
  ConsumerInfo,
  Suggestion,
  Diagnostic,
  // Suppress
  ParsedSuppress,
  SuppressIndex,
  // Baseline
  BaselineRecord,
  BaselineFile,
  // Runner
  CheckResult,
} from './types.js';
