/**
 * @fileoverview ui-cluster-membership rule — a file importing a trigger package must
 * live in the UI cluster. Reads AST from the RuleContext project (decision D9).
 */

import type { Node } from '#graph/types.js';
import { sourceFileFor } from '#rules/syntactic-support/find-source-file.js';
import { importsOf } from '#rules/syntactic-support/import-info.js';
import { segmentsOf } from '#rules/syntactic-support/segments.js';
import type { SyntacticRule } from '#rules/types.js';
import type { Diagnostic } from '#types.js';
import { triggerPackageMatcher } from './matcher.js';

/** Options of ui-cluster-membership. */
export interface UiClusterMembershipOptions {
  readonly triggerPackages: readonly string[];
  readonly mustLiveIn: string;
}

/**
 * Default options — empty `triggerPackages` makes the rule a no-op until a project
 * names its UI primitive packages, the lenient default when the config omits options.
 */
const DEFAULTS: UiClusterMembershipOptions = {
  triggerPackages: [],
  mustLiveIn: '',
};

/** True when a file lies under the cluster path (per-segment prefix). */
function isInsideCluster(fileId: string, cluster: string): boolean {
  const fileSegs = segmentsOf(fileId);
  const clusterSegs = segmentsOf(cluster);
  if (fileSegs.length <= clusterSegs.length) return false;
  return clusterSegs.every((s, i) => fileSegs[i] === s);
}

/**
 * True when `node` satisfies cluster membership. With an explicit `mustLiveIn`
 * the today-behavior path prefix applies; with an empty `mustLiveIn` the auto
 * path applies — membership == the node carries `region: 'view'` (#26).
 */
function satisfiesCluster(node: Node, mustLiveIn: string): boolean {
  if (mustLiveIn !== '') return isInsideCluster(node.id, mustLiveIn);
  return node.region === 'view';
}

/** The rule identity stamped onto every diagnostic — supplied by the RuleContext. */
interface DiagnosticIdentity {
  readonly ruleId: string;
  readonly severity: Diagnostic['severity'];
}

/** Builds the cluster-membership diagnostic for one file. */
function membershipDiagnostic(
  fileId: string,
  triggers: readonly string[],
  mustLiveIn: string,
  identity: DiagnosticIdentity,
): Diagnostic {
  const list = triggers.join(', ');
  return {
    ruleId: identity.ruleId,
    severity: identity.severity,
    entity: fileId,
    message: `File imports trigger package(s) ${list} but lives outside the UI cluster '${mustLiveIn}'`,
    actual: fileId,
    expected: mustLiveIn,
    reason: `Files coupled to ${list} are primitives and belong in the UI cluster`,
    suggestions: [
      {
        action: 'move',
        target: mustLiveIn,
        rationale: `Extract the primitive into '${mustLiveIn}' and keep a thin wrapper here if needed`,
      },
    ],
    location: { file: fileId, line: 1, column: 1 },
  };
}

/** Rule: a file importing a trigger package must live in the UI cluster. */
export const uiClusterMembership: SyntacticRule<UiClusterMembershipOptions> = {
  id: 'ui-cluster-membership',
  pack: 'view',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph, _config, context): Diagnostic[] => {
    const { triggerPackages, mustLiveIn } = {
      ...DEFAULTS,
      ...(context.options as Partial<UiClusterMembershipOptions>),
    };
    const matchesTrigger = triggerPackageMatcher(triggerPackages);
    const clusterLabel = mustLiveIn === '' ? 'view region' : mustLiveIn;
    const diagnostics: Diagnostic[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind !== 'file') continue;
      if (node.region !== 'view') continue;
      if (satisfiesCluster(node, mustLiveIn)) continue;
      const sf = sourceFileFor(context.project, node.id);
      if (sf === undefined) continue;
      const triggers = [
        ...new Set(
          importsOf(sf)
            .filter((imp) => matchesTrigger(imp.specifier))
            .map((imp) => imp.specifier),
        ),
      ];
      if (triggers.length === 0) continue;
      diagnostics.push(
        membershipDiagnostic(node.id, triggers, clusterLabel, {
          ruleId: context.ruleId,
          severity: context.severity,
        }),
      );
    }
    return diagnostics;
  },
};
