/**
 * @fileoverview Raised on a graph-construction failure. Maps to process exit
 * code 3.
 */

import { ArchLintError } from './arch-lint-error.js';

/** Raised on a graph-construction failure. Maps to process exit code 3. */
export class GraphBuildError extends ArchLintError {
  override readonly name = 'GraphBuildError';

  /** Process exit code this error maps to. */
  readonly exitCode = 3 as const;
}
