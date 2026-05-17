/**
 * @fileoverview hooks-folder-required rule — use-* files must live in a hooks/ folder
 * (decision D7). The view pack is parametrized by config — no hardcoded React naming.
 */
import type { ResolvedConfig } from '../../../config/types.js';
import type { ConsumerGraph } from '../../../graph/types.js';
import type { Diagnostic } from '../../../types.js';
import { dedupByFingerprint } from '../../syntactic-support/dedup.js';
import { isUnderSegment, segmentsOf } from '../../syntactic-support/segments.js';
import type { Rule, RuleContext } from '../../types.js';

/** Options of hooks-folder-required (D7). */
export interface HooksFolderRequiredOptions {
  readonly hookFilePattern: string;
  readonly strictCheck: boolean;
}

/** Which side of the hooks/ boundary a file violates. */
type Kind = 'misplaced' | 'non-hook';

/** The basename of a file id. */
function baseNameOf(fileId: string): string {
  return fileId.slice(fileId.lastIndexOf('/') + 1);
}

/** True when a file is a barrel of the convention. */
function isBarrel(fileId: string, config: ResolvedConfig): boolean {
  return config.conventions.indexFiles.includes(baseNameOf(fileId));
}

/** Builds the diagnostic for one hooks-placement violation. */
function makeDiag(
  fileId: string,
  context: RuleContext<HooksFolderRequiredOptions>,
  kind: Kind,
  hooksSegment: string,
  pattern: string,
): Diagnostic {
  const targetDir = `${segmentsOf(fileId).slice(0, -1).join('/')}/${hooksSegment}`;
  const message =
    kind === 'misplaced'
      ? `Hook file '${fileId}' must live inside a '${hooksSegment}/' folder`
      : `File '${fileId}' inside '${hooksSegment}/' does not match the hook pattern ${pattern}`;
  const suggestion =
    kind === 'misplaced'
      ? {
          action: 'move' as const,
          target: targetDir,
          rationale: `Move the hook into '${targetDir}'`,
        }
      : {
          action: 'custom' as const,
          rationale: 'Move the non-hook file out of the hooks/ folder or rename it to a hook',
        };
  return {
    ruleId: context.ruleId,
    severity: context.severity,
    entity: fileId,
    fingerprint: fileId,
    message,
    actual: kind === 'misplaced' ? `${fileId} (outside ${hooksSegment}/)` : fileId,
    reason:
      kind === 'misplaced'
        ? 'Hooks are grouped under a hooks/ folder for discoverability'
        : 'A hooks/ folder must contain only hook files',
    suggestions: [suggestion],
    location: { file: fileId, line: 1, column: 1 },
  };
}

/** The violation kind a file carries against the hooks/ boundary, or null. */
function violationOf(
  fileId: string,
  isHookName: boolean,
  inHooksFolder: boolean,
  strictCheck: boolean,
  config: ResolvedConfig,
): Kind | null {
  if (isHookName && !inHooksFolder) return 'misplaced';
  if (strictCheck && !isHookName && inHooksFolder && !isBarrel(fileId, config)) {
    return 'non-hook';
  }
  return null;
}

/** D7: use-* files must live in hooks/; strictCheck enforces both directions. */
export const hooksFolderRequired: Rule<HooksFolderRequiredOptions> = {
  id: 'hooks-folder-required',
  pack: 'view',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph: ConsumerGraph, config, context): Diagnostic[] => {
    const { hookFilePattern, strictCheck } = context.options;
    const hookRe = new RegExp(hookFilePattern);
    const hooksSegment = config.conventions.hooksSegment;
    const diagnostics: Diagnostic[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind !== 'file') continue;
      const isHookName = hookRe.test(baseNameOf(node.id));
      const inHooksFolder = isUnderSegment(node.id, hooksSegment);
      const kind = violationOf(node.id, isHookName, inHooksFolder, strictCheck, config);
      if (kind === null) continue;
      diagnostics.push(makeDiag(node.id, context, kind, hooksSegment, hookFilePattern));
    }
    return dedupByFingerprint(diagnostics);
  },
};
