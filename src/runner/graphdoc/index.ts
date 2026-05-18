/**
 * @fileoverview Public surface of the graphdoc subsystem — renders a
 * ConsumerGraph into a layered Mermaid project map.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { ConsumerGraph } from '#platform/graph/types.js';
import { renderDocument } from './document.js';
import { type BuildModelOptions, buildGraphDoc } from './model/index.js';

export { extractFileoverviews } from './fileoverview.js';
export type { GraphDoc } from './types.js';

/** Builds the graph document Markdown from a graph, its fileoverviews and config. */
export function renderGraphDoc(
  graph: ConsumerGraph,
  fileoverviews: ReadonlyMap<string, string | null>,
  config: ResolvedConfig,
  options?: BuildModelOptions,
): string {
  return renderDocument(buildGraphDoc(graph, fileoverviews, config, options));
}
