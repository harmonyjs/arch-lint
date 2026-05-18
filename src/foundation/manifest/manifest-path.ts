/**
 * @fileoverview Project manifest path resolver (package.json / .npmrc / tsconfig.json)
 * for the hygiene pack — anchors a manifest name to project.cwd.
 */
import { join } from 'node:path';
import type { ResolvedConfig } from '#foundation/config/types.js';

/** Absolute path to a manifest with the given name, relative to project.cwd. */
export function manifestPath(config: ResolvedConfig, name: string): string {
  return join(config.project.cwd, name);
}
