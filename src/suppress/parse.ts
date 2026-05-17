/**
 * @fileoverview Per-entity @arch-decision parser: locates the anchor declaration, collects
 * nearby comments, scans and interprets them into the entity's valid/malformed suppress data.
 */
import type { SourceFile } from 'ts-morph';
import type { SuppressConfig } from '#config/types.js';
import type { Location, SuppressEntity } from '#types.js';
import { findAnchorDeclaration } from './anchor.js';
import { type CollectedComment, collectSuppressComments } from './collect-comments.js';
import { interpretSuppress } from './interpret.js';
import { hasArchDecisionDirective, scanSuppressText } from './scan-text.js';
import type { EntitySuppressData, MalformedSuppress, ParsedSuppress } from './types.js';

/**
 * Parse every @arch-decision comment attached to one entity. When the entry file has no
 * main export but does carry a stray @arch-decision, that comment is flagged `no-main-export`.
 */
export function parseEntitySuppress(
  entryFile: SourceFile,
  entity: SuppressEntity,
  config: SuppressConfig,
): EntitySuppressData {
  const anchor = findAnchorDeclaration(entryFile, entity.name);
  if (anchor === null) {
    const stray = findStrayMarker(entryFile, config);
    return { valid: [], malformed: stray === null ? [] : [stray] };
  }
  const comments = collectSuppressComments(anchor, config).filter((c) =>
    config.scanLocations.includes(c.kind),
  );
  return interpretAll(comments, config);
}

/** Interpret a list of collected comments into valid/malformed buckets. */
function interpretAll(
  comments: readonly CollectedComment[],
  config: SuppressConfig,
): EntitySuppressData {
  const valid: ParsedSuppress[] = [];
  const malformed: MalformedSuppress[] = [];
  for (const comment of comments) {
    const raw = scanSuppressText(comment.text, config.marker, comment.location);
    if (raw === null) continue;
    const result = interpretSuppress(raw, config);
    if (result.ok) valid.push(result.value);
    else malformed.push(result.value);
  }
  return { valid, malformed };
}

/**
 * Search the file's comments for an @arch-decision directive that could not be anchored.
 * Only comment text is scanned, and only a real directive counts — a marker inside a
 * string literal, ordinary code, or prose (a `@fileoverview` documenting the feature) is
 * not a suppress directive and must be ignored.
 */
function findStrayMarker(entryFile: SourceFile, config: SuppressConfig): MalformedSuppress | null {
  const fullText = entryFile.getFullText();
  const seen = new Set<number>();
  for (const node of [entryFile, ...entryFile.getDescendants()]) {
    for (const range of [...node.getLeadingCommentRanges(), ...node.getTrailingCommentRanges()]) {
      const pos = range.getPos();
      if (seen.has(pos)) continue;
      seen.add(pos);
      const commentText = fullText.slice(pos, range.getEnd());
      if (!hasArchDecisionDirective(commentText, config.marker)) continue;
      const { line, column } = entryFile.getLineAndColumnAtPos(
        pos + commentText.indexOf(config.marker),
      );
      const location: Location = { file: entryFile.getFilePath(), line, column };
      return { kind: 'no-main-export', ruleId: null, reason: undefined, location };
    }
  }
  return null;
}
