/**
 * @fileoverview Normalized parse of a file's import/export constructs for syntactic rules.
 */
import type { ExportDeclaration, ExportSpecifier, ImportDeclaration, SourceFile } from 'ts-morph';
import type { Location } from '#types.js';

/** A normalized import or re-export construct of a file. */
export interface ImportInfo {
  readonly kind: 'import' | 'reexport';
  readonly specifier: string;
  readonly typeOnly: boolean;
  readonly named: readonly string[];
  readonly hasDefault: boolean;
  readonly hasNamespace: boolean;
  readonly sideEffectOnly: boolean;
  readonly wildcard: boolean;
  readonly namespaceName: string | null;
  readonly location: Location;
}

/** 1-based source location of a declaration, with the file path. */
function locOf(decl: ImportDeclaration | ExportDeclaration, file: string): Location {
  const sf = decl.getSourceFile();
  const { line, column } = sf.getLineAndColumnAtPos(decl.getStart());
  return { file, line, column };
}

/** Normalizes an import declaration into an ImportInfo. */
function fromImport(decl: ImportDeclaration, file: string): ImportInfo {
  const named = decl.getNamedImports().map((n) => n.getName());
  const hasDefault = decl.getDefaultImport() !== undefined;
  const hasNamespace = decl.getNamespaceImport() !== undefined;
  return {
    kind: 'import',
    specifier: decl.getModuleSpecifierValue(),
    typeOnly: decl.isTypeOnly(),
    named,
    hasDefault,
    hasNamespace,
    sideEffectOnly: !hasDefault && !hasNamespace && named.length === 0,
    wildcard: false,
    namespaceName: null,
    location: locOf(decl, file),
  };
}

/** The exported identifier of a re-export specifier — its alias, else its source name. */
function exportedName(spec: ExportSpecifier): string {
  return spec.getAliasNode()?.getText() ?? spec.getNameNode().getText();
}

/** Normalizes an `export ... from` declaration; null for a local export with no from. */
function fromExport(decl: ExportDeclaration, file: string): ImportInfo | null {
  const spec = decl.getModuleSpecifierValue();
  if (spec === undefined) return null;
  const ns = decl.getNamespaceExport();
  return {
    kind: 'reexport',
    specifier: spec,
    typeOnly: decl.isTypeOnly(),
    named: decl.getNamedExports().map(exportedName),
    hasDefault: false,
    hasNamespace: false,
    sideEffectOnly: false,
    wildcard: decl.isNamespaceExport(),
    namespaceName: ns ? ns.getName() : null,
    location: locOf(decl, file),
  };
}

/**
 * Returns every import/re-export construct of a file in normalized form. Local
 * `export { … }` declarations without `from` are skipped — they are not import edges.
 */
export function importsOf(sf: SourceFile): ImportInfo[] {
  const file = sf.getFilePath();
  const out: ImportInfo[] = [];
  for (const decl of sf.getImportDeclarations()) out.push(fromImport(decl, file));
  for (const decl of sf.getExportDeclarations()) {
    const info = fromExport(decl, file);
    if (info) out.push(info);
  }
  return out;
}
