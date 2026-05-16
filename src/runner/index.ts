/**
 * @fileoverview Runner — the orchestration layer between the CLI and the rule
 * engine. `check` is the pure, I/O-free engine wrapper; the rest of this module
 * adds the I/O around it (config, graph, sources, suppress, baseline).
 */
import type { Project } from 'ts-morph';
import { runEngine } from '../rules/engine.js';
import type {
  BaselineFile,
  CheckResult,
  ConsumerGraph,
  ResolvedConfig,
  SuppressIndex,
} from '../types.js';

/**
 * Pure engine wrapper — a synchronous passthrough to runEngine, free of any
 * file I/O. Every argument is supplied by the caller; the runner's I/O
 * orchestration (loading config, building the graph, resolving the baseline)
 * lives in `runCheck`.
 */
export function check(
  graph: ConsumerGraph,
  config: ResolvedConfig,
  suppress: SuppressIndex,
  project: Project,
  ruleFilter?: readonly string[],
  baseline?: BaselineFile | null,
): CheckResult {
  return runEngine(graph, config, suppress, project, ruleFilter, baseline);
}
