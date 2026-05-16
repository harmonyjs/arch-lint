/**
 * @fileoverview Typed error taxonomy for arch-lint. Every error class carries a
 * fixed process exit code; the runner catches an ArchLintError and exits with
 * its code instead of crashing. ConfigError (2) covers config/invocation
 * failures, GraphBuildError (3) graph construction, IOError (4) file I/O,
 * EngineError (5) an internal rule-engine bug.
 */

/** Base class for every arch-lint error that maps to a non-verdict exit code. */
export abstract class ArchLintError extends Error {
  /** Process exit code this error maps to (2..5). */
  abstract readonly exitCode: 2 | 3 | 4 | 5;
}

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

/** Raised on a graph-construction failure. Maps to process exit code 3. */
export class GraphBuildError extends ArchLintError {
  override readonly name = 'GraphBuildError';

  /** Process exit code this error maps to. */
  readonly exitCode = 3 as const;
}

/** Raised on an input/output failure — an unreadable file. Maps to exit code 4. */
export class IOError extends ArchLintError {
  override readonly name = 'IOError';

  /** Process exit code this error maps to. */
  readonly exitCode = 4 as const;
}

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
