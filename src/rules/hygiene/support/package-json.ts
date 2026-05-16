/**
 * @fileoverview Position-aware package.json parser via the ts JSON-AST — exposes values
 * and the Location of each key (decision D5).
 */
import ts from 'typescript';
import type { Location } from '../../../types.js';

/** A parsed package.json with access to values and key positions. */
export interface PackageJsonDoc {
  getString(key: string): string | null;
  getSection(key: string): Readonly<Record<string, string>> | null;
  keyLocation(key: string): Location | null;
  sectionKeyLocation(section: string, key: string): Location | null;
  rootLocation(): Location;
}

/** Translates an offset into a 1-based line/column Location. */
function offsetToLocation(sf: ts.SourceFile, offset: number): Location {
  const { line, character } = sf.getLineAndCharacterOfPosition(offset);
  return { file: '', line: line + 1, column: character + 1 };
}

/** The root ObjectLiteral of the JSON document, or undefined. */
function rootObject(sf: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  const stmt = sf.statements[0];
  if (stmt && ts.isExpressionStatement(stmt) && ts.isObjectLiteralExpression(stmt.expression)) {
    return stmt.expression;
  }
  return undefined;
}

/** Finds a property by key name in an ObjectLiteral. */
function findProperty(
  obj: ts.ObjectLiteralExpression | undefined,
  key: string,
): ts.PropertyAssignment | undefined {
  if (!obj) return undefined;
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.name) && prop.name.text === key) {
      return prop;
    }
  }
  return undefined;
}

/** Reads a nested ObjectLiteral as a flat string-to-string record. */
function readRecord(obj: ts.ObjectLiteralExpression): Record<string, string> {
  const record: Record<string, string> = {};
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isStringLiteral(prop.name) &&
      ts.isStringLiteral(prop.initializer)
    ) {
      record[prop.name.text] = prop.initializer.text;
    }
  }
  return record;
}

/** Parses a package.json text into a position-aware document. */
export function parsePackageJson(text: string): PackageJsonDoc {
  const sf = ts.parseJsonText('package.json', text);
  const root = rootObject(sf);

  const sectionObject = (key: string): ts.ObjectLiteralExpression | undefined => {
    const prop = findProperty(root, key);
    return prop && ts.isObjectLiteralExpression(prop.initializer) ? prop.initializer : undefined;
  };

  return {
    getString(key) {
      const prop = findProperty(root, key);
      return prop && ts.isStringLiteral(prop.initializer) ? prop.initializer.text : null;
    },
    getSection(key) {
      const obj = sectionObject(key);
      return obj ? readRecord(obj) : null;
    },
    keyLocation(key) {
      const prop = findProperty(root, key);
      return prop ? offsetToLocation(sf, prop.name.getStart(sf)) : null;
    },
    sectionKeyLocation(section, key) {
      const prop = findProperty(sectionObject(section), key);
      return prop ? offsetToLocation(sf, prop.name.getStart(sf)) : null;
    },
    rootLocation() {
      return offsetToLocation(sf, 0);
    },
  };
}
