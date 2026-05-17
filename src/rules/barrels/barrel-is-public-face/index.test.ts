/**
 * @fileoverview Tests for barrel-is-public-face — bypassing a barrel is forbidden (D7).
 */
import { describe, expect, it } from 'vitest';
import type { ConventionsConfig, ResolvedConfig } from '../../../config/types.js';
import type { Edge } from '../../../graph/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { type BarrelIsPublicFaceOptions, barrelIsPublicFace } from './index.js';

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

function ctx(opts: Partial<BarrelIsPublicFaceOptions> = {}) {
  return makeContext<BarrelIsPublicFaceOptions>('barrel-is-public-face', {
    severity: 'error',
    options: {
      enforceForSegments: 'all',
      allowExplicitIndex: false,
      allowSiblingImports: true,
      ...opts,
    },
  });
}

function graphOf(folders: readonly string[], files: readonly string[], edges: readonly Edge[]) {
  const nodes: Record<string, { kind: 'file' | 'folder'; isEntity?: boolean }> = {};
  for (const id of folders) nodes[id] = { kind: 'folder', isEntity: true };
  for (const id of files) nodes[id] = { kind: 'file' };
  return makeGraph({ nodes, edges });
}

describe('barrel-is-public-face', () => {
  it('has the canonical metadata', () => {
    expect(barrelIsPublicFace.pack).toBe('barrels');
    expect(barrelIsPublicFace.engine).toBe('syntactic');
    expect(barrelIsPublicFace.defaultSeverity).toBe('error');
  });

  it('flags an external import of a component-folder internal past the barrel', () => {
    const graph = graphOf(
      ['src/App/Card'],
      ['src/App/Card/Card.tsx', 'src/App/Card/internal.ts', 'src/App/main.tsx'],
      [
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/Card/internal.ts',
          symbol: 'helper',
          typeOnly: false,
          syntacticPath: './Card/internal',
        },
      ],
    );
    const diags = barrelIsPublicFace.check(graph, config, ctx());
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      ruleId: 'barrel-is-public-face',
      severity: 'error',
      entity: 'src/App/main.tsx',
      fingerprint: 'src/App/main.tsx#src/App/Card/internal.ts',
    });
  });

  it('does not flag an external import through the folder barrel', () => {
    const graph = graphOf(
      ['src/App/Card'],
      ['src/App/Card/index.ts', 'src/App/main.tsx'],
      [
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/Card/index.ts',
          symbol: 'Card',
          typeOnly: false,
          syntacticPath: './Card',
        },
      ],
    );
    expect(barrelIsPublicFace.check(graph, config, ctx())).toHaveLength(0);
  });

  it('allowSiblingImports:true permits a sibling importing an internal', () => {
    const graph = graphOf(
      ['src/App/Card'],
      ['src/App/Card/Card.tsx', 'src/App/Card/internal.ts'],
      [
        {
          consumer: 'src/App/Card/Card.tsx',
          producer: 'src/App/Card/internal.ts',
          symbol: 'helper',
          typeOnly: false,
          syntacticPath: './internal',
        },
      ],
    );
    expect(barrelIsPublicFace.check(graph, config, ctx())).toHaveLength(0);
  });

  it('allowSiblingImports:false flags a sibling importing an internal', () => {
    const graph = graphOf(
      ['src/App/Card'],
      ['src/App/Card/Card.tsx', 'src/App/Card/internal.ts'],
      [
        {
          consumer: 'src/App/Card/Card.tsx',
          producer: 'src/App/Card/internal.ts',
          symbol: 'helper',
          typeOnly: false,
          syntacticPath: './internal',
        },
      ],
    );
    const diags = barrelIsPublicFace.check(graph, config, ctx({ allowSiblingImports: false }));
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain('Sibling import');
  });

  it('allowExplicitIndex:false flags an import via an explicit index path', () => {
    const graph = graphOf(
      ['src/App/Card'],
      ['src/App/Card/index.ts', 'src/App/main.tsx'],
      [
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/Card/index.ts',
          symbol: 'Card',
          typeOnly: false,
          syntacticPath: './Card/index',
        },
      ],
    );
    const diags = barrelIsPublicFace.check(graph, config, ctx());
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain('explicit index path');
  });

  it('allowExplicitIndex:true does not flag an explicit index path', () => {
    const graph = graphOf(
      ['src/App/Card'],
      ['src/App/Card/index.ts', 'src/App/main.tsx'],
      [
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/Card/index.ts',
          symbol: 'Card',
          typeOnly: false,
          syntacticPath: './Card/index',
        },
      ],
    );
    expect(barrelIsPublicFace.check(graph, config, ctx({ allowExplicitIndex: true }))).toHaveLength(
      0,
    );
  });

  it('does not apply to a producer outside any component folder', () => {
    const graph = graphOf(
      [],
      ['src/util.ts', 'src/App/main.tsx'],
      [
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/util.ts',
          symbol: 'u',
          typeOnly: false,
          syntacticPath: '../util',
        },
      ],
    );
    expect(barrelIsPublicFace.check(graph, config, ctx())).toHaveLength(0);
  });

  it('enforceForSegments narrows the check to producers under the segment', () => {
    const graph = graphOf(
      ['src/App/lib/Tool', 'src/App/Card'],
      [
        'src/App/lib/Tool/Tool.ts',
        'src/App/lib/Tool/internal.ts',
        'src/App/Card/Card.tsx',
        'src/App/Card/internal.ts',
        'src/App/main.tsx',
      ],
      [
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/lib/Tool/internal.ts',
          symbol: 'a',
          typeOnly: false,
          syntacticPath: './lib/Tool/internal',
        },
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/Card/internal.ts',
          symbol: 'b',
          typeOnly: false,
          syntacticPath: './Card/internal',
        },
      ],
    );
    const diags = barrelIsPublicFace.check(graph, config, ctx({ enforceForSegments: ['lib'] }));
    expect(diags).toHaveLength(1);
    expect(diags[0]?.fingerprint).toBe('src/App/main.tsx#src/App/lib/Tool/internal.ts');
  });

  it('applies its option defaults when the context carries no options', () => {
    const graph = graphOf(
      ['src/App/Card'],
      ['src/App/Card/Card.tsx', 'src/App/Card/internal.ts', 'src/App/main.tsx'],
      [
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/Card/internal.ts',
          symbol: 'helper',
          typeOnly: false,
          syntacticPath: './Card/internal',
        },
      ],
    );
    const emptyCtx = makeContext<BarrelIsPublicFaceOptions>('barrel-is-public-face', {
      severity: 'error',
    });
    expect(() => barrelIsPublicFace.check(graph, config, emptyCtx)).not.toThrow();
    // Default enforceForSegments:'all' keeps the check broad — the bypass is still flagged.
    expect(barrelIsPublicFace.check(graph, config, emptyCtx)).toHaveLength(1);
  });

  it('deduplicates two edges of one (consumer, producer) pair', () => {
    const graph = graphOf(
      ['src/App/Card'],
      ['src/App/Card/Card.tsx', 'src/App/Card/internal.ts', 'src/App/main.tsx'],
      [
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/Card/internal.ts',
          symbol: 'a',
          typeOnly: false,
          syntacticPath: './Card/internal',
        },
        {
          consumer: 'src/App/main.tsx',
          producer: 'src/App/Card/internal.ts',
          symbol: 'b',
          typeOnly: false,
          syntacticPath: './Card/internal',
        },
      ],
    );
    expect(barrelIsPublicFace.check(graph, config, ctx())).toHaveLength(1);
  });
});
