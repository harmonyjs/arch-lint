/**
 * @fileoverview Tests for installed-package root resolution and rule-doc path.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { packageRoot, ruleDocPath } from './paths.js';

describe('packageRoot', () => {
  it('resolves to a directory that contains package.json', () => {
    const root = packageRoot();
    expect(existsSync(join(root, 'package.json'))).toBe(true);
  });
});

describe('ruleDocPath', () => {
  it('builds a path under docs/rules for the given rule id', () => {
    expect(ruleDocPath('lca-placement')).toBe(
      join(packageRoot(), 'docs', 'rules', 'lca-placement.md'),
    );
  });
});
