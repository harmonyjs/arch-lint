/**
 * @fileoverview Public surface of the shape subsystem — the orchestrator that
 * runs every detector, the renderer that emits the markdown section, and the
 * ShapeFinding vocabulary the rest of graphdoc passes through.
 */
export { computeShape, filterBySubsystem } from './compute.js';
export { renderShape } from './render.js';
export type {
  CarvedAspectFinding,
  DetectorInput,
  HubFinding,
  ShapeFinding,
  SiblingAsymmetryFinding,
  TypeCircularPairFinding,
  TypeCircularTripletFinding,
} from './types.js';
