/**
 * @fileoverview runEngine — executes the rule pipeline over a frozen graph.
 */
import type { Project } from 'ts-morph';
import type { ResolvedConfig } from '#config/types.js';
import type { ConsumerGraph } from '#graph/types.js';
import { assertGraphProjectConsistent } from '#rules/ast/index.js';
import { getActiveRules } from '#rules/index.js';
import type { ManifestBundle, Rule } from '#rules/types.js';
import type { SuppressIndex } from '#suppress/types.js';
import type { Diagnostic } from '#types.js';
import {
  buildCensusContext,
  buildGraphContext,
  buildManifestBundle,
  buildManifestContext,
  buildSyntacticContext,
  dedupPlacement,
  runtimeSelfCheck,
} from './index.js';

/** Inputs every engine variant may need; runEngine resolves these once per run. */
interface DispatchEnv {
  readonly graph: ConsumerGraph;
  readonly config: ResolvedConfig;
  readonly suppress: SuppressIndex;
  readonly project: Project;
  readonly manifests: ManifestBundle;
  readonly census: readonly string[];
  readonly cwd: string;
}

/** Run one rule against the slice of the environment its engine consumes. */
function dispatchRule(rule: Rule, env: DispatchEnv): Diagnostic[] {
  const { graph, config, suppress, project, manifests, census, cwd } = env;
  switch (rule.engine) {
    case 'graph':
      return rule.check(graph, config, buildGraphContext(rule, config, suppress));
    case 'syntactic':
      return rule.check(graph, config, buildSyntacticContext(rule, config, suppress, project));
    case 'manifest':
      return rule.check(buildManifestContext(rule, config, manifests, cwd));
    case 'census':
      return rule.check(buildCensusContext(rule, config, census));
  }
}

/** The frozen graph and its parsed sources the engine runs against. */
export interface EngineInputs {
  readonly graph: ConsumerGraph;
  readonly config: ResolvedConfig;
  readonly suppress: SuppressIndex;
  readonly project: Project;
  /** The FileCensus — the project file list census rules check placement against. */
  readonly census: readonly string[];
}

/**
 * Run the rule pipeline over a frozen graph: dispatch each rule by its engine — graph
 * rules see the ConsumerGraph, syntactic rules also see the parsed `project`, manifest
 * rules see the project manifests parsed once — then drop suppressed diagnostics, dedup
 * placement verdicts and run the runtime self-check. Returns the raw diagnostics;
 * baseline classification and summarisation are the runner's concern. Free of file I/O.
 * An absent `ruleFilter` runs every active rule.
 */
export function runEngine(
  inputs: EngineInputs,
  ruleFilter?: readonly string[],
): readonly Diagnostic[] {
  const { graph, config, suppress, project, census } = inputs;
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
    census,
    cwd: config.project.cwd,
  };
  let diagnostics: Diagnostic[] = activeRules.flatMap((rule) => dispatchRule(rule, env));
  diagnostics = diagnostics.filter((d) => !suppress.isSuppressed(d));
  diagnostics = [...dedupPlacement(diagnostics)];
  runtimeSelfCheck(diagnostics);
  return diagnostics;
}
