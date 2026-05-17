/**
 * @fileoverview Number utilities for the support layer — pure formatting helpers
 * with no dependencies, safe for any higher layer to consume.
 */

/** Left-pads a non-negative integer with zeros to the requested width. */
export function padTwo(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}
