/**
 * @fileoverview Tests for barrel-narrow-export — a barrel re-exports only its own entity (D7).
 */
import { describe, expect, it } from 'vitest';
import type { ConventionsConfig, ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { type BarrelNarrowExportOptions, barrelNarrowExport } from './index.js';

const conventions: ConventionsConfig = {
  privateSegment: 'slots',
  sharedSegment: 'items',
  libSegment: 'lib',
  hooksSegment: 'hooks',
  explicitClusterSegment: 'ui',
  modelSegment: 'model',
  indexFiles: ['index.ts', 'index.tsx'],
};

const config = { conventions } as unknown as ResolvedConfig;

/** Builds a graph (files + folders) plus its paired in-memory project. */
function graphFor(files: Record<string, string>, folders: readonly string[]) {
  const nodes: Record<string, { kind: 'file' | 'folder'; isEntity?: boolean }> = {};
  for (const id of Object.keys(files)) nodes[id] = { kind: 'file' };
  for (const id of folders) nodes[id] = { kind: 'folder', isEntity: true };
  return makeGraph({ nodes, files });
}

function run(
  files: Record<string, string>,
  folders: readonly string[],
  opts: Partial<BarrelNarrowExportOptions> = {},
) {
  const graph = graphFor(files, folders);
  return barrelNarrowExport.check(
    graph,
    config,
    makeContext<BarrelNarrowExportOptions>('barrel-narrow-export', {
      severity: 'warning',
      options: { allowPrefixedConstants: true, allowTypeReexports: true, ...opts },
      project: graph.project,
    }),
  );
}

describe('barrel-narrow-export', () => {
  it('has the canonical metadata', () => {
    expect(barrelNarrowExport.pack).toBe('barrels');
    expect(barrelNarrowExport.engine).toBe('syntactic');
    expect(barrelNarrowExport.defaultSeverity).toBe('warning');
  });

  it('flags a barrel re-exporting a foreign entity', () => {
    const diags = run(
      {
        'src/App/Card/Card.tsx': 'export const Card = 1;',
        'src/App/Card/index.ts': `export { Card } from './Card';\nexport { Other } from './other';`,
      },
      ['src/App/Card'],
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      ruleId: 'barrel-narrow-export',
      severity: 'warning',
      entity: 'src/App/Card',
    });
    expect(diags[0]?.fingerprint).toBeUndefined();
    expect(diags[0]?.message).toContain('Other');
  });

  it('does not flag a re-export of the folder entity', () => {
    expect(
      run(
        {
          'src/App/Card/Card.tsx': 'export const Card = 1;',
          'src/App/Card/index.ts': `export { Card } from './Card';`,
        },
        ['src/App/Card'],
      ),
    ).toHaveLength(0);
  });

  it('allowPrefixedConstants permits bindings prefixed with the entity name', () => {
    expect(
      run(
        {
          'src/App/Card/Card.tsx': 'export const Card = 1;',
          'src/App/Card/index.ts': `export { Card, CardDefaults, CardContext } from './Card';`,
        },
        ['src/App/Card'],
      ),
    ).toHaveLength(0);
  });

  it('flags prefixed bindings when allowPrefixedConstants is false', () => {
    const diags = run(
      {
        'src/App/Card/Card.tsx': 'export const Card = 1;',
        'src/App/Card/index.ts': `export { Card, CardDefaults } from './Card';`,
      },
      ['src/App/Card'],
      { allowPrefixedConstants: false },
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain('CardDefaults');
  });

  it('allowTypeReexports permits a type-only re-export of a foreign name', () => {
    expect(
      run(
        {
          'src/App/Card/Card.tsx': 'export const Card = 1;',
          'src/App/Card/index.ts': `export { Card } from './Card';\nexport type { Props } from './props';`,
        },
        ['src/App/Card'],
      ),
    ).toHaveLength(0);
  });

  it('flags a type-only re-export when allowTypeReexports is false', () => {
    const diags = run(
      {
        'src/App/Card/Card.tsx': 'export const Card = 1;',
        'src/App/Card/index.ts': `export { Card } from './Card';\nexport type { Props } from './props';`,
      },
      ['src/App/Card'],
      { allowTypeReexports: false },
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain('Props');
  });

  it('does not apply to a role-folder barrel', () => {
    expect(
      run({ 'src/App/lib/index.ts': `export { a } from './a';\nexport { b } from './b';` }, [
        'src/App/lib',
      ]),
    ).toHaveLength(0);
  });

  it('emits one verdict per barrel with several foreign re-exports', () => {
    expect(
      run(
        {
          'src/App/Card/Card.tsx': 'export const Card = 1;',
          'src/App/Card/index.ts': `export { Card } from './Card';\nexport { X } from './x';\nexport { Y } from './y';`,
        },
        ['src/App/Card'],
      ),
    ).toHaveLength(1);
  });

  it('applies its option defaults when the context carries no options', () => {
    const graph = graphFor(
      {
        'src/App/Card/Card.tsx': 'export const Card = 1;',
        'src/App/Card/index.ts': `export { Card } from './Card';\nexport { Other } from './other';`,
      },
      ['src/App/Card'],
    );
    const emptyCtx = makeContext<BarrelNarrowExportOptions>('barrel-narrow-export', {
      severity: 'warning',
      project: graph.project,
    });
    expect(() => barrelNarrowExport.check(graph, config, emptyCtx)).not.toThrow();
    // Defaults keep the rule active — a foreign re-export is still flagged.
    expect(barrelNarrowExport.check(graph, config, emptyCtx)).toHaveLength(1);
  });
});
