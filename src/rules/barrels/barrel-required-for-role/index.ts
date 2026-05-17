/**
 * @fileoverview barrel-required-for-role rule — role folders and component folders
 * must own a barrel (decision D6). A structural check over the graph node set.
 */
import type { ResolvedConfig } from '#config/types.js';
import { folderOf } from '#entity-id/index.js';
import type { ConsumerGraph } from '#graph/types.js';
import {
  isComponentFolderEntry,
  roleFolderSegment,
} from '#rules/syntactic-support/node-helpers.js';
import type { SyntacticRule, SyntacticRuleContext } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

/** Options of barrel-required-for-role (D7). */
export interface BarrelRequiredForRoleOptions {
  readonly enforceForSegments: 'all' | readonly string[];
  readonly exemptPaths: readonly string[];
}

/** Default options — the broad, lenient defaults applied when the config omits per-rule options. */
const DEFAULTS: BarrelRequiredForRoleOptions = {
  enforceForSegments: 'all',
  exemptPaths: [],
};

/**
 * True when a role folder is in scope of enforceForSegments. The role folder
 * itself IS the role segment, so the check matches its own role name (D7) —
 * `isUnderSegment` would wrongly exclude the folder's own last segment.
 */
function roleInScope(setting: 'all' | readonly string[], role: string): boolean {
  return setting === 'all' || setting.includes(role);
}

/** True when the folder has a child barrel file from conventions.indexFiles. */
function hasIndexChild(folderId: string, graph: ConsumerGraph, config: ResolvedConfig): boolean {
  return config.conventions.indexFiles.some((name) => graph.nodes.has(`${folderId}/${name}`));
}

/** True when the folder owns a same-name component entry (`X/X.tsx`). */
function isComponentFolder(folderId: string, graph: ConsumerGraph): boolean {
  for (const node of graph.nodes.values()) {
    if (node.kind !== 'file' || !isComponentFolderEntry(node.id)) continue;
    if (folderOf(node.id) === folderId) return true;
  }
  return false;
}

/** Builds the missing-barrel diagnostic for a folder. */
function missingBarrelDiagnostic(
  folderId: string,
  role: string | null,
  config: ResolvedConfig,
  context: SyntacticRuleContext<BarrelRequiredForRoleOptions>,
): Diagnostic {
  const indexFiles = config.conventions.indexFiles;
  const barrelPath = `${folderId}/${indexFiles[0]}`;
  return {
    ruleId: context.ruleId,
    severity: context.severity,
    entity: folderId,
    message: `Folder '${folderId}' must contain a barrel file (${indexFiles.join(' or ')})`,
    actual: `${folderId} has no ${indexFiles[0]}`,
    reason:
      role !== null
        ? `Role folder '${role}' is a module boundary and requires a public barrel`
        : 'Component folder must expose its public surface through a barrel',
    suggestions: [
      {
        action: 'add-barrel',
        target: barrelPath,
        rationale: 'Add an index barrel re-exporting the public entities of this folder',
      },
    ],
    location: { file: barrelPath, line: 1, column: 1 },
  };
}

/** True when the folder is in scope and lacks its required barrel. */
function violatesBarrelRule(
  folderId: string,
  graph: ConsumerGraph,
  config: ResolvedConfig,
  options: BarrelRequiredForRoleOptions,
): { readonly role: string | null } | null {
  if (options.exemptPaths.includes(folderId)) return null;
  const role = roleFolderSegment(folderId, config.conventions);
  const isRole = role !== null;
  const isComponent = isComponentFolder(folderId, graph);
  if (!isRole && !isComponent) return null;
  if (isRole && !isComponent && !roleInScope(options.enforceForSegments, role)) {
    return null;
  }
  if (hasIndexChild(folderId, graph, config)) return null;
  return { role };
}

/** D6: role folders and component folders must contain a barrel. */
export const barrelRequiredForRole: SyntacticRule<BarrelRequiredForRoleOptions> = {
  id: 'barrel-required-for-role',
  pack: 'barrels',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph, config, context): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<BarrelRequiredForRoleOptions>) };
    const diagnostics: Diagnostic[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind !== 'folder') continue;
      const verdict = violatesBarrelRule(node.id, graph, config, opts);
      if (verdict === null) continue;
      diagnostics.push(missingBarrelDiagnostic(node.id, verdict.role, config, context));
    }
    return diagnostics;
  },
};
