/**
 * @fileoverview layer-boundary across workspace packages — an import by package
 * name reaches the in-repo package through a node_modules symlink.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

let root: string;

function write(path: string, content: string): void {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'arch-lint-ws-'));
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: { module: 'preserve', moduleResolution: 'bundler', strict: true },
      include: ['src', 'outside'],
    }),
  );
  write('src/apps/web/main.ts', "import { key } from '@ws/zero';\nexport const k = key;\n");
  write('src/apps/web/far.ts', "import { far } from '@ws/far';\nexport const f = far;\n");
  write('src/packages/zero/index.ts', 'export const key = 1;\n');
  write(
    'src/packages/zero/package.json',
    JSON.stringify({ name: '@ws/zero', type: 'module', exports: { '.': './index.ts' } }),
  );
  write('outside/far/index.ts', 'export const far = 2;\n');
  write(
    'outside/far/package.json',
    JSON.stringify({ name: '@ws/far', type: 'module', exports: { '.': './index.ts' } }),
  );
  mkdirSync(join(root, 'node_modules/@ws'), { recursive: true });
  symlinkSync(join(root, 'src/packages/zero'), join(root, 'node_modules/@ws/zero'), 'dir');
  symlinkSync(join(root, 'outside/far'), join(root, 'node_modules/@ws/far'), 'dir');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('layer-boundary — workspace packages', () => {
  it('flags a forbidden import of a sibling package made by its name', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot: root,
      ruleId: 'layer-boundary',
      config: {
        layers: { 'apps/web': { canImport: [] }, 'packages/zero': { canImport: [] } },
      },
    });
    expect(diags.map((d) => d.fingerprint)).toEqual([
      'src/apps/web/main.ts#src/packages/zero/index.ts',
    ]);
  });

  it('leaves a linked package outside the source root alone', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot: root,
      ruleId: 'unresolved-import',
      config: { layers: { 'apps/web': { canImport: ['packages/zero'] } } },
    });
    expect(diags).toEqual([]);
  });
});
