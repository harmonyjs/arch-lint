/**
 * @fileoverview Shape vocabulary — the typed findings each detector emits and
 * the shared DetectorInput contract. Detectors are pure functions of these
 * inputs; the renderer never reaches past the ShapeFinding union.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { ConsumerGraph } from '#platform/graph/types.js';
import type { FolderTree } from '../model/tree.js';

/** A sub-folder S of parent F serves some-but-not-all of F's other sub-folders. */
export interface SiblingAsymmetryFinding {
  readonly kind: 'sibling-asymmetry';
  readonly folder: string;
  readonly usedBy: readonly string[];
  readonly missing: readonly string[];
  readonly total: number;
}

/** A pair of files `X.ts` + `X-{aspect}.ts` in the same folder with a runtime edge. */
export interface CarvedAspectFinding {
  readonly kind: 'carved-aspect';
  readonly core: string;
  readonly aspect: string;
  readonly coreLoc: number;
  readonly aspectLoc: number;
  readonly direction: 'core→aspect' | 'aspect→core';
}

/** Two files connected by edges of different kinds in opposite directions. */
export interface TypeCircularPairFinding {
  readonly kind: 'type-circular-pair';
  readonly a: string;
  readonly b: string;
}

/** A→B is type-only and a shared consumer C has runtime edges to both. */
export interface TypeCircularTripletFinding {
  readonly kind: 'type-circular-triplet';
  readonly a: string;
  readonly b: string;
  readonly consumer: string;
}

/** A file with intra-folder fan-in or fan-out ≥ 3. */
export interface HubFinding {
  readonly kind: 'hub';
  readonly file: string;
  readonly fanIn: number;
  readonly fanOut: number;
}

export type ShapeFinding =
  | SiblingAsymmetryFinding
  | CarvedAspectFinding
  | TypeCircularPairFinding
  | TypeCircularTripletFinding
  | HubFinding;

/** Shared input contract for every detector. */
export interface DetectorInput {
  readonly graph: ConsumerGraph;
  readonly config: ResolvedConfig;
  readonly tree: FolderTree;
  /** Lines-of-code lookup keyed by file id; missing entries default to 0. */
  readonly locByPath: ReadonlyMap<string, number>;
}

/** Returns every path the finding mentions, used for subsystem filtering. */
export function pathsOf(finding: ShapeFinding): readonly string[] {
  switch (finding.kind) {
    case 'sibling-asymmetry':
      return [finding.folder];
    case 'carved-aspect':
      return [finding.core, finding.aspect];
    case 'type-circular-pair':
      return [finding.a, finding.b];
    case 'type-circular-triplet':
      return [finding.a, finding.b, finding.consumer];
    case 'hub':
      return [finding.file];
  }
}
