/**
 * @fileoverview Canonical arithmetic over entity ids — POSIX repo-relative file
 * paths such as `src/graph/types.ts`. The single implementation of every
 * directory/basename/segment/ancestor operation, shared by graph, graphdoc and
 * the rules packs. A dependency-free leaf module, peer of `src/types.ts`.
 */

/** POSIX directory portion of an id; `''` when the id has no directory. */
export function dirOf(id: string): string {
  const slash = id.lastIndexOf('/');
  return slash === -1 ? '' : id.slice(0, slash);
}

/** Final path segment of an id — the file name with all its extensions. */
export function baseNameOf(id: string): string {
  const slash = id.lastIndexOf('/');
  return slash === -1 ? id : id.slice(slash + 1);
}

/** Strip the last extension only: `a.test.ts` -> `a.test`. A leading dot is kept. */
export function dropExtension(baseName: string): string {
  const dot = baseName.lastIndexOf('.');
  return dot > 0 ? baseName.slice(0, dot) : baseName;
}

/** Strip every extension — the text before the first dot: `a.test.ts` -> `a`. */
export function stemOf(baseName: string): string {
  const dot = baseName.indexOf('.');
  return dot === -1 ? baseName : baseName.slice(0, dot);
}

/** Split an id into segments, dropping the extension of the last segment. */
export function segmentsOf(id: string): string[] {
  const trimmed = id.replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmed === '') return [];
  const parts = trimmed.split('/');
  const last = parts.length - 1;
  const lastPart = parts[last];
  if (lastPart !== undefined) parts[last] = lastPart.replace(/\.[^./]+$/, '');
  return parts;
}

/** Directory-ancestor ids of `id`, nearest first, excluding `id` itself. */
export function ancestorsOf(id: string): string[] {
  const segs = id.split('/');
  const out: string[] = [];
  for (let i = segs.length - 1; i > 0; i -= 1) {
    out.push(segs.slice(0, i).join('/'));
  }
  return out;
}

/**
 * True when the path lies INSIDE a folder named `segment` — the segment matches
 * as a directory, not as a name substring and not as the last (file) segment.
 */
export function isUnderSegment(id: string, segment: string): boolean {
  const segs = segmentsOf(id);
  return segs.slice(0, -1).includes(segment);
}
