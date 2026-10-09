/**
 * @fileoverview Tests for the installed-TypeScript lookup: the nearest
 * node_modules/typescript above a directory, read the way Node resolves it.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { installedTypescriptMajor } from './typescript-version.js';

function installTypescript(dir: string, version: string): void {
  const pkg = join(dir, 'node_modules', 'typescript');
  mkdirSync(pkg, { recursive: true });
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'typescript', version }));
}

function workspace(): string {
  return mkdtempSync(join(tmpdir(), 'arch-lint-tsver-'));
}

describe('installedTypescriptMajor', () => {
  it('reads the major of node_modules/typescript in the directory itself', () => {
    const root = workspace();
    installTypescript(root, '7.0.2');
    expect(installedTypescriptMajor(root)).toBe(7);
  });

  it('walks up to a hoisted typescript above the directory', () => {
    const root = workspace();
    installTypescript(root, '5.9.3');
    const app = join(root, 'packages', 'app');
    mkdirSync(app, { recursive: true });
    expect(installedTypescriptMajor(app)).toBe(5);
  });

  it('prefers the nearest copy over a hoisted one', () => {
    const root = workspace();
    installTypescript(root, '5.9.3');
    const app = join(root, 'packages', 'app');
    installTypescript(app, '6.0.3');
    expect(installedTypescriptMajor(app)).toBe(6);
  });

  it('returns undefined when no typescript is installed above the directory', () => {
    expect(installedTypescriptMajor(workspace())).toBeUndefined();
  });

  it('returns undefined for a manifest without a parseable version', () => {
    const root = workspace();
    installTypescript(root, 'workspace:*');
    expect(installedTypescriptMajor(root)).toBeUndefined();
  });
});
