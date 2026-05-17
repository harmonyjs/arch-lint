/**
 * @fileoverview Raised on a file I/O failure. Maps to process exit code 4.
 */

import { ArchLintError } from './arch-lint-error.js';

/** Raised on an input/output failure — an unreadable file. Maps to exit code 4. */
export class IOError extends ArchLintError {
  override readonly name = 'IOError';

  /** Process exit code this error maps to. */
  readonly exitCode = 4 as const;
}
