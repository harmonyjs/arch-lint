/**
 * @fileoverview Raised on any configuration or invalid-invocation failure.
 * Maps to process exit code 2.
 */

import { ArchLintError } from './arch-lint-error.js';

/** Options carried by a ConfigError. */
export interface ConfigErrorOptions {
  /** Absolute path of the config file the error relates to, when known. */
  readonly configPath?: string;
  /** The underlying error that triggered this one, when wrapping. */
  readonly cause?: unknown;
}

/**
 * Raised on any configuration or invalid-invocation failure: missing config,
 * unsupported format, schema-validation error, an unusable baseline file. Maps
 * to process exit code 2.
 */
export class ConfigError extends ArchLintError {
  override readonly name = 'ConfigError';

  /** Process exit code this error maps to. */
  readonly exitCode = 2 as const;

  /** Config file path the error relates to, when known. */
  readonly configPath: string | undefined;

  public constructor(message: string, options: ConfigErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.configPath = options.configPath;
  }
}
