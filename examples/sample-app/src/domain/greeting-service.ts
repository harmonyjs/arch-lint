/**
 * @fileoverview Greeting domain service — composes support-layer string helpers
 * into a user-facing greeting, with no knowledge of the app entry layer.
 */
import { capitalize } from '../support/strings.js';

/** Builds a polite greeting for the given name. */
export function greet(name: string): string {
  return `Hello, ${capitalize(name)}!`;
}
