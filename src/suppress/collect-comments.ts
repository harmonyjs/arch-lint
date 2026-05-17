/**
 * @fileoverview Collects leading comments and JSDoc blocks positioned above a declaration
 * within the configured maxDistanceLines window, for @arch-decision suppress scanning.
 */
import { Node } from 'ts-morph';
import type { SuppressConfig } from '#config/types.js';
import type { Location } from '#types.js';

/** Where a collected comment lived — matches the SuppressConfig.scanLocations vocabulary. */
export type CommentKind = 'leading-comment' | 'jsdoc';

/** A comment block found above a declaration: its raw text, kind and start location. */
export interface CollectedComment {
  readonly text: string;
  readonly kind: CommentKind;
  readonly location: Location;
}

/**
 * Collect comment blocks (line, block, JSDoc) immediately preceding `decl`, keeping only
 * those whose gap to the declaration is at most `maxDistanceLines` lines.
 */
export function collectSuppressComments(decl: Node, config: SuppressConfig): CollectedComment[] {
  const host = commentHostOf(decl);
  const sourceFile = host.getSourceFile();
  const filePath = sourceFile.getFilePath();
  const fullText = sourceFile.getFullText();
  const declStartLine = host.getStartLineNumber();
  const out: CollectedComment[] = [];
  for (const range of host.getLeadingCommentRanges()) {
    const startLine = sourceFile.getLineAndColumnAtPos(range.getPos()).line;
    const endLine = sourceFile.getLineAndColumnAtPos(range.getEnd()).line;
    if (declStartLine - endLine - 1 > config.maxDistanceLines) continue;
    const rawText = fullText.slice(range.getPos(), range.getEnd());
    out.push({
      text: stripCommentGlyphs(rawText),
      kind: rawText.startsWith('/**') ? 'jsdoc' : 'leading-comment',
      location: { file: filePath, line: startLine, column: 1 },
    });
  }
  return out;
}

/**
 * Resolve the node that actually carries leading comments. For `export const`/`let`
 * the comment attaches to the ancestor statement, not the VariableDeclaration node.
 */
function commentHostOf(decl: Node): Node {
  let node: Node = decl;
  for (;;) {
    if (node.getLeadingCommentRanges().length > 0) return node;
    const parent = node.getParent();
    if (parent === undefined || Node.isSourceFile(parent)) return node;
    node = parent;
  }
}

/** Remove `//`, block delimiters and JSDoc `*` glyphs, collapsing into plain text. */
function stripCommentGlyphs(raw: string): string {
  return raw
    .replace(/^\/\*\*?/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*\/\/+/, '')
        .replace(/^\s*\*+/, '')
        .trim(),
    )
    .filter((line) => line.length > 0)
    .join(' ')
    .trim();
}
