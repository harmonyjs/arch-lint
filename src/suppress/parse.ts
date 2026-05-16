/**
 * @fileoverview Per-entity @arch-decision parser: locates the anchor declaration, collects
 * nearby comments, scans and interprets them into the entity's valid/malformed suppress data.
 */
import { type SourceFile } from 'ts-morph';
import type { Location, ParsedSuppress, SuppressConfig } from '../types.js';
import { findAnchorDeclaration } from './anchor.js';
import { collectSuppressComments, type CollectedComment } from './collect-comments.js';
import { interpretSuppress } from './interpret.js';
import { scanSuppressText } from './scan-text.js';
import type { EntitySuppressData, MalformedSuppress } from './types.js';

/**
 * Parse every @arch-decision comment attached to one entity. When the entry file has no
 * main export but does carry a stray @arch-decision, that comment is flagged `no-main-export`.
 */
export function parseEntitySuppress(
  entryFile: SourceFile,
  entityName: string,
  _entityId: string,
  config: SuppressConfig,
): EntitySuppressData {
  const anchor = findAnchorDeclaration(entryFile, entityName);
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

/** Search the whole file for a @arch-decision marker that could not be anchored. */
function findStrayMarker(entryFile: SourceFile, config: SuppressConfig): MalformedSuppress | null {
  const idx = entryFile.getFullText().indexOf(config.marker);
  if (idx === -1) return null;
  const { line, column } = entryFile.getLineAndColumnAtPos(idx);
  const location: Location = { file: entryFile.getFilePath(), line, column };
  return { kind: 'no-main-export', ruleId: null, reason: undefined, location };
}
