/**
 * @fileoverview Raised on an internal rule-engine failure. Maps to process
 * exit code 5.
 */

import { ArchLintError } from './arch-lint-error.js';

/**
 * Raised on an internal rule-engine failure — e.g. a runtime self-check
 * collision where two diagnostics share a logical violation id. Maps to exit
 * code 5.
 */
export class EngineError extends ArchLintError {
  override readonly name = 'EngineError';

  /** Process exit code this error maps to. */
  readonly exitCode = 5 as const;
}
