/**
 * @fileoverview Graph type vocabulary — nodes, edges and the frozen ConsumerGraph
 * the resolver produces. Resolution is the resolver's internal transit type and is
 * not part of the public API.
 */
import type { Location } from '#types.js';

export interface Node {
  readonly id: string;
  readonly kind: 'file' | 'folder';
  readonly isEntity: boolean;
  readonly placementMode: 'reactive' | 'explicit';
  readonly cluster?: string;
  /**
   * View-region classification (#26). `'view'` marks a node inside the
   * auto-detected (or config-declared) view region; absent means unclassified.
   * A string-union for future regions — today the only value is `'view'`.
   */
  readonly region?: 'view';
}

export interface Edge {
  readonly consumer: string;
  readonly producer: string;
  readonly symbol: string;
  readonly typeOnly: boolean;
  readonly syntacticPath?: string;
}

export type UnresolvedReason =
  | 'ambiguous-wildcard'
  | 'alias-unresolved'
  | 'depth-exceeded'
  | 'parse-error'
  | 'missing';

export interface UnresolvedImport {
  readonly file: string;
  readonly specifier: string;
  readonly symbol: string;
  readonly location: Location;
  readonly reason: UnresolvedReason;
}

export interface ConsumerGraph {
  readonly nodes: ReadonlyMap<string, Node>;
  readonly edges: readonly Edge[];
  readonly consumersOf: ReadonlyMap<string, readonly Edge[]>;
  readonly producersOf: ReadonlyMap<string, readonly Edge[]>;
  readonly entityConsumersOf: ReadonlyMap<string, readonly string[]>;
  readonly unresolved: readonly UnresolvedImport[];
  readonly builtAt: Date;
  readonly rootDir: string;
}

/** Internal transit type of the resolver; not exported from public-api. */
export type Resolution =
  | {
      readonly kind: 'resolved';
      readonly file: string;
      readonly symbol: string;
      readonly typeOnly: boolean;
    }
  | { readonly kind: 'external' }
  | { readonly kind: 'unresolved'; readonly reason: UnresolvedReason }
  | { readonly kind: 'cycle' };
