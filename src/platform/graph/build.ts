/**
 * @fileoverview Graph assembly — builds the immutable ConsumerGraph from an
 * already-loaded SourceFileSet: build nodes, run the syntactic resolver to
 * produce edges and unresolved imports, then freeze.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { SourceFileSet } from '#foundation/source-files/index.js';
import { freezeGraph } from './consumer-graph.js';
import { buildEdges } from './edges.js';
import type { EntityContext } from './entities.js';
import { buildNodes } from './nodes.js';
import { createResolver, moduleResolutionContextOf } from './resolution/index.js';
import type { ConsumerGraph } from './types.js';

/**
 * Assembles the immutable ConsumerGraph from an already-loaded SourceFileSet:
 * build nodes, run the syntactic resolver to produce edges and unresolved
 * imports, then freeze. Synchronous — source discovery happens before this.
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
