/**
 * @fileoverview barrel-narrow-export rule — a component-folder barrel re-exports only
 * the folder's own entity (decision D7). Reads AST from the RuleContext project (D9).
 */
import { folderOf, segmentsOf } from '#entity-id/index.js';
import type { ConsumerGraph } from '#graph/types.js';
import { fileNodeIds, sourceFileFor } from '#rules/ast/find-source-file.js';
import { importsOf } from '#rules/ast/import-info.js';
import { isBarrelFile } from '#rules/ast/node-helpers.js';
import type { SyntacticRule } from '#rules/types.js';
import type { Diagnostic, Location } from '#types.js';

/** Options of barrel-narrow-export (D7). */
export interface BarrelNarrowExportOptions {
  readonly allowPrefixedConstants: boolean;
  readonly allowTypeReexports: boolean;
}

/** Default options — the lenient defaults applied when the config omits per-rule options. */
const DEFAULTS: BarrelNarrowExportOptions = {
  allowPrefixedConstants: true,
  allowTypeReexports: true,
};

/**
 * The component-folder entity name a barrel legitimately re-exports, or null when
 * the barrel's folder is not a component folder (a role-folder barrel — exempt).
 */
function componentEntityName(barrelId: string, graph: ConsumerGraph): string | null {
  const folderId = folderOf(barrelId);
  const folder = graph.nodes.get(folderId);
  if (folder === undefined || folder.kind !== 'folder') return null;
  const entityName = segmentsOf(folderId).at(-1) ?? null;
  if (entityName === null) return null;
  const hasEntry =
    graph.nodes.has(`${folderId}/${entityName}.ts`) ||
    graph.nodes.has(`${folderId}/${entityName}.tsx`);
  return hasEntry ? entityName : null;
}

/** True when a re-exported binding is allowed for the folder's entity. */
function isAllowedBinding(binding: string, entityName: string, allowPrefixed: boolean): boolean {
  if (binding === entityName) return true;
  return allowPrefixed && binding.startsWith(entityName);
}

/** The foreign re-export bindings of a barrel, plus the first offending location. */
function foreignReexports(
  barrelId: string,
  project: import('ts-morph').Project,
  entityName: string,
  options: BarrelNarrowExportOptions,
): { readonly offenders: readonly string[]; readonly location: Location } {
  const sf = sourceFileFor(project, barrelId);
  const offenders: string[] = [];
  let location: Location = { file: barrelId, line: 1, column: 1 };
  if (sf === undefined) return { offenders, location };
  for (const imp of importsOf(sf)) {
    if (imp.kind !== 'reexport') continue;
    if (imp.typeOnly && options.allowTypeReexports) continue;
    const bad = imp.named.filter(
      (n) => !isAllowedBinding(n, entityName, options.allowPrefixedConstants),
    );
    if (bad.length > 0 && offenders.length === 0) location = imp.location;
    offenders.push(...bad);
  }
  return { offenders, location };
}

/** One barrel's narrow-export finding — the offending re-exports and where to report them. */
interface NarrowExportFinding {
  readonly folderId: string;
  readonly entityName: string;
  readonly offenders: readonly string[];
  readonly location: Location;
}

/** Builds the narrow-export diagnostic for one barrel. */
function narrowExportDiagnostic(
  finding: NarrowExportFinding,
  options: BarrelNarrowExportOptions,
  ruleId: string,
  severity: Diagnostic['severity'],
): Diagnostic {
  const { folderId, entityName, offenders, location } = finding;
  const prefixClause = options.allowPrefixedConstants ? ` and ${entityName}-prefixed bindings` : '';
  return {
    ruleId,
    severity,
    entity: folderId,
    message: `Barrel of '${folderId}' re-exports foreign bindings: ${offenders.join(', ')}`,
    actual: `re-exports ${offenders.join(', ')}`,
    expected: `re-export only '${entityName}'${prefixClause}`,
    reason: 'A component-folder barrel must expose only its own entity, not aggregate others',
    suggestions: [
      {
        action: 'custom',
        rationale: `Move foreign re-exports out of ${folderId}'s barrel or relocate those entities`,
      },
    ],
    location,
  };
}

/** D7: a component-folder barrel re-exports only the folder's entity. */
export const barrelNarrowExport: SyntacticRule<BarrelNarrowExportOptions> = {
  id: 'barrel-narrow-export',
  pack: 'barrels',
  engine: 'syntactic',
  defaultSeverity: 'warning',
  check: (graph, config, context): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<BarrelNarrowExportOptions>) };
    const diagnostics: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      if (!isBarrelFile(fileId, config.conventions)) continue;
      const entityName = componentEntityName(fileId, graph);
      if (entityName === null) continue;
      const folderId = folderOf(fileId);
      const { offenders, location } = foreignReexports(fileId, context.project, entityName, opts);
      if (offenders.length === 0) continue;
      diagnostics.push(
        narrowExportDiagnostic(
          { folderId, entityName, offenders, location },
          opts,
          context.ruleId,
          context.severity,
        ),
      );
    }
    return diagnostics;
  },
};
