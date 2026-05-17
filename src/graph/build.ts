/**
 * @fileoverview Cold build orchestration — assembles a ConsumerGraph from a resolved
 * config by discovering sources, resolving imports and projecting onto entities.
 */
import type { ResolvedConfig } from '#config/types.js';
import { freezeGraph } from './consumer-graph.js';
import {
  loadSourceFiles,
  moduleResolutionContextOf,
  type SourceFileSet,
} from './discover-source-files.js';
import { buildEdges } from './edges.js';
import type { EntityContext } from './entities.js';
import { buildNodes } from './nodes.js';
import { createResolver } from './resolve.js';
import type { ConsumerGraph } from './types.js';

/**
 * Assembles the immutable ConsumerGraph from an already-loaded SourceFileSet: build
 * nodes, run the syntactic resolver to produce edges and unresolved imports, then
 * freeze. Synchronous — source discovery and parsing happen before this is called.
 */
export function buildGraphFromSources(
  config: ResolvedConfig,
  sources: SourceFileSet,
): ConsumerGraph {
  const resolver = createResolver({
    sources,
    moduleResolution: moduleResolutionContextOf(sources),
    maxResolveDepth: config.resolve.maxResolveDepth,
    cacheSize: config.resolve.cacheSize,
  });
  const nodes = buildNodes(sources, config.conventions, config.explicitPlacement, config.view);
  const { edges, unresolved } = buildEdges(sources, resolver, config.resolve.treatTypeOnlyAsEdge);
  const entityCtx: EntityContext = { sources, conventions: config.conventions };
  return freezeGraph({ nodes, edges, unresolved, entityCtx, rootDir: sources.rootDir });
}

/**
 * Builds the full immutable ConsumerGraph for `config`: discover and parse source
 * files, build nodes, run the syntactic resolver to produce edges and unresolved
 * imports, then freeze.
 */
export async function buildGraph(config: ResolvedConfig): Promise<ConsumerGraph> {
  return buildGraphFromSources(config, await loadSourceFiles(config));
}
