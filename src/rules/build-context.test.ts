/**
 * @fileoverview Tests for buildRuleContext — per-rule RuleContext assembly.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig, Rule } from '../types.js';
import { buildRuleContext } from './build-context.js';
import { makeSuppressIndex } from './test-support/make-context.js';

const rule: Rule = {
  id: 'lca-placement',
  pack: 'placement',
  engine: 'structural',
  defaultSeverity: 'warning',
  check: () => [],
};

function cfg(rules: ResolvedConfig['rules']): ResolvedConfig {
  return { rules } as ResolvedConfig;
}

const project = new Project({ useInMemoryFileSystem: true });

describe('buildRuleContext', () => {
  it('uses the default severity when none is configured', () => {
    const ctx = buildRuleContext(rule, cfg({}), makeSuppressIndex(), project);
    expect(ctx.ruleId).toBe('lca-placement');
    expect(ctx.severity).toBe('warning');
    expect(ctx.options).toEqual({});
  });

  it('uses the configured severity override', () => {
    const ctx = buildRuleContext(
      rule,
      cfg({ 'lca-placement': { severity: 'error' } }),
      makeSuppressIndex(),
      project,
    );
    expect(ctx.severity).toBe('error');
  });

  it('exposes rule options with the severity field stripped', () => {
    const config = cfg({ 'lca-placement': { severity: 'warning', promotionThreshold: 3 } });
    const ctx = buildRuleContext(rule, config, makeSuppressIndex(), project);
    expect(ctx.options).toEqual({ promotionThreshold: 3 });
  });

  it('carries the provided suppress index', () => {
    const suppress = makeSuppressIndex({ suppressed: ['src/X'] });
    const ctx = buildRuleContext(rule, cfg({}), suppress, project);
    expect(ctx.suppress).toBe(suppress);
  });

  it('carries the provided ts-morph project (D9)', () => {
    const ctx = buildRuleContext(rule, cfg({}), makeSuppressIndex(), project);
    expect(ctx.project).toBe(project);
  });
});
