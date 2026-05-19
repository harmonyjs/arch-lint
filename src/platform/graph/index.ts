/**
 * @fileoverview Public surface of the graph subsystem — the barrel that
 * re-exports the graph builder consumed by the runner.
 */
export { buildGraphFromSources } from './build.js';
export { isRoleFolder } from './entities.js';
export { graphEntityResolver } from './entity-resolver.js';
export { GraphUnitsCache } from './graph-units-cache.js';
export { layerOf } from './layers.js';
export { sourceFileFor } from './source-file-for.js';
export type { UnitCoupling } from './unit-coupling.js';
export { unitCoupling, unitOf } from './unit-coupling.js';
