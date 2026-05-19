/**
 * @fileoverview lib-purity rule — forbids files of selected segments from importing denied
 * external packages. Scans AST import/export declarations via the RuleContext project (D9).
 */
import picomatch from 'picomatch';
import type { ExportDeclaration, ImportDeclaration, SourceFile } from 'ts-morph';
import { sourceFileFor } from '#foundation/ts-project/index.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { SyntacticRule } from '#platform/engine/types.js';

interface LibPurityOptions {
  readonly forbiddenImports?: readonly string[];
  readonly enforceForSegments?: 'all' | readonly string[];
}

/** One external (bare-package) import binding found in a source file. */
interface ExternalImport {
  readonly specifier: string;
  readonly symbol: string;
  readonly line: number;
}

/** True when a module specifier targets an external package (not relative/absolute). */
function isExternalSpecifier(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('/');
}

/** Named/default/namespace symbols introduced by an import declaration. */
function importSymbols(decl: ImportDeclaration): readonly string[] {
  const symbols = decl.getNamedImports().map((n) => n.getNameNode().getText());
  if (decl.getDefaultImport() !== undefined) symbols.push('default');
  const ns = decl.getNamespaceImport();
  if (ns !== undefined) symbols.push(ns.getText());
  if (symbols.length === 0) symbols.push(''); // side-effect-only import
  return symbols;
}

/** Symbols re-exported by an `export ... from` declaration. */
function exportSymbols(decl: ExportDeclaration): readonly string[] {
  const named = decl.getNamedExports().map((n) => n.getNameNode().getText());
  return named.length > 0 ? named : [''];
}

/** Collects every external import binding declared in `file`. */
function externalImportsOf(file: SourceFile): readonly ExternalImport[] {
  const out: ExternalImport[] = [];
  for (const decl of file.getImportDeclarations()) {
    const specifier = decl.getModuleSpecifierValue();
    if (!isExternalSpecifier(specifier)) continue;
    const line = decl.getStartLineNumber();
    for (const symbol of importSymbols(decl)) out.push({ specifier, symbol, line });
  }
  for (const decl of file.getExportDeclarations()) {
    const specifier = decl.getModuleSpecifierValue();
    if (specifier === undefined || !isExternalSpecifier(specifier)) continue;
    const line = decl.getStartLineNumber();
    for (const symbol of exportSymbols(decl)) out.push({ specifier, symbol, line });
  }
  return out;
}

/** True when `file` is in scope for the given enforceForSegments setting. */
function inScope(file: string, segments: 'all' | readonly string[]): boolean {
  if (segments === 'all') return true;
  const pathSegments = file.split('/');
  return segments.some((seg) => pathSegments.includes(seg));
}

/** Build the diagnostic for one forbidden external import. */
function forbiddenDiagnostic(
  file: string,
  imp: ExternalImport,
  severity: Diagnostic['severity'],
): Diagnostic {
  return {
    ruleId: 'lib-purity',
    severity,
    entity: file,
    fingerprint: `${file}#${imp.specifier}#${imp.symbol}`,
    message: `${file} imports forbidden package ${imp.specifier}`,
    actual: imp.specifier,
    reason: `package ${imp.specifier} is denied for this file`,
    suggestions: [{ action: 'custom', rationale: `remove the import of ${imp.specifier}` }],
    location: { file, line: imp.line, column: 1 },
  };
}

/** Rule: files of denied segments must not import forbidden external packages. */
export const libPurityRule: SyntacticRule = {
  id: 'lib-purity',
  pack: 'layers',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph, _config, context): Diagnostic[] => {
    const options = context.options as LibPurityOptions;
    const forbidden = options.forbiddenImports ?? [];
    if (forbidden.length === 0) return [];
    const isForbidden = picomatch(forbidden as string[]);
    const segments = options.enforceForSegments ?? 'all';
    const out: Diagnostic[] = [];
    const seen = new Set<string>();
    for (const [id, node] of graph.nodes) {
      if (node.kind !== 'file' || !inScope(id, segments)) continue;
      const file = sourceFileFor(context.project, id);
      if (file === undefined) continue;
      for (const imp of externalImportsOf(file)) {
        if (!isForbidden(imp.specifier)) continue;
        const fingerprint = `${id}#${imp.specifier}#${imp.symbol}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        out.push(forbiddenDiagnostic(id, imp, context.severity));
      }
    }
    return out;
  },
};
