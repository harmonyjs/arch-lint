/**
 * @fileoverview no-upward-relative-import rule — a `../`-climbing import specifier hides
 * a cross-folder dependency that belongs in a named alias namespace. Reads the LITERAL
 * specifier text from the AST (decision §4.1): after the alias migration `#graph/x.js`
 * and `../../graph/x.js` resolve to the same graph edge, so only the source text can
 * tell them apart.
 */
import { dirOf } from '#foundation/entity-id/index.js';
import type { Diagnostic } from '#foundation/types/index.js';
import { fileNodeIds } from '#platform/ast/file-nodes.js';
import { type ImportInfo, importsOf } from '#platform/ast/import-info.js';
import { dedupByFingerprint } from '#platform/engine/dedup-diagnostics.js';
import type { SyntacticRule, SyntacticRuleContext } from '#platform/engine/types.js';
import { sourceFileFor } from '#platform/graph/index.js';

/** Tunable options of the no-upward-relative-import rule. */
export interface NoUpwardRelativeImportOptions {
  /**
   * The subpath-alias prefix named in the suggestion text. Does NOT affect
   * detection — the trigger is always the literal `../` specifier prefix.
   */
  readonly aliasPrefix: string;
}

const DEFAULTS: NoUpwardRelativeImportOptions = { aliasPrefix: '#' };

/**
 * Matches a module specifier that climbs out of its own directory: a `../…`
 * path or the bare `..` (the parent directory itself). Does NOT match `..foo`
 * (a filename), `./…`, `#…` aliases, or bare package specifiers.
 */
const CLIMBING = /^\.\.(\/|$)/;

/** Per-run settings the diagnostic builder needs — resolved options plus the source root. */
interface Settings {
  readonly aliasPrefix: string;
  readonly sourceRoot: string;
}

/**
 * Resolves a `../`-climbing specifier against the importing file's directory,
 * collapsing `.`/`..` segments over the POSIX node id. Returns null when the
 * path climbs above the root (no resolvable in-tree target).
 */
function resolveClimbing(fromFile: string, specifier: string): string | null {
  const segs = dirOf(fromFile)
    .split('/')
    .filter((s) => s !== '');
  for (const part of specifier.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (segs.length === 0) return null;
      segs.pop();
    } else {
      segs.push(part);
    }
  }
  return segs.join('/');
}

/**
 * The alias-import suggestion for a climbing specifier. When the specifier
 * resolves to a path inside `sourceRoot`, the concrete `${aliasPrefix}${target}`
 * path is named; otherwise the suggestion stays generic.
 */
function suggestionFor(fromFile: string, specifier: string, settings: Settings): string {
  const resolved = resolveClimbing(fromFile, specifier);
  const root = `${settings.sourceRoot}/`;
  if (resolved?.startsWith(root)) {
    return `replace "${specifier}" with the alias import "${settings.aliasPrefix}${resolved.slice(root.length)}"`;
  }
  return `replace "${specifier}" with an ${settings.aliasPrefix}-subpath alias import`;
}

/** Builds the diagnostic for one climbing import in `fileId`. */
function climbingDiagnostic(
  fileId: string,
  imp: ImportInfo,
  settings: Settings,
  context: SyntacticRuleContext<NoUpwardRelativeImportOptions>,
): Diagnostic {
  return {
    ruleId: context.ruleId,
    severity: context.severity,
    entity: fileId,
    fingerprint: `no-upward-relative-import#${fileId}#${imp.specifier}`,
    message: `${fileId} climbs out of its directory with "${imp.specifier}"`,
    expected: `an ${settings.aliasPrefix}-subpath alias import`,
    actual: imp.specifier,
    reason:
      'a climbing relative path hides a cross-folder dependency that belongs in a named alias namespace',
    suggestions: [
      {
        action: 'custom',
        rationale: suggestionFor(fileId, imp.specifier, settings),
      },
    ],
    location: imp.location,
  };
}

/** Rule: a `../`-climbing import/re-export specifier must be a named alias import instead. */
export const noUpwardRelativeImport: SyntacticRule<NoUpwardRelativeImportOptions> = {
  id: 'no-upward-relative-import',
  pack: 'structure',
  engine: 'syntactic',
  defaultSeverity: 'warning',
  check: (graph, config, context): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<NoUpwardRelativeImportOptions>) };
    const settings: Settings = {
      aliasPrefix: opts.aliasPrefix,
      sourceRoot: config.project.sourceRoot,
    };
    const diagnostics: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      const sf = sourceFileFor(context.project, fileId);
      if (sf === undefined) continue;
      for (const imp of importsOf(sf)) {
        if (!CLIMBING.test(imp.specifier)) continue;
        diagnostics.push(climbingDiagnostic(fileId, imp, settings, context));
      }
    }
    return dedupByFingerprint(diagnostics);
  },
};
