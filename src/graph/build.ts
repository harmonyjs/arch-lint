/**
 * @fileoverview Cold build orchestration — assembles a ConsumerGraph from a resolved
 * config by discovering sources, resolving imports and projecting onto entities.
 */
import type { ConsumerGraph, ResolvedConfig } from '../types.js';
import { loadSourceFiles, moduleResolutionContextOf } from './source-files.js';
import { createResolver } from './resolve.js';
import { buildNodes } from './nodes.js';
import { buildEdges } from './edges.js';
import { freezeGraph } from './consumer-graph.js';
import type { EntityContext } from './entities.js';

/**
 * Builds the full immutable ConsumerGraph for `config` (§6.1 cold build): discover
 * and parse source files, build nodes, run the syntactic resolver to produce edges
 * and unresolved imports, then freeze.
 */
export async function buildGraph(config: ResolvedConfig): Promise<ConsumerGraph> {
  const sources = await loadSourceFiles(config);
  const resolver = createResolver({
    sources,
    moduleResolution: moduleResolutionContextOf(sources),
    maxResolveDepth: config.resolve.maxResolveDepth,
    cacheSize: config.resolve.cacheSize,
  });
  const nodes = buildNodes(sources, config.conventions, config.explicitPlacement);
  const { edges, unresolved } = buildEdges(sources, resolver, config.resolve.treatTypeOnlyAsEdge);
  const entityCtx: EntityContext = { sources, conventions: config.conventions };
  return freezeGraph({ nodes, edges, unresolved, entityCtx, rootDir: sources.rootDir });
}
