/**
 * @fileoverview runEngine — executes the rule pipeline over a frozen graph.
 */
import type { Project } from 'ts-morph';
import { classifyDiagnostics } from '../baseline/classify.js';
import type { BaselineFile } from '../baseline/types.js';
import type { ResolvedConfig } from '../config/types.js';
import type { ConsumerGraph } from '../graph/types.js';
import type { SuppressIndex } from '../suppress/types.js';
import type { ActiveSeverity, Diagnostic } from '../types.js';
import {
  buildGraphContext,
  buildManifestBundle,
  buildManifestContext,
  buildSyntacticContext,
  dedupPlacement,
  runtimeSelfCheck,
} from './engine/index.js';
import { getActiveRules } from './index.js';
import { assertGraphProjectConsistent } from './syntactic-support/index.js';
import type { CheckResult, ManifestBundle, Rule } from './types.js';

/** Tally classified diagnostics into the CheckResult summary and exit code (§10.3). */
function buildResult(diagnostics: readonly Diagnostic[]): CheckResult {
  const bySeverity: Record<ActiveSeverity, number> = { info: 0, warning: 0, error: 0 };
  let newCount = 0;
  let inBaseline = 0;
  let blockingNew = false;
  for (const d of diagnostics) {
    bySeverity[d.severity] += 1;
    if (d.status === 'inBaseline') {
      inBaseline += 1;
    } else {
      newCount += 1;
      if (d.severity !== 'info') blockingNew = true;
    }
  }
  return {
    diagnostics,
    summary: { total: diagnostics.length, bySeverity, new: newCount, inBaseline },
    exitCode: blockingNew ? 1 : 0,
  };
}

/** Inputs every engine variant may need; runEngine resolves these once per run. */
interface DispatchEnv {
  readonly graph: ConsumerGraph;
  readonly config: ResolvedConfig;
  readonly suppress: SuppressIndex;
  readonly project: Project;
  readonly manifests: ManifestBundle;
  readonly cwd: string;
}

/** Run one rule against the slice of the environment its engine consumes. */
function dispatchRule(rule: Rule, env: DispatchEnv): Diagnostic[] {
  const { graph, config, suppress, project, manifests, cwd } = env;
  switch (rule.engine) {
    case 'graph':
      return rule.check(graph, config, buildGraphContext(rule, config, suppress));
    case 'syntactic':
      return rule.check(graph, config, buildSyntacticContext(rule, config, suppress, project));
    case 'manifest':
      return rule.check(buildManifestContext(rule, config, manifests, cwd));
  }
}

/** The frozen graph and its parsed sources the engine runs against. */
export interface EngineInputs {
  readonly graph: ConsumerGraph;
  readonly config: ResolvedConfig;
  readonly suppress: SuppressIndex;
  readonly project: Project;
}

/** The optional run-shaping inputs the runner threads into a single pass. */
export interface RunOptions {
  /** Restrict the run to these rule ids; absent runs every active rule. */
  readonly ruleFilter?: readonly string[] | undefined;
  /** The baseline diagnostics are classified against; absent or null skips classification. */
  readonly baseline?: BaselineFile | null | undefined;
}

/**
 * Run the §8.1 pipeline over a frozen graph: dispatch each rule by its engine — graph
 * rules see the ConsumerGraph, syntactic rules also see the parsed `project`, manifest
 * rules see the project manifests parsed once — drop suppressed diagnostics, dedup
 * placement verdicts, run the §10.2 self-check, then classify against the baseline.
 * Free of file I/O — `suppress`, `project` and `baseline` are supplied by the runner.
 */
export function runEngine(inputs: EngineInputs, options: RunOptions = {}): CheckResult {
  const { graph, config, suppress, project } = inputs;
  const { ruleFilter, baseline } = options;
  const activeRules = getActiveRules(config, ruleFilter);
  if (activeRules.some((r) => r.engine === 'syntactic')) {
    assertGraphProjectConsistent(graph, project);
  }
  const env: DispatchEnv = {
    graph,
    config,
    suppress,
    project,
    manifests: buildManifestBundle(config),
    cwd: config.project.cwd,
  };
  let diagnostics: Diagnostic[] = activeRules.flatMap((rule) => dispatchRule(rule, env));
  diagnostics = diagnostics.filter((d) => !suppress.isSuppressed(d));
  diagnostics = [...dedupPlacement(diagnostics)];
  runtimeSelfCheck(diagnostics);
  diagnostics = classifyDiagnostics(diagnostics, baseline ?? null);
  return buildResult(diagnostics);
}
