/**
 * @fileoverview Test-support helper that unwraps the sole element of an array,
 * failing loudly when the array does not hold exactly one item.
 */

/** Returns the single element of `arr`, throwing when its length is not exactly 1. */
export function only<T>(arr: readonly T[]): T {
  if (arr.length !== 1) {
    throw new Error(`only(): expected exactly 1 element, received ${arr.length}`);
  }
  // biome-ignore lint/style/noNonNullAssertion: length checked directly above
  return arr[0]!;
}
