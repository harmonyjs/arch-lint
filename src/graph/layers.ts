/**
 * @fileoverview Layer resolution — maps an entity id to its configured layer
 * key by longest segment-wise prefix match. A graph-derived structural query
 * shared by the layer-boundary rule and the graph document.
 */
import type { LayersConfig } from '../config/types.js';

/** True when `prefix` is a segment-wise prefix of `path` (or equal). */
function isSegmentPrefix(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Layer key (longest segment-wise prefix) of `entityId`; null when none matches. */
export function layerOf(entityId: string, layers: LayersConfig): string | null {
  let best: string | null = null;
  for (const key of Object.keys(layers)) {
    if (isSegmentPrefix(key, entityId) && (best === null || key.length > best.length)) {
      best = key;
    }
  }
  return best;
}
