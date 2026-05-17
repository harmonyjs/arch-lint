/**
 * @fileoverview hooks-folder-required rule — use-* files must live in a hooks/ folder
 * (decision D7). The view pack is parametrized by config — no hardcoded React naming.
 */
import type { ResolvedConfig } from '#config/types.js';
import { baseNameOf, folderOf } from '#entity-id/index.js';
import type { ConsumerGraph } from '#graph/types.js';
import { dedupByFingerprint } from '#rules/syntactic-support/dedup.js';
import { isUnderSegment } from '#rules/syntactic-support/segments.js';
import type { SyntacticRule, SyntacticRuleContext } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

/** Options of hooks-folder-required (D7). */
export interface HooksFolderRequiredOptions {
  readonly hookFilePattern: string;
  readonly strictCheck: boolean;
}

/** Default options — the kebab-case `use-*` convention, applied when the config omits options. */
const DEFAULTS: HooksFolderRequiredOptions = {
  hookFilePattern: '^use-[a-z][a-z0-9-]*\\.tsx?$',
  strictCheck: true,
};

/** Which side of the hooks/ boundary a file violates. */
type Kind = 'misplaced' | 'non-hook';

/** The hooks/ boundary settings resolved once per run from config and rule options. */
interface HooksBoundary {
  readonly hooksSegment: string;
  readonly hookFilePattern: string;
  readonly strictCheck: boolean;
}

/** Per-file facts the boundary check classifies against. */
interface FileBoundaryFacts {
  readonly fileId: string;
  readonly isHookName: boolean;
  readonly inHooksFolder: boolean;
}

/** True when a file is a barrel of the convention. */
function isBarrel(fileId: string, config: ResolvedConfig): boolean {
  return config.conventions.indexFiles.includes(baseNameOf(fileId));
}

/** Builds the diagnostic for one hooks-placement violation. */
function makeDiag(
  fileId: string,
  context: SyntacticRuleContext<HooksFolderRequiredOptions>,
  kind: Kind,
  boundary: HooksBoundary,
): Diagnostic {
  const { hooksSegment, hookFilePattern } = boundary;
  const targetDir = `${folderOf(fileId)}/${hooksSegment}`;
  const message =
    kind === 'misplaced'
      ? `Hook file '${fileId}' must live inside a '${hooksSegment}/' folder`
      : `File '${fileId}' inside '${hooksSegment}/' does not match the hook pattern ${hookFilePattern}`;
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
  facts: FileBoundaryFacts,
  boundary: HooksBoundary,
  config: ResolvedConfig,
): Kind | null {
  const { fileId, isHookName, inHooksFolder } = facts;
  if (isHookName && !inHooksFolder) return 'misplaced';
  if (boundary.strictCheck && !isHookName && inHooksFolder && !isBarrel(fileId, config)) {
    return 'non-hook';
  }
  return null;
}

/** D7: use-* files must live in hooks/; strictCheck enforces both directions. */
export const hooksFolderRequired: SyntacticRule<HooksFolderRequiredOptions> = {
  id: 'hooks-folder-required',
  pack: 'view',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph: ConsumerGraph, config, context): Diagnostic[] => {
    const { hookFilePattern, strictCheck } = {
      ...DEFAULTS,
      ...(context.options as Partial<HooksFolderRequiredOptions>),
    };
    const boundary: HooksBoundary = {
      hooksSegment: config.conventions.hooksSegment,
      hookFilePattern,
      strictCheck,
    };
    const hookRe = new RegExp(hookFilePattern);
    const diagnostics: Diagnostic[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind !== 'file') continue;
      const facts: FileBoundaryFacts = {
        fileId: node.id,
        isHookName: hookRe.test(baseNameOf(node.id)),
        inHooksFolder: isUnderSegment(node.id, boundary.hooksSegment),
      };
      const kind = violationOf(facts, boundary, config);
      if (kind === null) continue;
      diagnostics.push(makeDiag(node.id, context, kind, boundary));
    }
    return dedupByFingerprint(diagnostics);
  },
};
