/**
 * @fileoverview Effective tsconfig resolver (with extends resolution) and positions of
 * compilerOptions keys (decision D5 / A3).
 */
import { Project, Node, SyntaxKind } from 'ts-morph';
import type { Location } from '../../types.js';

/** An effective tsconfig: option values plus key positions. */
export interface EffectiveTsconfig {
  getOption(name: string): unknown;
  keyLocation(name: string): Location;
}

/** Finds a property by key name inside a JSON object literal. */
function findKey(obj: Node | undefined, key: string): Node | undefined {
  if (!obj || !Node.isObjectLiteralExpression(obj)) return undefined;
  for (const prop of obj.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const name = prop.getNameNode();
      if (Node.isStringLiteral(name) && name.getLiteralValue() === key) return prop;
    }
  }
  return undefined;
}

/** The 1-based Location of a node's start, anchored to the tsconfig path. */
function toLocation(node: Node, tsconfigPath: string): Location {
  return {
    file: tsconfigPath,
    line: node.getStartLineNumber(),
    column: node.getStart() - node.getStartLinePos() + 1,
  };
}

/** Resolves the effective compilerOptions and builds access to key positions. */
export function effectiveCompilerOptions(tsconfigPath: string): EffectiveTsconfig {
  const project = new Project({ tsConfigFilePath: tsconfigPath, skipAddingFilesFromTsConfig: true });
  const options = project.getCompilerOptions() as Record<string, unknown>;

  const fileProject = new Project({ useInMemoryFileSystem: false });
  const sf = fileProject.addSourceFileAtPath(tsconfigPath);
  const rootObj = sf
    .getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)
    .find((o) => o.getParentIfKind(SyntaxKind.ExpressionStatement) !== undefined);
  const compilerOptionsProp = findKey(rootObj, 'compilerOptions');
  const compilerObj =
    compilerOptionsProp && Node.isPropertyAssignment(compilerOptionsProp)
      ? compilerOptionsProp.getInitializer()
      : undefined;
  const extendsProp = findKey(rootObj, 'extends');

  return {
    getOption(name) {
      return options[name];
    },
    keyLocation(name) {
      const direct = findKey(compilerObj, name);
      if (direct && Node.isPropertyAssignment(direct)) {
        return toLocation(direct.getNameNode(), tsconfigPath);
      }
      if (extendsProp && Node.isPropertyAssignment(extendsProp)) {
        return toLocation(extendsProp.getNameNode(), tsconfigPath);
      }
      return { file: tsconfigPath, line: 1, column: 1 };
    },
  };
}
