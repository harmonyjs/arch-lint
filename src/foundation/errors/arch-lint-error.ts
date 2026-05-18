/**
 * @fileoverview Base of arch-lint's typed error taxonomy. Every concrete error
 * carries a fixed process exit code; the runner catches an ArchLintError and
 * exits with its code instead of crashing.
 */

/** Base class for every arch-lint error that maps to a non-verdict exit code. */
export abstract class ArchLintError extends Error {
  /** Process exit code this error maps to (2..5). */
  abstract readonly exitCode: 2 | 3 | 4 | 5;
}
