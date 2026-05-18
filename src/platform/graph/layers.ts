/**
 * @fileoverview Layer resolution — maps an entity id to its configured layer
 * key by longest segment-wise prefix match. A graph-derived structural query
 * shared by the layer-boundary rule and the graph document.
 */
import type { LayersConfig } from '#foundation/config/types.js';
import { relativeToRoot } from '#foundation/entity-id/index.js';

/** True when `prefix` is a segment-wise prefix of `path` (or equal). */
function isSegmentPrefix(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * Layer key of `entityId` — the longest segment-wise prefix match against the
 * `layers` keys. The id is first taken relative to `sourceRoot`: layer keys are
 * written relative to it, exactly as `units` keys are, so `src/platform/x.ts`
 * under sourceRoot `src` matches the key `platform`. Null when no key matches.
 */
export function layerOf(entityId: string, layers: LayersConfig, sourceRoot: string): string | null {
  const rest = relativeToRoot(entityId, sourceRoot);
  let best: string | null = null;
  for (const key of Object.keys(layers)) {
    if (isSegmentPrefix(key, rest) && (best === null || key.length > best.length)) {
      best = key;
    }
  }
  return best;
}
