/**
 * @fileoverview The TypeScript major a project compiles with: the version of the nearest
 * node_modules/typescript above its directory, the copy Node resolves for that project.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The package.json of the nearest node_modules/typescript at or above `dir`. */
function nearestTypescriptManifest(dir: string): string | undefined {
  const candidate = join(dir, 'node_modules', 'typescript', 'package.json');
  if (existsSync(candidate)) return candidate;
  const parent = dirname(dir);
  return parent === dir ? undefined : nearestTypescriptManifest(parent);
}

/** The major of a semver `version` field; undefined when the manifest carries none. */
function majorOf(manifestPath: string): number | undefined {
  try {
    const { version } = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version?: unknown };
    const major = typeof version === 'string' ? Number.parseInt(version, 10) : Number.NaN;
    return Number.isNaN(major) ? undefined : major;
  } catch {
    return undefined;
  }
}

/** The major of the TypeScript installed for the project at `cwd`, or undefined when none is. */
export function installedTypescriptMajor(cwd: string): number | undefined {
  const manifest = nearestTypescriptManifest(cwd);
  return manifest === undefined ? undefined : majorOf(manifest);
}
