/**
 * @fileoverview Engine steps barrel — the context builders, the manifest-bundle parser,
 * the placement-dedup step and the runtime self-check that runEngine composes.
 */
export {
  buildCensusContext,
  buildGraphContext,
  buildManifestContext,
  buildSyntacticContext,
} from './build-context.js';
export { dedupPlacement } from './dedup-placement.js';
export { buildManifestBundle } from './manifest-bundle.js';
export { type EngineInputs, runEngine } from './run.js';
export { runtimeSelfCheck } from './self-check.js';
