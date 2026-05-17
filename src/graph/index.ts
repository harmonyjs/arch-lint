/**
 * @fileoverview Public surface of the graph subsystem — the barrel that
 * re-exports the graph builder and the incremental-rebuild entry consumed
 * by the runner.
 */
export { buildGraph, buildGraphFromSources } from './build.js';
export { graphEntityResolver } from './entity-resolver.js';
export { buildIncremental } from './incremental.js';
export type { SubsystemCoupling } from './subsystem-coupling.js';
export { subsystemCoupling, subsystemOf } from './subsystem-coupling.js';
