/**
 * @fileoverview Public surface of the suppress subsystem — re-exports the SuppressIndex
 * implementation, its factory, the EntityResolver contract and the parse helpers.
 */

export type { EntityResolver, SuppressEntity } from './entity-resolver.js';
export { parseEntitySuppress } from './parse.js';
export { buildSuppressIndex, SuppressIndexImpl } from './suppress-index.js';
export type {
  EntitySuppressData,
  MalformedKind,
  MalformedSuppress,
  RawSuppressComment,
} from './types.js';
