/**
 * @fileoverview Tests for the npmrc-settings rule of the hygiene pack.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { npmrcSettings } from './index.js';

function run(npmrc: string | null, options: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'arch-lint-npmrc-'));
  if (npmrc !== null) writeFileSync(join(dir, '.npmrc'), npmrc);
  const config = {
    project: { tsconfig: 't', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
  } as ResolvedConfig;
  const graph = makeGraph({});
  const ctx = makeContext('npmrc-settings', {
    severity: 'error',
    project: graph.project,
    options,
  });
  return npmrcSettings.check(graph, config, ctx);
}

describe('npmrc-settings', () => {
  it('passes when all required pairs are present', () => {
    const ds = run('engine-strict=true\nsave-exact=true\n', {
      required: { 'engine-strict': true, 'save-exact': true },
    });
    expect(ds).toEqual([]);
  });

  it('flags a missing required key', () => {
    const ds = run('engine-strict=true\n', {
      required: { 'engine-strict': true, 'save-exact': true },
    });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('save-exact');
    expect(ds[0]!.entity).toBe('.npmrc');
  });

  it('flags a key with the wrong value', () => {
    const ds = run('engine-strict=false\nsave-exact=true\n', {
      required: { 'engine-strict': true, 'save-exact': true },
    });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('engine-strict');
    expect(ds[0]!.actual).toContain('false');
  });

  it('flags every required key when .npmrc is absent', () => {
    const ds = run(null, { required: { 'engine-strict': true, 'save-exact': true } });
    expect(ds.map((d) => d.fingerprint).sort()).toEqual(['engine-strict', 'save-exact']);
  });

  it('reports the line of the offending key', () => {
    const ds = run('save-exact=true\nengine-strict=false\n', {
      required: { 'engine-strict': true },
    });
    expect(ds[0]!.location.line).toBe(2);
  });
});
