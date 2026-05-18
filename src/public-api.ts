/**
 * @fileoverview Public API surface of @avavilov/arch-lint — the single package
 * entry point re-exporting the published types and functions. The internal
 * Resolution type and the config helper modules are intentionally not
 * re-exported. Exports are grouped by owning module; ordering follows Biome's
 * path-sorted organize-imports.
 */

// Function — config helper
export { defineConfig } from '#foundation/config/define-config.js';
// Function — config resolver
export { resolveConfig } from '#foundation/config/index.js';
// Types — config module
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
} from '#foundation/config/types.js';
// Types — suppress module
export type { ParsedSuppress, SuppressIndex } from '#foundation/suppress/types.js';
// Types — cross-cutting core lexicon
export type {
  ActiveSeverity,
  ConsumerInfo,
  Diagnostic,
  Location,
  Severity,
  Suggestion,
} from '#foundation/types/index.js';
// Types — rules module
export type { CheckResult, Rule, RuleContext, RuleEngine } from '#platform/engine/types.js';
// Function — graph builder
export { buildGraph } from '#platform/graph/index.js';
// Types — graph module (Resolution excluded — internal resolver helper)
export type {
  ConsumerGraph,
  Edge,
  Node,
  UnresolvedImport,
  UnresolvedReason,
} from '#platform/graph/types.js';
// Types — baseline module
export type { BaselineFile, BaselineRecord } from '#runner/baseline/types.js';
// Function — check runner
export { check } from '#runner/index.js';
