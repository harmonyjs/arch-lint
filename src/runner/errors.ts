/**
 * @fileoverview Typed error hierarchy for the runner. Each error carries a
 * fixed process exit code; the runner catches an ArchLintError and exits with
 * its code instead of crashing.
 */

/** Base class for every runner error that maps to a non-verdict exit code. */
export abstract class ArchLintError extends Error {
  /** Process exit code this error maps to (2..5). */
  abstract readonly exitCode: 2 | 3 | 4 | 5;
}

/** Configuration or invalid-invocation error; maps to exit code 2. */
export class ConfigError extends ArchLintError {
  override readonly name = 'ConfigError';
  readonly exitCode = 2 as const;
}

/** Graph-construction failure; maps to exit code 3. */
export class GraphBuildError extends ArchLintError {
  override readonly name = 'GraphBuildError';
  readonly exitCode = 3 as const;
}

/** Input/output failure; maps to exit code 4. */
export class IOError extends ArchLintError {
  override readonly name = 'IOError';
  readonly exitCode = 4 as const;
}

/** Internal engine failure (an arch-lint bug); maps to exit code 5. */
export class EngineError extends ArchLintError {
  override readonly name = 'EngineError';
  readonly exitCode = 5 as const;
}
