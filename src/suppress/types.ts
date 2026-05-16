/**
 * @fileoverview Internal type vocabulary for the M3 suppress subsystem — kinds of
 * malformed @arch-decision comments and intermediate parse shapes not exposed by public API.
 */
import type { Location, ParsedSuppress } from '../types.js';

/** Why a parsed @arch-decision comment is invalid and must be reported by `expired-suppress`. */
export type MalformedKind =
  | 'missing-reason'
  | 'short-reason'
  | 'bad-expiry'
  | 'empty-rule-id'
  | 'no-main-export';

/** A malformed @arch-decision occurrence: structurally a suppress, but invalid. */
export interface MalformedSuppress {
  readonly kind: MalformedKind;
  readonly ruleId: string | null;
  readonly reason: string | undefined;
  readonly location: Location;
}

/** Raw lexical result of scanning one comment's text, prior to semantic interpretation. */
export interface RawSuppressComment {
  readonly ruleId: string | null;
  readonly reasonText: string;
  readonly expiryText: string | null;
  readonly location: Location;
}

/** All @arch-decision data attached to a single entity, split into valid and malformed. */
export interface EntitySuppressData {
  readonly valid: readonly ParsedSuppress[];
  readonly malformed: readonly MalformedSuppress[];
}
