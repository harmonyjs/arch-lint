/**
 * @fileoverview Every registered rule has a doc where `explain` reads it, inside
 * a folder the published package ships, and every doc there belongs to a rule.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allRules } from '#rules/index.js';
import { packageRoot, ruleDocPath } from '../paths.js';

describe('rule docs', () => {
  it('has a doc for every registered rule', () => {
    const missing = allRules.map((rule) => rule.id).filter((id) => !existsSync(ruleDocPath(id)));
    expect(missing).toEqual([]);
  });

  it('has no doc for a rule that is not registered', () => {
    const ids = new Set(allRules.map((rule) => rule.id));
    const docs = readdirSync(dirname(ruleDocPath('any'))).map((file) => basename(file, '.md'));
    expect(docs.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('ships the docs folder in the package', () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot(), 'package.json'), 'utf8')) as {
      files: string[];
    };
    expect(manifest.files).toContain('docs/rules');
  });
});
