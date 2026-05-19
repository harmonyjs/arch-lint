/**
 * @fileoverview collectEntityComments — the ts-morph-free comment model the
 * suppress subsystem consumes. Resolves the entity's anchor declaration and
 * extracts the raw comment blocks above it; when there is no anchor it returns
 * every comment in the file so suppress can scan for a stray @arch-decision.
 */
import { type CommentRange, Node, type SourceFile } from 'ts-morph';
import type { CommentBlock, EntityComments } from '#foundation/types/index.js';
import { findAnchorDeclaration } from './anchor.js';

/** Build the EntityComments model for one entity's entry SourceFile. */
export function collectEntityComments(sourceFile: SourceFile, entityName: string): EntityComments {
  const anchor = findAnchorDeclaration(sourceFile, entityName);
  if (anchor === null) {
    return { anchor: 'absent', fileComments: collectAllComments(sourceFile) };
  }
  return { anchor: 'resolved', comments: collectAnchorComments(anchor) };
}

/** Build a CommentBlock from one ts-morph comment range. */
function commentBlockOf(
  range: CommentRange,
  sourceFile: SourceFile,
  fullText: string,
  distanceLines: number,
): CommentBlock {
  const start = sourceFile.getLineAndColumnAtPos(range.getPos());
  const rawText = fullText.slice(range.getPos(), range.getEnd());
  return {
    rawText,
    kind: rawText.startsWith('/**') ? 'jsdoc' : 'leading-comment',
    location: { file: sourceFile.getFilePath(), line: start.line, column: start.column },
    distanceLines,
  };
}

/** Raw leading comment blocks immediately preceding the anchor declaration. */
function collectAnchorComments(anchor: Node): CommentBlock[] {
  const host = commentHostOf(anchor);
  const sourceFile = host.getSourceFile();
  const fullText = sourceFile.getFullText();
  const declStartLine = host.getStartLineNumber();
  const out: CommentBlock[] = [];
  for (const range of host.getLeadingCommentRanges()) {
    const endLine = sourceFile.getLineAndColumnAtPos(range.getEnd()).line;
    out.push(commentBlockOf(range, sourceFile, fullText, declStartLine - endLine - 1));
  }
  return out;
}

/** Every comment in the file, deduplicated by start position. */
function collectAllComments(sourceFile: SourceFile): CommentBlock[] {
  const fullText = sourceFile.getFullText();
  const seen = new Set<number>();
  const out: CommentBlock[] = [];
  for (const node of [sourceFile, ...sourceFile.getDescendants()]) {
    for (const range of [...node.getLeadingCommentRanges(), ...node.getTrailingCommentRanges()]) {
      const pos = range.getPos();
      if (seen.has(pos)) continue;
      seen.add(pos);
      out.push(commentBlockOf(range, sourceFile, fullText, 0));
    }
  }
  return out;
}

/**
 * Resolve the node that actually carries leading comments. For `export const`/
 * `let` the comment attaches to the ancestor statement, not the declaration.
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
