/**
 * @fileoverview Tests for the context builders — per-rule engine-specific context assembly.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#config/types.js';
import { NullLogger } from '#logger/index.js';
import { makeSuppressIndex } from '#rules/test-support/make-context.js';
import type { GraphRule, ManifestBundle } from '#rules/types.js';
import {
  buildCensusContext,
  buildGraphContext,
  buildManifestContext,
  buildSyntacticContext,
} from './build-context.js';

const rule: GraphRule = {
  id: 'lca-placement',
  pack: 'placement',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: () => [],
};

function cfg(rules: ResolvedConfig['rules']): ResolvedConfig {
  return { rules } as ResolvedConfig;
}

const project = new Project({ useInMemoryFileSystem: true });
const EMPTY_BUNDLE: ManifestBundle = { packageJson: null, npmrc: null, tsconfig: null };
const logger = new NullLogger();

describe('buildGraphContext', () => {
  it('uses the default severity when none is configured', () => {
    const ctx = buildGraphContext(rule, cfg({}), { suppress: makeSuppressIndex(), logger });
    expect(ctx.ruleId).toBe('lca-placement');
    expect(ctx.severity).toBe('warning');
    expect(ctx.options).toEqual({});
  });

  it('uses the configured severity override', () => {
    const ctx = buildGraphContext(rule, cfg({ 'lca-placement': { severity: 'error' } }), {
      suppress: makeSuppressIndex(),
      logger,
    });
    expect(ctx.severity).toBe('error');
  });

  it('exposes rule options with the severity field stripped', () => {
    const config = cfg({ 'lca-placement': { severity: 'warning', promotionThreshold: 3 } });
    const ctx = buildGraphContext(rule, config, { suppress: makeSuppressIndex(), logger });
    expect(ctx.options).toEqual({ promotionThreshold: 3 });
  });

  it('carries the provided suppress index but no project', () => {
    const suppress = makeSuppressIndex({ suppressed: ['src/X'] });
    const ctx = buildGraphContext(rule, cfg({}), { suppress, logger });
    expect(ctx.suppress).toBe(suppress);
    expect('project' in ctx).toBe(false);
  });
});

describe('buildSyntacticContext', () => {
  it('carries the suppress index and the parsed ts-morph project', () => {
    const suppress = makeSuppressIndex();
    const ctx = buildSyntacticContext(rule, cfg({}), { suppress, project, logger });
    expect(ctx.suppress).toBe(suppress);
    expect(ctx.project).toBe(project);
  });

  it('resolves severity and strips the severity option', () => {
    const config = cfg({ 'lca-placement': { severity: 'error', promotionThreshold: 3 } });
    const ctx = buildSyntacticContext(rule, config, {
      suppress: makeSuppressIndex(),
      project,
      logger,
    });
    expect(ctx.severity).toBe('error');
    expect(ctx.options).toEqual({ promotionThreshold: 3 });
  });
});

describe('buildManifestContext', () => {
  it('carries the manifest bundle and cwd, not a suppress index or project', () => {
    const ctx = buildManifestContext(rule, cfg({}), {
      manifests: EMPTY_BUNDLE,
      cwd: '/tmp/project',
      logger,
    });
    expect(ctx.manifests).toBe(EMPTY_BUNDLE);
    expect(ctx.cwd).toBe('/tmp/project');
    expect('suppress' in ctx).toBe(false);
    expect('project' in ctx).toBe(false);
  });

  it('resolves severity and strips the severity option', () => {
    const config = cfg({ 'lca-placement': { severity: 'error', requiredKeys: ['node'] } });
    const ctx = buildManifestContext(rule, config, {
      manifests: EMPTY_BUNDLE,
      cwd: '/tmp/project',
      logger,
    });
    expect(ctx.severity).toBe('error');
    expect(ctx.options).toEqual({ requiredKeys: ['node'] });
  });
});

describe('buildCensusContext', () => {
  it('carries the census, not a suppress index or project', () => {
    const ctx = buildCensusContext(rule, cfg({}), {
      census: ['src/a.ts', 'src/a.test.ts'],
      logger,
    });
    expect(ctx.census).toEqual(['src/a.ts', 'src/a.test.ts']);
    expect('suppress' in ctx).toBe(false);
    expect('project' in ctx).toBe(false);
    expect('manifests' in ctx).toBe(false);
  });

  it('resolves severity and strips the severity option', () => {
    const config = cfg({ 'lca-placement': { severity: 'error', testFolder: 'tests' } });
    const ctx = buildCensusContext(rule, config, { census: [], logger });
    expect(ctx.severity).toBe('error');
    expect(ctx.options).toEqual({ testFolder: 'tests' });
  });
});
