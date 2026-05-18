/**
 * @fileoverview Suppress type vocabulary — the parsed @arch-decision suppression
 * (ParsedSuppress) and the SuppressIndex the rule engine queries, alongside the
 * kinds of malformed @arch-decision comments and intermediate parse shapes. Only
 * ParsedSuppress and SuppressIndex are part of the public API.
 */
import type { Diagnostic, Location } from '#foundation/types/index.js';

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

export interface ParsedSuppress {
  readonly ruleId: string | null;
  readonly reason: string;
  readonly expiry: Date | null;
  readonly location: Location;
}

export interface SuppressIndex {
  isSuppressed(diagnostic: Diagnostic): boolean;
  findExpired(): readonly ParsedSuppress[];
}
