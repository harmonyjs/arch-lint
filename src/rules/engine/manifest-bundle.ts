/**
 * @fileoverview buildManifestBundle — parses package.json / .npmrc / tsconfig.json once
 * per run so ManifestRules read pre-parsed docs instead of re-reading disk per rule.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { ResolvedConfig } from '../../config/types.js';
import { manifestPath } from '../hygiene/support/manifest-path.js';
import { parseNpmrc } from '../hygiene/support/npmrc.js';
import { parsePackageJson } from '../hygiene/support/package-json.js';
import { effectiveCompilerOptions } from '../hygiene/support/tsconfig-effective.js';
import type { ManifestBundle } from '../types.js';

/** Parse the three project manifests once; each entry is null when its file is absent. */
export function buildManifestBundle(config: ResolvedConfig): ManifestBundle {
  const packageJsonPath = manifestPath(config, 'package.json');
  const npmrcPath = manifestPath(config, '.npmrc');
  const tsconfigPath = manifestPath(config, 'tsconfig.json');
  return {
    packageJson: existsSync(packageJsonPath)
      ? parsePackageJson(readFileSync(packageJsonPath, 'utf8'))
      : null,
    npmrc: existsSync(npmrcPath) ? parseNpmrc(readFileSync(npmrcPath, 'utf8')) : null,
    tsconfig: existsSync(tsconfigPath) ? effectiveCompilerOptions(tsconfigPath) : null,
  };
}
