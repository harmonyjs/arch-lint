/**
 * @fileoverview ui-cluster-membership rule — a file importing a trigger package must
 * live in the UI cluster. Reads AST from the RuleContext project (decision D9).
 */

import type { Diagnostic } from '../../../types.js';
import { fileNodeIds, sourceFileFor } from '../../syntactic-support/find-source-file.js';
import { importsOf } from '../../syntactic-support/import-info.js';
import { segmentsOf } from '../../syntactic-support/segments.js';
import type { SyntacticRule } from '../../types.js';
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
    const diagnostics: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      if (isInsideCluster(fileId, mustLiveIn)) continue;
      const sf = sourceFileFor(context.project, fileId);
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
        membershipDiagnostic(fileId, triggers, mustLiveIn, {
          ruleId: context.ruleId,
          severity: context.severity,
        }),
      );
    }
    return diagnostics;
  },
};
