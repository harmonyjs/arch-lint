/**
 * @fileoverview Tests for makeContext / makeSuppressIndex test-support factories.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { ManifestBundle } from '#rules/types.js';
import { makeContext, makeManifestContext, makeSuppressIndex } from './make-context.js';

describe('makeSuppressIndex', () => {
  it('returns an index that suppresses nothing by default', () => {
    const idx = makeSuppressIndex();
    expect(idx.isSuppressed({ ruleId: 'x', entity: 'e' } as never)).toBe(false);
    expect(idx.findExpired()).toEqual([]);
  });

  it('suppresses diagnostics whose entity is in the suppressed set', () => {
    const idx = makeSuppressIndex({ suppressed: ['src/App/Header'] });
    expect(idx.isSuppressed({ ruleId: 'x', entity: 'src/App/Header' } as never)).toBe(true);
    expect(idx.isSuppressed({ ruleId: 'x', entity: 'src/App/Footer' } as never)).toBe(false);
  });
});

describe('makeContext', () => {
  it('builds a RuleContext with defaults', () => {
    const ctx = makeContext('lca-placement');
    expect(ctx.ruleId).toBe('lca-placement');
    expect(ctx.severity).toBe('warning');
    expect(ctx.options).toEqual({});
    expect(ctx.suppress.isSuppressed({ entity: 'e' } as never)).toBe(false);
  });

  it('accepts severity and options overrides', () => {
    const ctx = makeContext('layer-boundary', { severity: 'error', options: { foo: 1 } });
    expect(ctx.severity).toBe('error');
    expect(ctx.options).toEqual({ foo: 1 });
  });

  it('exposes an empty in-memory ts-morph project by default (D9)', () => {
    const ctx = makeContext('lib-purity');
    expect(ctx.project.getSourceFiles()).toEqual([]);
  });

  it('carries a project supplied via the spec', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('src/x.ts', 'export const x = 1;');
    const ctx = makeContext('lib-purity', { project });
    expect(ctx.project).toBe(project);
    expect(ctx.project.getSourceFile('src/x.ts')).toBeDefined();
  });
});

describe('makeManifestContext', () => {
  it('builds a ManifestRuleContext with defaults', () => {
    const ctx = makeManifestContext('package-engines');
    expect(ctx.ruleId).toBe('package-engines');
    expect(ctx.severity).toBe('error');
    expect(ctx.options).toEqual({});
    expect(ctx.cwd).toBe(process.cwd());
    expect(ctx.manifests).toEqual({ packageJson: null, npmrc: null, tsconfig: null });
  });

  it('threads severity, options, manifests and cwd overrides', () => {
    const manifests: ManifestBundle = {
      packageJson: { kind: 'package.json' } as unknown as ManifestBundle['packageJson'],
      npmrc: null,
      tsconfig: null,
    };
    const ctx = makeManifestContext('package-engines', {
      severity: 'warning',
      options: { requiredKeys: ['node'] },
      manifests,
      cwd: '/tmp/project',
    });
    expect(ctx.severity).toBe('warning');
    expect(ctx.options).toEqual({ requiredKeys: ['node'] });
    expect(ctx.manifests).toBe(manifests);
    expect(ctx.cwd).toBe('/tmp/project');
  });
});
