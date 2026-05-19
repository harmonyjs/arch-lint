/**
 * @fileoverview collectEntityComments — the ts-morph-free comment model the
 * suppress subsystem consumes. Resolves the entity's anchor declaration and
 * extracts the raw comment blocks above it; when there is no anchor it returns
 * every comment in the file so suppress can scan for a stray @arch-decision.
 */
import { Node, type SourceFile } from 'ts-morph';
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

/** Raw leading comment blocks immediately preceding the anchor declaration. */
function collectAnchorComments(anchor: Node): CommentBlock[] {
  const host = commentHostOf(anchor);
  const sourceFile = host.getSourceFile();
  const filePath = sourceFile.getFilePath();
  const fullText = sourceFile.getFullText();
  const declStartLine = host.getStartLineNumber();
  const out: CommentBlock[] = [];
  for (const range of host.getLeadingCommentRanges()) {
    const start = sourceFile.getLineAndColumnAtPos(range.getPos());
    const endLine = sourceFile.getLineAndColumnAtPos(range.getEnd()).line;
    const rawText = fullText.slice(range.getPos(), range.getEnd());
    out.push({
      rawText,
      kind: rawText.startsWith('/**') ? 'jsdoc' : 'leading-comment',
      location: { file: filePath, line: start.line, column: start.column },
      distanceLines: declStartLine - endLine - 1,
    });
  }
  return out;
}

/** Every comment in the file, deduplicated by start position. */
function collectAllComments(sourceFile: SourceFile): CommentBlock[] {
  const filePath = sourceFile.getFilePath();
  const fullText = sourceFile.getFullText();
  const seen = new Set<number>();
  const out: CommentBlock[] = [];
  for (const node of [sourceFile, ...sourceFile.getDescendants()]) {
    for (const range of [...node.getLeadingCommentRanges(), ...node.getTrailingCommentRanges()]) {
      const pos = range.getPos();
      if (seen.has(pos)) continue;
      seen.add(pos);
      const rawText = fullText.slice(pos, range.getEnd());
      const start = sourceFile.getLineAndColumnAtPos(pos);
      out.push({
        rawText,
        kind: rawText.startsWith('/**') ? 'jsdoc' : 'leading-comment',
        location: { file: filePath, line: start.line, column: start.column },
        distanceLines: 0,
      });
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
