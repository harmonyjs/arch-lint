/**
 * @fileoverview Extracts the @fileoverview description of each source file —
 * the per-file text the graph document shows on nodes and in %% comments.
 */
import type { SourceFileSet } from '../graph/discover-source-files.js';

/** Parses the @fileoverview text from a file's leading JSDoc; null when absent. */
export function fileoverviewOf(text: string): string | null {
  const head = text.slice(0, 4000);
  const tag = head.indexOf('@fileoverview');
  if (tag === -1) return null;
  const end = head.indexOf('*/', tag);
  if (end === -1) return null;
  const cleaned = head
    .slice(tag + '@fileoverview'.length, end)
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Extracts the @fileoverview text of every source file, keyed by file id. */
export function extractFileoverviews(sources: SourceFileSet): Map<string, string | null> {
  const out = new Map<string, string | null>();
  for (const [id, sourceFile] of sources.files) {
    out.set(id, fileoverviewOf(sourceFile.getFullText()));
  }
  return out;
}
