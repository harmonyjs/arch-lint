/**
 * @fileoverview Cross-cutting type lexicon for arch-lint — the thin set of types
 * shared by two or more independent subsystems. Diagnostic is the shared finding
 * shape; Severity and Location are reused project-wide. Subsystem-specific types
 * live in that subsystem's own types.ts.
 */

// ── Primitives ───────────────────────────────────────────────────────────────

export type Severity = 'off' | 'info' | 'warning' | 'error';

/** Severity of a rule that is actually executed ('off' rules never run). */
export type ActiveSeverity = Exclude<Severity, 'off'>;

// ── Graph ────────────────────────────────────────────────────────────────────

export interface Location {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

// ── Diagnostics ──────────────────────────────────────────────────────────────

export interface Diagnostic {
  readonly ruleId: string;
  readonly severity: ActiveSeverity;
  readonly entity: string;
  readonly fingerprint?: string;
  readonly status?: 'new' | 'inBaseline';
  readonly message: string;
  readonly expected?: string;
  readonly actual: string;
  readonly consumers?: readonly ConsumerInfo[];
  readonly reason: string;
  readonly suggestions: readonly Suggestion[];
  readonly analysis?: DiagnosticAnalysis;
  readonly location: Location;
  readonly typeOnly?: boolean;
}

export interface ConsumerInfo {
  readonly file: string;
  readonly symbol: string;
  readonly importPath: string;
  readonly resolved: string;
  readonly location: Location;
}

export interface Suggestion {
  readonly action:
    | 'move'
    | 'inline'
    | 'split'
    | 'add-barrel'
    | 'remove-suppress'
    | 'group-params'
    | 'custom';
  readonly target?: string;
  readonly rationale: string;
  readonly candidates?: readonly RemedyCandidate[];
}

/** One ranked remedy option, carrying the metric math behind its ranking. */
export interface RemedyCandidate {
  readonly target: string;
  /** The quantified consequence, e.g. '+0 new unit edges'. Omitted when N/A. */
  readonly note?: string;
  readonly best: boolean;
}

/** Structured, occurrence-specific analysis attached to a diagnostic. */
export type DiagnosticAnalysis = CouplingFacetsAnalysis;

/**
 * A unit's coupling decomposed into facets — groups of units linked to the
 * subject unit through the same imported symbol. Disjoint facets are a
 * mechanical signal that the unit carries more than one responsibility.
 */
export interface CouplingFacetsAnalysis {
  readonly kind: 'coupling-facets';
  readonly facets: readonly Facet[];
  /** True when the facets' unit sets are pairwise disjoint. */
  readonly disjoint: boolean;
}

/** One coupling facet: the units linked to the subject unit through `symbol`. */
export interface Facet {
  readonly symbol: string;
  readonly units: readonly string[];
}

// ── Entity resolution ────────────────────────────────────────────────────────

/**
 * The graph↔suppress boundary contract: graph/ implements it, suppress/ consumes
 * it. Suppress depends on this interface, never on the graph's entity model
 * directly; tests supply a hand-written mock.
 */
export interface SuppressEntity {
  readonly id: string;
  readonly name: string;
  readonly entryFilePath: string;
}

/** A comment block found in a source file, in ts-morph-free form. */
export interface CommentBlock {
  /** Raw comment text, line/block/JSDoc delimiter glyphs included. */
  readonly rawText: string;
  readonly kind: 'leading-comment' | 'jsdoc';
  /** True first-character position of the comment. */
  readonly location: Location;
  /** Line gap from the comment to the anchor declaration; 0 in the `absent` case. */
  readonly distanceLines: number;
}

/** Comments suppress needs for one entity, discriminated on anchor resolution. */
export type EntityComments =
  | { readonly anchor: 'resolved'; readonly comments: readonly CommentBlock[] }
  | { readonly anchor: 'absent'; readonly fileComments: readonly CommentBlock[] };

export interface EntityResolver {
  /** Every placement entity the suppress index should parse decision data for. */
  listEntities(): readonly SuppressEntity[];
  /** The entity's comment model, or undefined when its entry file is absent. */
  commentsFor(entity: SuppressEntity): EntityComments | undefined;
}
