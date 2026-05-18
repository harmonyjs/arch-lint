/**
 * @fileoverview Public surface of the suppress subsystem — re-exports the SuppressIndex
 * implementation, its factory and the parse helpers.
 */

export { parseEntitySuppress } from './parse.js';
export { buildSuppressIndex, SuppressIndexImpl } from './suppress-index.js';
export type {
  EntitySuppressData,
  MalformedKind,
  MalformedSuppress,
  RawSuppressComment,
} from './types.js';
