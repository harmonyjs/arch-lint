/**
 * @fileoverview Tests for the tsconfig-strict rule of the hygiene pack.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tsconfigStrict } from './index.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { makeContext } from '../../test-support/make-context.js';
import type { ResolvedConfig } from '../../../types.js';

function run(tsconfig: string | null, options: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'arch-lint-tsstrict-'));
  if (tsconfig !== null) writeFileSync(join(dir, 'tsconfig.json'), tsconfig);
  const config = {
    project: { tsconfig: join(dir, 'tsconfig.json'), sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
  } as ResolvedConfig;
  const graph = makeGraph({});
  const ctx = makeContext('tsconfig-strict', { severity: 'error', project: graph.project, options });
  return tsconfigStrict.check(graph, config, ctx);
}

describe('tsconfig-strict', () => {
  it('passes a strictest tsconfig', () => {
    const ds = run(
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noUncheckedIndexedAccess: true,
          noImplicitOverride: true,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: true,
          exactOptionalPropertyTypes: true,
          noPropertyAccessFromIndexSignature: true,
        },
      }),
      { preset: 'strictest' },
    );
    expect(ds).toEqual([]);
  });

  it('flags an explicitly disabled strict', () => {
    const ds = run('{"compilerOptions":{"strict":false}}', { preset: 'recommended' });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.ruleId).toBe('tsconfig-strict');
    expect(ds[0]!.entity).toBe('tsconfig.json');
    expect(ds[0]!.fingerprint).toBe('strict');
    expect(ds[0]!.actual).toContain('false');
  });

  it('flags a missing strictest sub-flag', () => {
    const ds = run('{"compilerOptions":{"strict":true}}', { preset: 'strictest' });
    expect(ds.map((d) => d.fingerprint).sort()).toEqual([
      'exactOptionalPropertyTypes',
      'noFallthroughCasesInSwitch',
      'noImplicitOverride',
      'noImplicitReturns',
      'noPropertyAccessFromIndexSignature',
      'noUncheckedIndexedAccess',
    ]);
  });

  it('honours ignoreFlags', () => {
    const ds = run('{"compilerOptions":{"strict":true}}', {
      preset: 'strict',
      ignoreFlags: ['noUncheckedIndexedAccess', 'noImplicitOverride'],
    });
    expect(ds).toEqual([]);
  });

  it('honours additionalFlags', () => {
    const ds = run('{"compilerOptions":{"strict":true}}', {
      preset: 'recommended',
      additionalFlags: ['noUnusedLocals'],
    });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('noUnusedLocals');
  });

  it('returns nothing when tsconfig.json is absent', () => {
    expect(run(null, { preset: 'strictest' })).toEqual([]);
  });
});
