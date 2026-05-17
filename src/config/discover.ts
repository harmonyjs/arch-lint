/**
 * @fileoverview Config discovery — locates the arch-lint config source by the
 * fixed precedence of spec §3 (five sources, first match wins). It returns a
 * source descriptor, not the config itself; loading is done by load.ts. More
 * than one source emits a stderr warning; an unsupported format or no source at
 * all raises a ConfigError (process exit code 2). The fs probes are synchronous
 * on purpose — discovery is a one-shot check before any real work begins.
 */
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { ConfigError } from '../errors/index.js';

/** Where the config will be read from. Consumed by load.ts. */
export type ConfigSource =
  | { readonly kind: 'file'; readonly path: string } // .ts/.mjs/.cjs/.js module
  | { readonly kind: 'package-field'; readonly path: string } // arch-lint field in package.json
  | { readonly kind: 'defaults' }; // zero-config path (§3 step 5)

/** Config-module extensions supported by autodiscovery and --config. */
const SUPPORTED_EXTENSIONS = ['.ts', '.mjs', '.cjs', '.js'];

/** Autodiscovery filenames, in §3 precedence order. */
const DISCOVERY_FILES = [
  'arch-lint.config.ts',
  'arch-lint.config.mjs',
  'arch-lint.config.cjs',
  'arch-lint.config.js',
];

/** Builds a source descriptor for an explicit --config path. */
function resolveExplicit(explicitPath: string): ConfigSource {
  const ext = path.extname(explicitPath);
  if (path.basename(explicitPath) === 'package.json') {
    return { kind: 'package-field', path: explicitPath };
  }
  if (SUPPORTED_EXTENSIONS.includes(ext)) {
    return { kind: 'file', path: explicitPath };
  }
  throw new ConfigError(
    `unsupported config format "${ext}" for ${explicitPath} — ` +
      `use .ts/.mjs/.cjs/.js or the "arch-lint" field of package.json`,
    { configPath: explicitPath },
  );
}

/** Checks whether package.json at the given path carries an "arch-lint" field. */
function hasPackageField(packageJsonPath: string): boolean {
  if (!existsSync(packageJsonPath)) {
    return false;
  }
  try {
    const raw = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
    return Object.hasOwn(raw, 'arch-lint');
  } catch {
    return false;
  }
}

/** Renders a human-readable list of discovered sources for the warning. */
function describeSources(sources: readonly ConfigSource[]): string {
  return sources
    .map((s) => (s.kind === 'defaults' ? 'defaults' : path.basename(s.path)))
    .join(', ');
}

/** Scans cwd for every config-file and package-field source, in §3 order. */
function collectSources(cwd: string): ConfigSource[] {
  const found: ConfigSource[] = [];
  for (const file of DISCOVERY_FILES) {
    const candidate = path.join(cwd, file);
    if (existsSync(candidate)) {
      found.push({ kind: 'file', path: candidate });
    }
  }
  const packageJsonPath = path.join(cwd, 'package.json');
  if (hasPackageField(packageJsonPath)) {
    found.push({ kind: 'package-field', path: packageJsonPath });
  }
  return found;
}

/**
 * Discovers the arch-lint config source for a given cwd. An explicit path (from
 * --config) bypasses autodiscovery. Returns the first matching source per §3.
 */
export function discoverConfig(cwd: string, explicitPath?: string): ConfigSource {
  if (explicitPath !== undefined) {
    return resolveExplicit(explicitPath);
  }

  const found = collectSources(cwd);
  if (found.length > 1) {
    console.error(
      `arch-lint: multiple config sources found, using the first by precedence ` +
        `(${describeSources(found)})`,
    );
  }
  const first = found[0];
  if (first !== undefined) {
    return first;
  }

  if (existsSync(path.join(cwd, 'tsconfig.json'))) {
    return { kind: 'defaults' };
  }
  throw new ConfigError(
    `arch-lint config not found in ${cwd} and no tsconfig.json present — ` +
      `add an arch-lint.config.ts or a tsconfig.json`,
  );
}
