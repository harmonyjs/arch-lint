/**
 * @fileoverview ui-cluster-membership rule — a file importing a trigger package must
 * live in the UI cluster. Reads AST from the RuleContext project (decision D9).
 */

import { isStrictlyUnderPrefix } from '#entity-id/index.js';
import type { Node } from '#graph/types.js';
import { sourceFileFor } from '#rules/ast/find-source-file.js';
import { importsOf } from '#rules/ast/import-info.js';
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

/**
 * True when `node` satisfies cluster membership. With an explicit `mustLiveIn`
 * the today-behavior path prefix applies — the node must live STRICTLY under the
 * cluster path; with an empty `mustLiveIn` the auto path applies — membership ==
 * the node carries `region: 'view'` (#26).
 */
function satisfiesCluster(node: Node, mustLiveIn: string): boolean {
  if (mustLiveIn !== '') return isStrictlyUnderPrefix(node.id, mustLiveIn);
  return node.region === 'view';
}

/** The rule identity stamped onto every diagnostic — supplied by the RuleContext. */
interface DiagnosticIdentity {
  readonly ruleId: string;
  readonly severity: Diagnostic['severity'];
}

/**
 * Builds the cluster-membership diagnostic for one file. With an explicit
 * `mustLiveIn` the cluster is that path prefix; with an empty `mustLiveIn` the
 * cluster is the auto-detected view region (#26) and the suggestion is generic.
 */
function membershipDiagnostic(
  fileId: string,
  triggers: readonly string[],
  mustLiveIn: string,
  identity: DiagnosticIdentity,
): Diagnostic {
  const list = triggers.join(', ');
  const auto = mustLiveIn === '';
  const cluster = auto ? 'the view region' : `the UI cluster '${mustLiveIn}'`;
  return {
    ruleId: identity.ruleId,
    severity: identity.severity,
    entity: fileId,
    message: `File imports trigger package(s) ${list} but lives outside ${cluster}`,
    actual: fileId,
    expected: auto ? 'a file inside the view region' : mustLiveIn,
    reason: `Files coupled to ${list} are UI primitives and belong in ${cluster}`,
    suggestions: [
      auto
        ? {
            action: 'custom',
            rationale: `Move this file into the view region (a folder tree containing JSX components), or drop the ${list} import`,
          }
        : {
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
    const diagnostics: Diagnostic[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind !== 'file') continue;
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
        membershipDiagnostic(node.id, triggers, mustLiveIn, {
          ruleId: context.ruleId,
          severity: context.severity,
        }),
      );
    }
    return diagnostics;
  },
};
