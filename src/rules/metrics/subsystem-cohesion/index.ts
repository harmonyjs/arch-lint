/**
 * @fileoverview subsystem-cohesion rule — flags a subsystem whose entity files
 * rarely reference each other. Files that sit together but never connect are a
 * folder, not a subsystem. Only entity files count — barrels and entry files are
 * connective tissue, not members of the subsystem's vocabulary.
 */

import type { ResolvedConfig } from '../../../config/types.js';
import type { ConsumerGraph } from '../../../graph/types.js';
import type { Diagnostic } from '../../../types.js';
import type { GraphRule, GraphRuleContext } from '../../types.js';
import {
  type SubsystemCoupling,
  subsystemCoupling,
  subsystemOf,
} from '../support/subsystem-graph.js';

/** Tunable options of the subsystem-cohesion rule. */
interface Options {
  /** Lowest internal-cohesion ratio tolerated for a multi-file subsystem. */
  readonly min: number;
  /** Subsystem names exempt from the cohesion check. */
  readonly ignoreSubsystems: readonly string[];
}

const DEFAULTS: Options = { min: 0.3, ignoreSubsystems: [] };

/** A subsystem measured below the cohesion threshold. */
interface CohesionMiss {
  readonly subsystem: string;
  readonly internal: number;
  readonly total: number;
  readonly cohesion: number;
}

/** Returns the set of files that import at least one sibling in their own subsystem. */
function filesWithSibling(graph: ConsumerGraph, root: string): ReadonlySet<string> {
  const result = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.consumer === edge.producer) continue;
    // A root-level lexicon file has no subsystem; two of them are not siblings.
    const consumerSubsystem = subsystemOf(edge.consumer, root);
    if (consumerSubsystem !== null && consumerSubsystem === subsystemOf(edge.producer, root)) {
      result.add(edge.consumer);
    }
  }
  return result;
}

/** The shared inputs of a single subsystem's cohesion measurement. */
interface CohesionScan {
  readonly graph: ConsumerGraph;
  readonly connected: ReadonlySet<string>;
  readonly min: number;
}

/** Entity files of a subsystem — its members; barrels and entry files are excluded. */
function entityFilesOf(graph: ConsumerGraph, info: SubsystemCoupling): readonly string[] {
  const result: string[] = [];
  for (const file of info.files) {
    if (graph.nodes.get(file)?.isEntity === true) result.push(file);
  }
  return result;
}

/**
 * Measures a single subsystem against the cohesion threshold. Returns the miss when
 * the subsystem has at least two entity files and its cohesion drops below `min`.
 */
function measureSubsystem(
  subsystem: string,
  info: SubsystemCoupling,
  scan: CohesionScan,
): CohesionMiss | null {
  const entities = entityFilesOf(scan.graph, info);
  const total = entities.length;
  if (total < 2) return null;
  let internal = 0;
  for (const file of entities) {
    if (scan.connected.has(file)) internal += 1;
  }
  const cohesion = internal / total;
  if (cohesion >= scan.min) return null;
  return { subsystem, internal, total, cohesion };
}

/** Builds the diagnostic for a measured cohesion miss. */
function toDiagnostic(
  miss: CohesionMiss,
  root: string,
  min: number,
  severity: GraphRuleContext['severity'],
): Diagnostic {
  return {
    ruleId: 'subsystem-cohesion',
    severity,
    entity: `${root}/${miss.subsystem}`,
    fingerprint: `subsystem-cohesion#${miss.subsystem}`,
    message: `subsystem ${miss.subsystem} has low internal cohesion`,
    expected: `cohesion ≥ ${min}`,
    actual: `${miss.cohesion.toFixed(2)} (${miss.internal}/${miss.total} files import a sibling)`,
    reason: 'files that sit together but never reference each other are a folder, not a subsystem',
    suggestions: [
      {
        action: 'custom',
        rationale:
          'either the files belong in different subsystems, or a missing seam should connect them',
      },
    ],
    location: { file: `${root}/${miss.subsystem}`, line: 1, column: 1 },
  };
}

/** Rule: a subsystem whose entity-file internal cohesion drops below `min` is flagged. */
export const subsystemCohesion: GraphRule = {
  id: 'subsystem-cohesion',
  pack: 'metrics',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const root = config.project.sourceRoot;
    const ignore = new Set(opts.ignoreSubsystems);
    const coupling = subsystemCoupling(graph, root);
    const scan: CohesionScan = { graph, connected: filesWithSibling(graph, root), min: opts.min };

    const out: Diagnostic[] = [];
    for (const [subsystem, info] of coupling) {
      if (ignore.has(subsystem)) continue;
      const miss = measureSubsystem(subsystem, info, scan);
      if (miss !== null) out.push(toDiagnostic(miss, root, opts.min, context.severity));
    }
    return out;
  },
};
