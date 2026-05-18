/**
 * @fileoverview Public API surface of @avavilov/arch-lint — the single package
 * entry point re-exporting the published types and functions. The internal
 * Resolution type and the config helper modules are intentionally not
 * re-exported. Exports are grouped by owning module; ordering follows Biome's
 * path-sorted organize-imports.
 */

// Types — baseline module
export type { BaselineFile, BaselineRecord } from './baseline/types.js';
// Function — config helper
export { defineConfig } from './config/define-config.js';
// Function — config resolver
export { resolveConfig } from './config/index.js';
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
} from './config/types.js';
// Function — graph builder
export { buildGraph } from './graph/index.js';
// Types — graph module (Resolution excluded — internal resolver helper)
export type {
  ConsumerGraph,
  Edge,
  Node,
  UnresolvedImport,
  UnresolvedReason,
} from './graph/types.js';
// Types — rules module
export type { CheckResult, Rule, RuleContext, RuleEngine } from './rules/types.js';
// Function — check runner
export { check } from './runner/index.js';
// Types — suppress module
export type { ParsedSuppress, SuppressIndex } from './suppress/types.js';
// Types — cross-cutting core lexicon
export type {
  ActiveSeverity,
  ConsumerInfo,
  Diagnostic,
  Location,
  Severity,
  Suggestion,
} from './types.js';
