/**
 * @fileoverview Syntactic scanners over a source file — finds native exported
 * declarations and enumerates a file's own export names without the type-checker.
 */
import { Node, type SourceFile } from 'ts-morph';
import type { Resolution } from '#graph/types.js';

/** True if a syntax node carries the `export` modifier. */
function hasExport(node: Node): boolean {
  return Node.isModifierable(node) && node.hasModifier('export');
}

/** True if a syntax node carries the `default` modifier. */
function hasDefault(node: Node): boolean {
  return Node.isModifierable(node) && node.hasModifier('default');
}

/** Matches a top-level declaration named `name`, returning whether it is type-only. */
function declarationMatch(statement: Node, name: string): { typeOnly: boolean } | undefined {
  if (Node.isVariableStatement(statement)) {
    return statement.getDeclarations().some((d) => d.getName() === name)
      ? { typeOnly: false }
      : undefined;
  }
  if (Node.isFunctionDeclaration(statement) || Node.isClassDeclaration(statement)) {
    return statement.getName() === name ? { typeOnly: false } : undefined;
  }
  if (Node.isInterfaceDeclaration(statement) || Node.isTypeAliasDeclaration(statement)) {
    return statement.getName() === name ? { typeOnly: true } : undefined;
  }
  if (Node.isEnumDeclaration(statement)) {
    return statement.getName() === name ? { typeOnly: false } : undefined;
  }
  return undefined;
}

/** §5.1 1a: a top-level value/type declaration named `name` with `export`. */
function scanExportedDeclaration(
  sourceFile: SourceFile,
  file: string,
  name: string,
): Resolution | undefined {
  for (const statement of sourceFile.getStatements()) {
    if (!hasExport(statement)) {
      continue;
    }
    const match = declarationMatch(statement, name);
    if (match !== undefined) {
      return { kind: 'resolved', file, symbol: name, typeOnly: match.typeOnly };
    }
  }
  return undefined;
}

/** Finds a top-level declaration named `name` regardless of `export` modifier. */
function findLocalDeclaration(
  sourceFile: SourceFile,
  name: string,
): { typeOnly: boolean } | undefined {
  for (const statement of sourceFile.getStatements()) {
    const match = declarationMatch(statement, name);
    if (match !== undefined) {
      return match;
    }
  }
  return undefined;
}

/** §5.1 1b/1c: local `export { orig as name }` / `export { name }` without `from`. */
function scanLocalReExport(
  sourceFile: SourceFile,
  file: string,
  name: string,
): Resolution | undefined {
  for (const statement of sourceFile.getStatements()) {
    if (!Node.isExportDeclaration(statement) || statement.getModuleSpecifier() !== undefined) {
      continue;
    }
    for (const spec of statement.getNamedExports()) {
      const aliasOrName = spec.getAliasNode()?.getText() ?? spec.getNameNode().getText();
      if (aliasOrName !== name) {
        continue;
      }
      const originalName = spec.getNameNode().getText();
      const hopTypeOnly = statement.isTypeOnly() || spec.isTypeOnly();
      const local = findLocalDeclaration(sourceFile, originalName);
      if (local !== undefined) {
        return {
          kind: 'resolved',
          file,
          symbol: originalName,
          typeOnly: hopTypeOnly || local.typeOnly,
        };
      }
      return { kind: 'resolved', file, symbol: name, typeOnly: hopTypeOnly };
    }
  }
  return undefined;
}

/** A local `export { x as default }` binding within `statement`, if one exists. */
function localDefaultReExport(statement: Node): { typeOnly: boolean } | undefined {
  if (!Node.isExportDeclaration(statement) || statement.getModuleSpecifier() !== undefined) {
    return undefined;
  }
  for (const spec of statement.getNamedExports()) {
    if ((spec.getAliasNode()?.getText() ?? spec.getNameNode().getText()) === 'default') {
      return { typeOnly: statement.isTypeOnly() || spec.isTypeOnly() };
    }
  }
  return undefined;
}

/** The default export a single top-level statement contributes, if any. */
function statementDefaultExport(statement: Node): { typeOnly: boolean } | undefined {
  if (Node.isExportAssignment(statement) && !statement.isExportEquals()) {
    return { typeOnly: false };
  }
  if (
    (Node.isFunctionDeclaration(statement) || Node.isClassDeclaration(statement)) &&
    hasExport(statement) &&
    hasDefault(statement)
  ) {
    return { typeOnly: false };
  }
  return localDefaultReExport(statement);
}

/** §5.1 1c: `export default <decl>` — returns whether the target is type-only. */
function findDefaultExport(sourceFile: SourceFile): { typeOnly: boolean } | undefined {
  for (const statement of sourceFile.getStatements()) {
    const found = statementDefaultExport(statement);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

/**
 * §5.1 step 1: a native declaration of `name` inside `sourceFile` — an exported
 * declaration (1a), a local `export { x as y }` (1b), or `export default` (1c).
 */
export function findNativeDeclaration(
  sourceFile: SourceFile,
  file: string,
  name: string,
): Resolution | undefined {
  if (name === 'default') {
    const def = findDefaultExport(sourceFile);
    return def === undefined
      ? undefined
      : { kind: 'resolved', file, symbol: 'default', typeOnly: def.typeOnly };
  }
  return (
    scanExportedDeclaration(sourceFile, file, name) ?? scanLocalReExport(sourceFile, file, name)
  );
}

/** Names a file exports — native declarations plus named/wildcard re-export bindings. */
export function ownExportNames(sourceFile: SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of sourceFile.getStatements()) {
    collectStatementExportNames(statement, names);
  }
  return names;
}

/** Adds the names of an exported `export const a, b` variable statement. */
function collectVariableExportNames(statement: Node, names: Set<string>): void {
  if (Node.isVariableStatement(statement) && hasExport(statement)) {
    for (const decl of statement.getDeclarations()) {
      names.add(decl.getName());
    }
  }
}

/** Adds the name of an exported named declaration, plus `default` when so marked. */
function collectNamedDeclarationExportNames(statement: Node, names: Set<string>): void {
  const isNamedDeclaration =
    Node.isFunctionDeclaration(statement) ||
    Node.isClassDeclaration(statement) ||
    Node.isInterfaceDeclaration(statement) ||
    Node.isTypeAliasDeclaration(statement) ||
    Node.isEnumDeclaration(statement);
  if (!isNamedDeclaration || !hasExport(statement)) {
    return;
  }
  const declName = statement.getName();
  if (declName !== undefined) {
    names.add(declName);
  }
  if (hasDefault(statement)) {
    names.add('default');
  }
}

/** Adds the names contributed by `export default` and `export { ... }` statements. */
function collectExportClauseNames(statement: Node, names: Set<string>): void {
  if (Node.isExportAssignment(statement) && !statement.isExportEquals()) {
    names.add('default');
  }
  if (Node.isExportDeclaration(statement)) {
    for (const spec of statement.getNamedExports()) {
      names.add(spec.getAliasNode()?.getText() ?? spec.getNameNode().getText());
    }
    const nsName = statement.getNamespaceExport()?.getName();
    if (nsName !== undefined) {
      names.add(nsName);
    }
  }
}

/** Adds the export names a single top-level statement contributes to `names`. */
function collectStatementExportNames(statement: Node, names: Set<string>): void {
  collectVariableExportNames(statement, names);
  collectNamedDeclarationExportNames(statement, names);
  collectExportClauseNames(statement, names);
}
