/**
 * @fileoverview Layer resolution — maps an entity id to its configured layer
 * key by longest segment-wise prefix match. A graph-derived structural query
 * shared by the layer-boundary rule and the graph document.
 */
import type { LayersConfig } from '#foundation/config/types.js';
import { relativeToRoot } from '#foundation/entity-id/index.js';
import { ConfigError } from '#foundation/errors/index.js';

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

/**
 * Rejects a `layers` block that cannot mean what it says: a key no discovered file
 * sits under, or a canImport entry naming no declared layer. Either one leaves the
 * boundary silently unchecked, so it is a config error (exit 2), not a quiet pass.
 */
export function assertLayersReachFiles(
  layers: LayersConfig,
  sourceRoot: string,
  census: readonly string[],
): void {
  const files = census.map((id) => relativeToRoot(id, sourceRoot));
  const problems: string[] = [];
  for (const [key, layer] of Object.entries(layers)) {
    if (!files.some((file) => isSegmentPrefix(key, file))) {
      problems.push(
        `layer "${key}" holds no file (keys are relative to sourceRoot "${sourceRoot}")`,
      );
    }
    for (const target of layer.canImport) {
      if (!Object.hasOwn(layers, target)) {
        problems.push(`layer "${key}" may import "${target}", which is not a declared layer`);
      }
    }
  }
  if (problems.length > 0) {
    throw new ConfigError(`Invalid layers config:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
}
