/**
 * @fileoverview runEngine — executes the rule pipeline over a frozen graph.
 */
import type { Project } from 'ts-morph';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Logger, Telemetry } from '#foundation/logger/index.js';
import type { SuppressIndex } from '#foundation/suppress/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import { assertGraphProjectConsistent } from '#platform/ast/index.js';
import type { ManifestBundle, Rule } from '#platform/engine/types.js';
import type { ConsumerGraph } from '#platform/graph/types.js';
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
  readonly logger: Logger;
}

/** Run one rule against the slice of the environment its engine consumes. */
function dispatchRule(rule: Rule, env: DispatchEnv): Diagnostic[] {
  const { graph, config, suppress, project, manifests, census, cwd, logger } = env;
  switch (rule.engine) {
    case 'graph':
      return rule.check(graph, config, buildGraphContext(rule, config, { suppress, logger }));
    case 'syntactic':
      return rule.check(
        graph,
        config,
        buildSyntacticContext(rule, config, { suppress, project, logger }),
      );
    case 'manifest':
      return rule.check(buildManifestContext(rule, config, { manifests, cwd, logger }));
    case 'census':
      return rule.check(buildCensusContext(rule, config, { census, logger }));
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
  /** The diagnostic-output sink threaded into every rule context. */
  readonly logger: Logger;
  /** The span recorder wrapping each rule's execution. */
  readonly telemetry: Telemetry;
}

/**
 * Run the rule pipeline over a frozen graph: dispatch each rule by its engine — graph
 * rules see the ConsumerGraph, syntactic rules also see the parsed `project`, manifest
 * rules see the project manifests parsed once — then drop suppressed diagnostics, dedup
 * placement verdicts and run the runtime self-check. Returns the raw diagnostics;
 * baseline classification and summarisation are the runner's concern. Free of file I/O.
 * Runs exactly the `rules` it is given — resolving the active rule set from config is
 * the caller's concern.
 */
export function runEngine(inputs: EngineInputs, rules: readonly Rule[]): readonly Diagnostic[] {
  const { graph, config, suppress, project, census, logger, telemetry } = inputs;
  if (rules.some((r) => r.engine === 'syntactic')) {
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
    logger,
  };
  let diagnostics: Diagnostic[] = rules.flatMap((rule) =>
    telemetry.withSpan(rule.id, () => dispatchRule(rule, env)),
  );
  diagnostics = diagnostics.filter((d) => !suppress.isSuppressed(d));
  diagnostics = [...dedupPlacement(diagnostics)];
  runtimeSelfCheck(diagnostics);
  return diagnostics;
}
