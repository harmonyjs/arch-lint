/**
 * @fileoverview Public surface of the graph subsystem — the barrel that
 * re-exports the graph builder and the incremental-rebuild entry consumed
 * by the runner.
 */
export { buildGraph, buildGraphFromSources } from './build.js';
export { buildIncremental } from './incremental.js';
