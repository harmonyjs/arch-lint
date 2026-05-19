/**
 * @fileoverview Per-entity @arch-decision parser: interprets the ts-morph-free
 * comment model into the entity's valid/malformed suppress data.
 */
import type { SuppressConfig } from '#foundation/config/types.js';
import type { CommentBlock, EntityComments, Location } from '#foundation/types/index.js';
import { interpretSuppress } from './interpret.js';
import { hasArchDecisionDirective, scanSuppressText } from './scan-text.js';
import { stripCommentGlyphs } from './strip.js';
import type { EntitySuppressData, MalformedSuppress, ParsedSuppress } from './types.js';

/**
 * Parse every @arch-decision comment of one entity. When the entry file has no
 * anchor but carries a stray @arch-decision, that comment is flagged
 * `no-main-export`.
 */
export function parseEntitySuppress(
  comments: EntityComments,
  config: SuppressConfig,
): EntitySuppressData {
  if (comments.anchor === 'absent') {
    const stray = findStrayMarker(comments.fileComments, config);
    return { valid: [], malformed: stray === null ? [] : [stray] };
  }
  const inScope = comments.comments.filter(
    (c) => config.scanLocations.includes(c.kind) && c.distanceLines <= config.maxDistanceLines,
  );
  return interpretAll(inScope, config);
}

/** Interpret a list of in-scope comment blocks into valid/malformed buckets. */
function interpretAll(
  comments: readonly CommentBlock[],
  config: SuppressConfig,
): EntitySuppressData {
  const valid: ParsedSuppress[] = [];
  const malformed: MalformedSuppress[] = [];
  for (const comment of comments) {
    const text = stripCommentGlyphs(comment.rawText);
    // §9: a directive reports at column 1 (the anchor-line convention), not the comment's true column.
    const location: Location = { ...comment.location, column: 1 };
    const raw = scanSuppressText(text, config.marker, location);
    if (raw === null) continue;
    const result = interpretSuppress(raw, config);
    if (result.ok) valid.push(result.value);
    else malformed.push(result.value);
  }
  return { valid, malformed };
}

/**
 * Find the first file comment carrying a real @arch-decision directive that
 * could not be anchored. A marker inside a string literal never reaches here
 * (the producer collects comments only); a bare marker in prose has no
 * `[ruleId]?:` opener and is not a directive.
 */
function findStrayMarker(
  fileComments: readonly CommentBlock[],
  config: SuppressConfig,
): MalformedSuppress | null {
  for (const comment of fileComments) {
    if (!hasArchDecisionDirective(comment.rawText, config.marker)) continue;
    const markerOffset = comment.rawText.indexOf(config.marker);
    const location = offsetToLocation(comment.location, comment.rawText, markerOffset);
    return { kind: 'no-main-export', ruleId: null, reason: undefined, location };
  }
  return null;
}

/** Absolute Location of `offset` within `text`, given the text's start Location. */
function offsetToLocation(start: Location, text: string, offset: number): Location {
  const before = text.slice(0, offset);
  const lastNewline = before.lastIndexOf('\n');
  const line = start.line + (before.match(/\n/g)?.length ?? 0);
  const column = lastNewline === -1 ? start.column + offset : offset - lastNewline;
  return { file: start.file, line, column };
}
