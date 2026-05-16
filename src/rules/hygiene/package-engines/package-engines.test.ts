/**
 * @fileoverview Tests for the package-engines rule of the hygiene pack.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { packageEngines } from './index.js';

function run(packageJson: string | null, options: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'arch-lint-engines-'));
  if (packageJson !== null) writeFileSync(join(dir, 'package.json'), packageJson);
  const config = {
    project: { tsconfig: 't', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
  } as ResolvedConfig;
  const graph = makeGraph({});
  const ctx = makeContext('package-engines', {
    severity: 'error',
    project: graph.project,
    options,
  });
  return packageEngines.check(graph, config, ctx);
}

describe('package-engines', () => {
  it('passes when all required engine keys are declared', () => {
    const ds = run('{"engines":{"node":">=22","npm":">=10"}}', { requiredKeys: ['node', 'npm'] });
    expect(ds).toEqual([]);
  });

  it('flags a missing engine key', () => {
    const ds = run('{"engines":{"node":">=22"}}', { requiredKeys: ['node', 'npm'] });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('npm');
    expect(ds[0]!.entity).toBe('package.json');
  });

  it('flags every missing key when engines is absent', () => {
    const ds = run('{"name":"demo"}', { requiredKeys: ['node', 'npm'] });
    expect(ds.map((d) => d.fingerprint).sort()).toEqual(['node', 'npm']);
  });

  it('returns nothing when package.json is absent', () => {
    expect(run(null, { requiredKeys: ['node'] })).toEqual([]);
  });
});
