/**
 * @fileoverview computeShape — runs every detector, concatenates the findings
 * in a fixed order, and filterBySubsystem — the subsystem filter the document
 * renderer applies when --subsystem narrows the output.
 */
import { findCarvedAspect } from './carved-aspect.js';
import { findHubs } from './hubs.js';
import { findSiblingAsymmetry } from './sibling-asymmetry.js';
import { findTypeCircular } from './type-circular.js';
import { type DetectorInput, pathsOf, type ShapeFinding } from './types.js';

/** Runs every detector and returns the union of findings, in detector order. */
export function computeShape(input: DetectorInput): readonly ShapeFinding[] {
  return [
    ...findSiblingAsymmetry(input),
    ...findCarvedAspect(input),
    ...findTypeCircular(input),
    ...findHubs(input),
  ];
}

/** Keeps a finding when at least one of its paths is under `${root}/${subsystem}/`. */
export function filterBySubsystem(
  findings: readonly ShapeFinding[],
  subsystem: string,
  root: string,
): readonly ShapeFinding[] {
  const prefix = `${root}/${subsystem}/`;
  return findings.filter((f) => pathsOf(f).some((p) => p.startsWith(prefix)));
}
