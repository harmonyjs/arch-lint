/**
 * @fileoverview Tests for entity resolution: role folders, component folders, entityOf.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ConventionsConfig } from '../config/types.js';
import {
  componentParent,
  type EntityContext,
  entityOf,
  isComponentFolder,
  isRoleFolder,
  projectEntityConsumers,
} from './entities.js';
import { loadSourceFiles } from './source-files.js';

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
  dir = mkdtempSync(join(tmpdir(), 'arch-lint-ent-'));
  writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
  const full = join(dir, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

async function makeCtx(): Promise<EntityContext> {
  const sources = await loadSourceFiles({
    project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
    resolve: { extensions: ['.ts', '.tsx'] },
    ignore: [],
  } as never);
  return { sources, conventions };
}

describe('isRoleFolder', () => {
  it('recognizes folder names equal to any *Segment convention', () => {
    expect(isRoleFolder('slots', conventions)).toBe(true);
    expect(isRoleFolder('items', conventions)).toBe(true);
    expect(isRoleFolder('lib', conventions)).toBe(true);
    expect(isRoleFolder('hooks', conventions)).toBe(true);
    expect(isRoleFolder('ui', conventions)).toBe(true);
    expect(isRoleFolder('model', conventions)).toBe(true);
  });
  it('rejects ordinary folder names', () => {
    expect(isRoleFolder('App', conventions)).toBe(false);
    expect(isRoleFolder('Header', conventions)).toBe(false);
  });
});

describe('isComponentFolder', () => {
  it('returns true for a folder with a same-name entry file', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    const ctx = await makeCtx();
    expect(isComponentFolder('src/App', ctx)).toBe(true);
  });
  it('returns false for a folder without a same-name entry file', async () => {
    write('src/App/Other.tsx', 'export const Other = 1;');
    const ctx = await makeCtx();
    expect(isComponentFolder('src/App', ctx)).toBe(false);
  });
  it('returns true when the same-name entry is a .ts file', async () => {
    write('src/util/util.ts', 'export const util = 1;');
    const ctx = await makeCtx();
    expect(isComponentFolder('src/util', ctx)).toBe(true);
  });
});

describe('entityOf', () => {
  it('maps a file inside a component folder to that folder', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/helper.ts', 'export const helper = 1;');
    const ctx = await makeCtx();
    expect(entityOf('src/App/helper.ts', ctx)).toBe('src/App');
  });

  it('maps the entry file itself to its component folder', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    const ctx = await makeCtx();
    expect(entityOf('src/App/App.tsx', ctx)).toBe('src/App');
  });

  it('maps a component-folder barrel to the folder', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/index.ts', "export { App } from './App.js';");
    const ctx = await makeCtx();
    expect(entityOf('src/App/index.ts', ctx)).toBe('src/App');
  });

  it('maps a standalone file to itself', async () => {
    write('src/utils.ts', 'export const utils = 1;');
    const ctx = await makeCtx();
    expect(entityOf('src/utils.ts', ctx)).toBe('src/utils.ts');
  });

  it('picks the nearest component-folder ancestor when nested', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/Header/Header.tsx', 'export const Header = 1;');
    write('src/App/Header/label.ts', 'export const label = 1;');
    const ctx = await makeCtx();
    expect(entityOf('src/App/Header/label.ts', ctx)).toBe('src/App/Header');
  });

  it('maps a top-level barrel without an enclosing component folder to itself', async () => {
    write('src/index.ts', 'export const x = 1;');
    const ctx = await makeCtx();
    expect(entityOf('src/index.ts', ctx)).toBe('src/index.ts');
  });

  it('maps a file with no slash in its id to itself', async () => {
    write('src/standalone.ts', 'export const s = 1;');
    const ctx = await makeCtx();
    expect(entityOf('standalone.ts', ctx)).toBe('standalone.ts');
  });
});

describe('componentParent', () => {
  it('returns the nearest component-folder ancestor of an entity', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/Header/Header.tsx', 'export const Header = 1;');
    const ctx = await makeCtx();
    expect(componentParent('src/App/Header', ctx)).toBe('src/App');
  });

  it('skips role folders when finding the parent', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/items/Widget/Widget.tsx', 'export const Widget = 1;');
    const ctx = await makeCtx();
    expect(componentParent('src/App/items/Widget', ctx)).toBe('src/App');
  });

  it('falls back to the first path segment when no component-folder ancestor exists', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    const ctx = await makeCtx();
    expect(componentParent('src/App', ctx)).toBe('src');
  });

  it('returns the first segment for a standalone file at the source root', async () => {
    write('src/utils.ts', 'export const utils = 1;');
    const ctx = await makeCtx();
    expect(componentParent('src/utils.ts', ctx)).toBe('src');
  });
});

describe('projectEntityConsumers', () => {
  it('lifts file edges to entity edges, drops self-loops, sorts consumers', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/helper.ts', 'export const helper = 1;');
    write('src/Widget/Widget.tsx', 'export const Widget = 1;');
    write('src/Card/Card.tsx', 'export const Card = 1;');
    const ctx = await makeCtx();
    const edges = [
      {
        consumer: 'src/App/App.tsx',
        producer: 'src/App/helper.ts',
        symbol: 'helper',
        typeOnly: false,
      },
      {
        consumer: 'src/Widget/Widget.tsx',
        producer: 'src/App/App.tsx',
        symbol: 'App',
        typeOnly: false,
      },
      {
        consumer: 'src/Card/Card.tsx',
        producer: 'src/App/helper.ts',
        symbol: 'helper',
        typeOnly: false,
      },
    ];
    const projected = projectEntityConsumers(edges, ctx);
    expect(projected.get('src/App')).toEqual(['src/Card', 'src/Widget']);
    expect(projected.has('src/App/helper.ts')).toBe(false);
  });

  it('collapses duplicate consumer entities', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/extra.ts', 'export const extra = 1;');
    write('src/Widget/Widget.tsx', 'export const Widget = 1;');
    write('src/Widget/more.ts', 'export const more = 1;');
    const ctx = await makeCtx();
    const edges = [
      {
        consumer: 'src/Widget/Widget.tsx',
        producer: 'src/App/App.tsx',
        symbol: 'App',
        typeOnly: false,
      },
      {
        consumer: 'src/Widget/more.ts',
        producer: 'src/App/extra.ts',
        symbol: 'extra',
        typeOnly: false,
      },
    ];
    const projected = projectEntityConsumers(edges, ctx);
    expect(projected.get('src/App')).toEqual(['src/Widget']);
  });
});

describe('componentParent / entityOf — edge cases', () => {
  it('returns the id itself for an entity id with no slash', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    const ctx = await makeCtx();
    expect(componentParent('rootEntity', ctx)).toBe('rootEntity');
  });

  it('resolves the parent of a standalone file entity nested under a component folder', async () => {
    write('src/App/App.tsx', 'export const App = 1;');
    write('src/App/plain/widget.ts', 'export const widget = 1;');
    const ctx = await makeCtx();
    expect(componentParent('src/App/plain/widget.ts', ctx)).toBe('src/App');
  });
});
