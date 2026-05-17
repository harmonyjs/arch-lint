/**
 * @fileoverview Tests for graph node construction — files and component folders.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ConventionsConfig, ExplicitPlacementRule } from '#config/types.js';
import { loadSourceFiles } from './discover-source-files.js';
import { buildNodes } from './nodes.js';

let dir: string;

const conventions: ConventionsConfig = {
  privateSegment: 'slots',
  sharedSegment: 'items',
  libSegment: 'lib',
  hooksSegment: 'hooks',
  explicitClusterSegment: 'ui',
  modelSegment: 'model',
  indexFiles: ['index.ts', 'index.tsx'],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arch-lint-nodes-'));
  writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function write(rel: string, content: string): void {
  const full = join(dir, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

async function load() {
  return loadSourceFiles({
    project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
    resolve: { extensions: ['.ts', '.tsx'] },
    ignore: [],
  } as never);
}

describe('buildNodes', () => {
  it('creates a folder node for a component folder and marks it an entity', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    const set = await load();
    const nodes = buildNodes(set, conventions, [], { region: 'auto' });
    const folder = nodes.get('src/App');
    expect(folder).toEqual({
      id: 'src/App',
      kind: 'folder',
      isEntity: true,
      placementMode: 'reactive',
    });
  });

  it('marks the entry file a non-entity file node', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    const set = await load();
    const nodes = buildNodes(set, conventions, [], { region: 'auto' });
    expect(nodes.get('src/App/App.tsx')).toEqual({
      id: 'src/App/App.tsx',
      kind: 'file',
      isEntity: false,
      placementMode: 'reactive',
    });
  });

  it('marks a standalone file an entity', async () => {
    write('src/utils.ts', 'export const utils = 1;');
    const set = await load();
    const nodes = buildNodes(set, conventions, [], { region: 'auto' });
    expect(nodes.get('src/utils.ts')?.isEntity).toBe(true);
  });

  it('marks a pure re-export barrel a non-entity file', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/index.ts', "export { App } from './App.js';");
    const set = await load();
    const nodes = buildNodes(set, conventions, [], { region: 'auto' });
    expect(nodes.get('src/App/index.ts')?.isEntity).toBe(false);
  });

  it('applies explicitPlacement to set placementMode explicit with a cluster', async () => {
    write('src/App/ui/Button.tsx', 'export const Button = 1;');
    const set = await load();
    const rules: ExplicitPlacementRule[] = [{ path: 'src/App/ui/**', cluster: 'design-system' }];
    const nodes = buildNodes(set, conventions, rules, { region: 'auto' });
    const node = nodes.get('src/App/ui/Button.tsx');
    expect(node?.placementMode).toBe('explicit');
    expect(node?.cluster).toBe('design-system');
  });

  it('keeps a node reactive when no explicitPlacement rule matches', async () => {
    write('src/feature/work.ts', 'export const work = 1;');
    const set = await load();
    const rules: ExplicitPlacementRule[] = [{ path: 'src/other/**', cluster: 'misc' }];
    const nodes = buildNodes(set, conventions, rules, { region: 'auto' });
    expect(nodes.get('src/feature/work.ts')?.placementMode).toBe('reactive');
  });

  it('treats an empty source file as a non-barrel entity', async () => {
    write('src/empty.ts', '');
    const set = await load();
    const nodes = buildNodes(set, conventions, [], { region: 'auto' });
    expect(nodes.get('src/empty.ts')?.isEntity).toBe(true);
  });
});

describe('buildNodes — view region (#26)', () => {
  it('stamps region "view" on a folder holding a JSX file and its subtree', async () => {
    write('src/ui/Button.tsx', 'export const Button = () => <button />;');
    write('src/ui/hooks/use-data.ts', 'export const useData = () => 1;');
    write('src/lib/util.ts', 'export const util = 1;');
    const set = await load();
    const nodes = buildNodes(set, conventions, [], { region: 'auto' });
    expect(nodes.get('src/ui/Button.tsx')?.region).toBe('view');
    expect(nodes.get('src/ui/hooks/use-data.ts')?.region).toBe('view');
    expect(nodes.get('src/lib/util.ts')?.region).toBeUndefined();
  });

  it('leaves region unset when no file carries JSX', async () => {
    write('src/lib/util.ts', 'export const util = 1;');
    const set = await load();
    const nodes = buildNodes(set, conventions, [], { region: 'auto' });
    expect(nodes.get('src/lib/util.ts')?.region).toBeUndefined();
  });

  it('honors an explicit view.region prefix list and skips JSX detection', async () => {
    write('src/widgets/Card.tsx', 'export const Card = () => <div />;');
    write('src/ui/note.ts', 'export const note = 1;');
    const set = await load();
    const nodes = buildNodes(set, conventions, [], { region: ['src/ui'] });
    // Explicit list wins: src/ui is in-region even with no JSX; the JSX file is not.
    expect(nodes.get('src/ui/note.ts')?.region).toBe('view');
    expect(nodes.get('src/widgets/Card.tsx')?.region).toBeUndefined();
  });
});
