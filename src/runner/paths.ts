/**
 * @fileoverview Resolves the installed-package root and rule-documentation
 * paths. Used by the `explain` command to locate docs/rules/<id>.md without
 * depending on the package's exports map.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the package root. The compiled module lives at
 * `dist/runner/paths.js` (two levels below the root); under vitest it runs
 * as `src/runner/paths.ts` (also two levels below). Both resolve to the
 * same root.
 */
export function packageRoot(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDir, '..', '..');
}

/** Absolute path to the documentation file of a rule. */
export function ruleDocPath(ruleId: string): string {
  return join(packageRoot(), 'docs', 'rules', `${ruleId}.md`);
}
