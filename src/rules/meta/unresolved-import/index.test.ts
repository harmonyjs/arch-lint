/**
 * @fileoverview Tests for the unresolved-import rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import type { UnresolvedImport } from '../../../graph/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { only } from '../../test-support/only.js';
import { unresolvedImportRule } from './index.js';

const cfg = {} as ResolvedConfig;
const ctx = makeContext('unresolved-import');

describe('unresolvedImportRule', () => {
  it('has the canonical metadata', () => {
    expect(unresolvedImportRule.id).toBe('unresolved-import');
    expect(unresolvedImportRule.pack).toBe('meta');
    expect(unresolvedImportRule.engine).toBe('graph');
    expect(unresolvedImportRule.defaultSeverity).toBe('warning');
  });

  it('emits a diagnostic per graph.unresolved entry', () => {
    const u: UnresolvedImport = {
      file: 'src/App/App.tsx',
      specifier: './missing',
      symbol: 'Thing',
      location: { file: 'src/App/App.tsx', line: 7, column: 1 },
      reason: 'missing',
    };
    const g = makeGraph({ unresolved: [u] });
    const out = unresolvedImportRule.check(g, cfg, ctx);
    const d = only(out);
    expect(d.ruleId).toBe('unresolved-import');
    expect(d.entity).toBe('src/App/App.tsx');
    expect(d.fingerprint).toBe('src/App/App.tsx#./missing#Thing');
    expect(d.location).toEqual({ file: 'src/App/App.tsx', line: 7, column: 1 });
  });

  it('deduplicates identical unresolved entries by fingerprint', () => {
    const u: UnresolvedImport = {
      file: 'src/a.ts',
      specifier: './x',
      symbol: 'Y',
      location: { file: 'src/a.ts', line: 1, column: 1 },
      reason: 'missing',
    };
    const g = makeGraph({
      unresolved: [u, { ...u, location: { file: 'src/a.ts', line: 4, column: 1 } }],
    });
    expect(unresolvedImportRule.check(g, cfg, ctx)).toHaveLength(1);
  });

  it('emits nothing for an empty unresolved list', () => {
    expect(unresolvedImportRule.check(makeGraph({}), cfg, ctx)).toEqual([]);
  });

  it('skips node: builtin specifiers and only flags genuine relative imports', () => {
    const builtin: UnresolvedImport = {
      file: 'src/a.ts',
      specifier: 'node:path',
      symbol: 'join',
      location: { file: 'src/a.ts', line: 1, column: 1 },
      reason: 'alias-unresolved',
    };
    const relative: UnresolvedImport = {
      file: 'src/a.ts',
      specifier: './missing.js',
      symbol: 'Thing',
      location: { file: 'src/a.ts', line: 2, column: 1 },
      reason: 'missing',
    };
    const g = makeGraph({ unresolved: [builtin, relative] });
    const out = unresolvedImportRule.check(g, cfg, ctx);
    expect(out).toHaveLength(1);
    expect(out[0]!.actual).toBe('./missing.js');
  });
});
