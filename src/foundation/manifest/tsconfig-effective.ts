/**
 * @fileoverview Effective tsconfig resolver (with extends resolution and the defaults of
 * the project's TypeScript major) and positions of compilerOptions keys (decision D5 / A3).
 */
import { Node, Project, SyntaxKind, ts } from 'ts-morph';
import type { Location } from '#foundation/types/index.js';

/** An effective tsconfig: option values plus key positions. */
export interface EffectiveTsconfig {
  getOption(name: string): unknown;
  keyLocation(name: string): Location;
}

/** Flags the compiler treats as on when left unset, by the major that made that the default. */
const ON_BY_DEFAULT_SINCE: Readonly<Record<string, number>> = {
  strict: 6,
  noUncheckedSideEffectImports: 6,
  alwaysStrict: 6,
  esModuleInterop: 6,
  allowSyntheticDefaultImports: 6,
  stableTypeOrdering: 7,
};

/** Flags the compiler derives from `strict` when left unset, read from its own option table. */
const STRICT_FAMILY: ReadonlySet<string> = new Set(
  (
    ts as unknown as { optionDeclarations: readonly { name: string; strictFlag?: boolean }[] }
  ).optionDeclarations
    .filter((option) => option.strictFlag === true)
    .map((option) => option.name),
);

/** The value the project's compiler gives `name` when the tsconfig leaves it unset. */
function compilerDefault(name: string, typescriptMajor: number | undefined): true | undefined {
  const since = ON_BY_DEFAULT_SINCE[name];
  return since !== undefined && typescriptMajor !== undefined && typescriptMajor >= since
    ? true
    : undefined;
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

/**
 * Resolves the effective compilerOptions and builds access to key positions. An option
 * the file leaves unset takes the default of `typescriptMajor`; an unknown major applies none.
 */
export function effectiveCompilerOptions(
  tsconfigPath: string,
  typescriptMajor: number | undefined,
): EffectiveTsconfig {
  const project = new Project({
    tsConfigFilePath: tsconfigPath,
    skipAddingFilesFromTsConfig: true,
  });
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

  const getOption = (name: string): unknown => {
    const own = options[name] ?? compilerDefault(name, typescriptMajor);
    if (own !== undefined || !STRICT_FAMILY.has(name)) return own;
    return getOption('strict') === true ? true : undefined;
  };

  return {
    getOption,
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
