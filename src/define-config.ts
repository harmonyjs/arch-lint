/**
 * @fileoverview The defineConfig type helper for arch-lint config files. It is a
 * generic identity function (decision D1): it returns the config unchanged at
 * runtime while preserving literal type inference for editor autocompletion.
 * Default resolution happens later in resolveConfig, invoked by the loader.
 */
import type { Config } from './config/types.js';

/**
 * Wraps an arch-lint config object so editors infer its precise literal type.
 * Runtime behaviour is identity — the generic parameter T keeps literal
 * inference instead of widening the argument to Config.
 */
export function defineConfig<T extends Config>(config: T): T {
  return config;
}
