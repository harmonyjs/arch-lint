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

/**
 * True when `id` lies STRICTLY below the directory `prefix` — `id` is a proper
 * descendant of `prefix`, never `prefix` itself. Matching is per-segment, so
 * 'src/ui' is strictly under 'src' but 'src/uikit' is not under 'src/ui'.
 */
export function isStrictlyUnderPrefix(id: string, prefix: string): boolean {
  const idSegs = segmentsOf(id);
  const prefixSegs = segmentsOf(prefix);
  if (idSegs.length <= prefixSegs.length) return false;
  return prefixSegs.every((segment, i) => idSegs[i] === segment);
}

/**
 * True when `id` lies AT OR below the directory `prefix` — `prefix` itself and
 * every proper descendant count. Matching is per-segment, so 'src/ui' contains
 * 'src/ui' and 'src/ui/x.ts' but not 'src/uikit'.
 */
export function isAtOrUnderPrefix(id: string, prefix: string): boolean {
  const idSegs = segmentsOf(id);
  const prefixSegs = segmentsOf(prefix);
  if (idSegs.length < prefixSegs.length) return false;
  return prefixSegs.every((segment, i) => idSegs[i] === segment);
}

/** The first path segment of `id`. */
export function firstSegment(id: string): string {
  const slash = id.indexOf('/');
  return slash < 0 ? id : id.slice(0, slash);
}

/** Parent-folder id of `id`, derived through `segmentsOf` (the canonical
 *  replacement for the `segmentsOf(x).slice(0, -1).join('/')` idiom). */
export function folderOf(id: string): string {
  return segmentsOf(id).slice(0, -1).join('/');
}

/**
 * `id` taken relative to the directory `root` — the leading `root/` segment is
 * dropped when present, otherwise `id` is returned unchanged. Lets a config key
 * written relative to the sourceRoot match a sourceRoot-prefixed entity id.
 */
export function relativeToRoot(id: string, root: string): string {
  return pathUnder(id, root) ?? id;
}

/** A configured directory (`./src/`, `.`) in entity-id form: `src`, and `''` for the root. */
export function canonicalDir(dir: string): string {
  const trimmed = dir.replace(/^(?:\.\/+)+/, '').replace(/\/+$/, '');
  return trimmed === '.' ? '' : trimmed;
}

/** `rest` placed under the directory `dir`, however `dir` is spelled. */
export function joinUnder(dir: string, rest: string): string {
  const head = canonicalDir(dir);
  return head === '' ? rest : `${head}/${rest}`;
}

/** `id` relative to the directory `dir`; null unless `id` lies strictly below it. */
export function pathUnder(id: string, dir: string): string | null {
  const head = canonicalDir(dir);
  if (head === '') return id;
  const prefix = `${head}/`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : null;
}
