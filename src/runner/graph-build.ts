/**
 * @fileoverview Cold and warm graph builds. `buildGraph` discovers sources and
 * assembles the full ConsumerGraph. The incremental (warm) build for watch mode
 * patches a graph against a change set; the current strategy rebuilds cleanly,
 * so the result is identical to a cold build of the same tree.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import { loadSourceFiles } from '#platform/discovery/index.js';
import { buildGraphFromSources } from '#platform/graph/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';

/**
 * Builds the full immutable ConsumerGraph for `config`: discover and parse
 * source files, build nodes, run the syntactic resolver to produce edges and
 * unresolved imports, then freeze.
 */
export async function buildGraph(config: ResolvedConfig): Promise<ConsumerGraph> {
  return buildGraphFromSources(config, await loadSourceFiles(config));
}

/** A set of file-system changes since the previous graph snapshot. */
export interface GraphChanges {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly modified: readonly string[];
}

/**
 * Normalizes a raw change set so the three buckets are disjoint: a file that
 * is both added/removed and modified keeps only its add/remove classification
 * (the stronger event), since the file's node-set membership changed.
 */
export function normalizeChanges(raw: GraphChanges): GraphChanges {
  const added = new Set(raw.added);
  const removed = new Set(raw.removed);
  return {
    added: [...added],
    removed: [...removed],
    modified: raw.modified.filter((f) => !added.has(f) && !removed.has(f)),
  };
}

/** Resolver reverse index: a file id -> cache keys whose chain touched it. */
export type ReverseIndex = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Collects the resolver-cache keys to invalidate for a change set. A cache
 * entry whose resolution chain touched any added/removed/modified file is
 * stale and must be recomputed.
 */
export function cacheKeysToInvalidate(
  changes: GraphChanges,
  reverseIndex: ReverseIndex,
): ReadonlySet<string> {
  const keys = new Set<string>();
  const touched = [...changes.added, ...changes.removed, ...changes.modified];
  for (const file of touched) {
    const entry = reverseIndex.get(file);
    if (entry !== undefined) for (const key of entry) keys.add(key);
  }
  return keys;
}

/**
 * Performs a warm (incremental) graph build for watch mode. The change set is
 * normalized, then the graph is rebuilt over the in-memory project so the
 * result is identical to a cold build of the same tree. `prevGraph` documents
 * the warm-build contract even though the current strategy rebuilds cleanly.
 */
export async function buildIncremental(
  prevGraph: ConsumerGraph,
  rawChanges: GraphChanges,
  config: ResolvedConfig,
): Promise<ConsumerGraph> {
  void prevGraph;
  normalizeChanges(rawChanges);
  return buildGraph(config);
}
