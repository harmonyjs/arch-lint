/**
 * @fileoverview stripCommentGlyphs — reduces a raw comment (line, block or
 * JSDoc) to its plain text content, dropping delimiter and `*` glyphs.
 */

/** Remove `//`, block delimiters and JSDoc `*` glyphs, collapsing into plain text. */
export function stripCommentGlyphs(raw: string): string {
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
