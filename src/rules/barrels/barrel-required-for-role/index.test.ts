/**
 * @fileoverview Tests for the barrel-required-for-role rule — D6, both folder classes.
 */
import { describe, expect, it } from 'vitest';
import type { ConventionsConfig, ResolvedConfig } from '#foundation/config/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { type BarrelRequiredForRoleOptions, barrelRequiredForRole } from './index.js';

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

function ctx(opts: Partial<BarrelRequiredForRoleOptions> = {}) {
  return makeContext<BarrelRequiredForRoleOptions>('barrel-required-for-role', {
    severity: 'error',
    options: { enforceForSegments: 'all', exemptPaths: [], ...opts },
  });
}

type NodeKind = 'file' | 'folder';
function graphOf(nodes: ReadonlyArray<readonly [string, NodeKind]>) {
  return makeGraph({
    nodes: Object.fromEntries(
      nodes.map(([id, kind]) => [id, kind === 'folder' ? { kind, isEntity: true } : { kind }]),
    ),
  });
}

describe('barrel-required-for-role', () => {
  it('has the canonical metadata', () => {
    expect(barrelRequiredForRole.pack).toBe('barrels');
    expect(barrelRequiredForRole.engine).toBe('syntactic');
    expect(barrelRequiredForRole.defaultSeverity).toBe('error');
  });

  it('flags a role folder lib/ with no index', () => {
    const graph = graphOf([
      ['src/App/lib', 'folder'],
      ['src/App/lib/util.ts', 'file'],
    ]);
    const diags = barrelRequiredForRole.check(graph, config, ctx());
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      ruleId: 'barrel-required-for-role',
      severity: 'error',
      entity: 'src/App/lib',
    });
    expect(diags[0]?.fingerprint).toBeUndefined();
  });

  it('flags a component folder with no barrel', () => {
    const graph = graphOf([
      ['src/App/Header', 'folder'],
      ['src/App/Header/Header.tsx', 'file'],
    ]);
    const diags = barrelRequiredForRole.check(graph, config, ctx());
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/App/Header');
    expect(diags[0]?.reason).toContain('Component folder');
  });

  it('does not flag a role folder with index.ts', () => {
    const graph = graphOf([
      ['src/App/lib', 'folder'],
      ['src/App/lib/index.ts', 'file'],
    ]);
    expect(barrelRequiredForRole.check(graph, config, ctx())).toHaveLength(0);
  });

  it('does not flag a component folder with index.tsx', () => {
    const graph = graphOf([
      ['src/App/Header', 'folder'],
      ['src/App/Header/Header.tsx', 'file'],
      ['src/App/Header/index.tsx', 'file'],
    ]);
    expect(barrelRequiredForRole.check(graph, config, ctx())).toHaveLength(0);
  });

  it('exemptPaths excludes a folder from the check', () => {
    const graph = graphOf([
      ['src/App/lib', 'folder'],
      ['src/App/lib/util.ts', 'file'],
    ]);
    const diags = barrelRequiredForRole.check(graph, config, ctx({ exemptPaths: ['src/App/lib'] }));
    expect(diags).toHaveLength(0);
  });

  it('enforceForSegments narrows the role-folder check to the listed segments', () => {
    const graph = graphOf([
      ['src/App/lib', 'folder'],
      ['src/App/lib/u.ts', 'file'],
      ['src/App/hooks', 'folder'],
      ['src/App/hooks/use-x.ts', 'file'],
    ]);
    const diags = barrelRequiredForRole.check(
      graph,
      config,
      ctx({ enforceForSegments: ['hooks'] }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/App/hooks');
  });

  it('enforceForSegments does not narrow the component-folder check', () => {
    const graph = graphOf([
      ['src/App/Header', 'folder'],
      ['src/App/Header/Header.tsx', 'file'],
    ]);
    const diags = barrelRequiredForRole.check(graph, config, ctx({ enforceForSegments: ['lib'] }));
    expect(diags).toHaveLength(1);
  });

  it('applies its option defaults when the context carries no options', () => {
    const graph = graphOf([
      ['src/App/Header', 'folder'],
      ['src/App/Header/Header.tsx', 'file'],
    ]);
    const emptyCtx = makeContext<BarrelRequiredForRoleOptions>('barrel-required-for-role', {
      severity: 'error',
    });
    expect(() => barrelRequiredForRole.check(graph, config, emptyCtx)).not.toThrow();
    // Default enforceForSegments:'all', exemptPaths:[] still flags the missing barrel.
    expect(barrelRequiredForRole.check(graph, config, emptyCtx)).toHaveLength(1);
  });
});
