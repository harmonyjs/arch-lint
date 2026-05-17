/**
 * @fileoverview Public surface of the suppress subsystem — re-exports the SuppressIndex
 * implementation, its factory and parse helpers for the rule engine (M4).
 */

export type { EntityResolver } from './entity-resolver.js';
export { parseEntitySuppress } from './parse.js';
export type { SuppressEntity } from './suppress-index.js';
export { buildSuppressIndex, SuppressIndexImpl } from './suppress-index.js';
export type {
  EntitySuppressData,
  MalformedKind,
  MalformedSuppress,
  RawSuppressComment,
} from './types.js';
