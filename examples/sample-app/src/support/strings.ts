/**
 * @fileoverview String utilities for the support layer — pure, dependency-free
 * text helpers that higher layers compose into domain logic.
 */

/** Upper-cases the first character of a non-empty string. */
export function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
