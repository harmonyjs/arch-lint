/**
 * @fileoverview Config loading — reads the discovered config source into a
 * validated Config. .ts/.mjs/.cjs modules load through jiti (runtime support
 * for imports, env vars, conditional logic); .js loads via native dynamic
 * import; the "arch-lint" field of package.json is read as JSON. The
 * zero-config source synthesizes a minimal config. Every result is
 * schema-validated, so any failure surfaces as a ConfigError (exit code 2).
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import { ConfigError } from '../errors/index.js';
import { type ConfigSource, discoverConfig } from './discover.js';
import { validateConfig } from './schema.js';
import type { Config } from './types.js';

/** Extensions loaded through jiti (the rest go through native import). */
const JITI_EXTENSIONS = ['.ts', '.mjs', '.cjs'];

/** Loads a config module's default export through jiti. */
async function loadViaJiti(modulePath: string): Promise<unknown> {
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  return jiti.import(modulePath, { default: true });
}

/** Loads a config module's default export via native dynamic import. */
async function loadViaNativeImport(modulePath: string): Promise<unknown> {
  const mod = (await import(pathToFileURL(modulePath).href)) as { default?: unknown };
  return mod.default;
}

/** Reads the "arch-lint" field out of a package.json file. */
async function loadPackageField(packageJsonPath: string): Promise<unknown> {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(await readFile(packageJsonPath, 'utf8')) as Record<string, unknown>;
  } catch (err) {
    throw new ConfigError(
      `failed to read package.json at ${packageJsonPath}: ${(err as Error).message}`,
      { configPath: packageJsonPath },
    );
  }
  if (!Object.hasOwn(raw, 'arch-lint')) {
    throw new ConfigError(`package.json at ${packageJsonPath} has no "arch-lint" field`, {
      configPath: packageJsonPath,
    });
  }
  return raw['arch-lint'];
}

/** Loads a config-module source, asserting it has a usable default export. */
async function loadModule(modulePath: string): Promise<unknown> {
  const ext = path.extname(modulePath);
  const loaded = JITI_EXTENSIONS.includes(ext)
    ? await loadViaJiti(modulePath)
    : await loadViaNativeImport(modulePath);
  if (loaded === undefined || loaded === null) {
    throw new ConfigError(
      `config module ${modulePath} has no default export — ` +
        `export the result of defineConfig as default`,
      { configPath: modulePath },
    );
  }
  return loaded;
}

/** Loads the raw (unvalidated) config object for a resolved source. */
async function loadRaw(source: ConfigSource): Promise<unknown> {
  if (source.kind === 'defaults') {
    return { project: { tsconfig: './tsconfig.json' } };
  }
  if (source.kind === 'package-field') {
    return loadPackageField(source.path);
  }
  return loadModule(source.path);
}

/**
 * Discovers, loads and validates the arch-lint config for a given cwd. An
 * explicit path (from --config) bypasses autodiscovery. Returns a validated
 * Config; default resolution is a separate step (resolveConfig).
 */
export async function loadConfig(cwd: string, explicitPath?: string): Promise<Config> {
  const source = discoverConfig(cwd, explicitPath);
  const raw = await loadRaw(source);
  const configPath = source.kind === 'defaults' ? undefined : source.path;
  return validateConfig(raw, configPath);
}
