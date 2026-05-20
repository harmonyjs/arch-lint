/**
 * @fileoverview Public surface of the graphdoc subsystem — renders a
 * ConsumerGraph into a layered Mermaid project map.
 */
import { renderDocument } from './document.js';
import { type BuildGraphDocInput, buildGraphDoc } from './model/index.js';

export { extractFileoverviews } from './fileoverview.js';
export type { GraphDoc } from './types.js';
export type { BuildGraphDocInput } from './model/index.js';

/** Builds the graph document Markdown from a graph, its fileoverviews and config. */
export function renderGraphDoc(input: BuildGraphDocInput): string {
  return renderDocument(buildGraphDoc(input));
}
