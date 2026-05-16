/**
 * @fileoverview Typed error taxonomy for arch-lint. Each error class carries a
 * fixed process exit code (decision D8); the runner catches them and maps each
 * to its exit code. ConfigError (exit 2) covers config/invocation failures;
 * EngineError (exit 5) covers internal rule-engine failures.
 */

/** Options carried by a ConfigError. */
export interface ConfigErrorOptions {
  /** Absolute path of the config file the error relates to, when known. */
  readonly configPath?: string;
}

/**
 * Raised on any configuration or invalid-invocation failure: missing config,
 * unsupported format, schema-validation error. Maps to process exit code 2.
 */
export class ConfigError extends Error {
  /** Process exit code this error maps to (D8 error taxonomy). */
  public readonly exitCode = 2 as const;

  /** Config file path the error relates to, when known. */
  public readonly configPath: string | undefined;

  public constructor(message: string, options: ConfigErrorOptions = {}) {
    super(message);
    this.name = 'ConfigError';
    this.configPath = options.configPath;
  }
}

/**
 * Raised on an internal rule-engine failure — e.g. a runtime self-check collision
 * (§10.2) where two diagnostics share a logical violation id. Maps to exit code 5.
 */
export class EngineError extends Error {
  /** Process exit code this error maps to (D8 error taxonomy). */
  public readonly exitCode = 5 as const;

  public constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}
