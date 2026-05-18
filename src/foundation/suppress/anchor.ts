/**
 * @fileoverview Resolves the anchor declaration for an entity's @arch-decision suppress:
 * the basename-named main export of the entry file, with a default-export fallback.
 */
import { Node, type SourceFile } from 'ts-morph';

/**
 * Find the main-export anchor of an entity. Prefers the export whose name equals
 * `entityName`; falls back to the default export when no name matches.
 */
export function findAnchorDeclaration(sourceFile: SourceFile, entityName: string): Node | null {
  const named = findNamedExport(sourceFile, entityName);
  if (named !== null) return named;
  return findDefaultExport(sourceFile);
}

/** Find an exported declaration whose own name equals `entityName`. */
function findNamedExport(sourceFile: SourceFile, entityName: string): Node | null {
  for (const [name, decls] of sourceFile.getExportedDeclarations()) {
    if (name !== entityName) continue;
    const decl = decls[0];
    if (decl !== undefined) return decl;
  }
  return null;
}

/** Find the `export default` declaration, if any. */
export function findDefaultExport(sourceFile: SourceFile): Node | null {
  for (const [name, decls] of sourceFile.getExportedDeclarations()) {
    if (name !== 'default') continue;
    const decl = decls[0];
    if (decl !== undefined) return decl;
  }
  const assignment = sourceFile.getStatements().find((s) => Node.isExportAssignment(s));
  return assignment ?? null;
}
