/**
 * @fileoverview Tests for the exact-dependency-versions rule of the hygiene pack.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { exactDependencyVersions } from './index.js';

function run(packageJson: string, options: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'arch-lint-exact-'));
  writeFileSync(join(dir, 'package.json'), packageJson);
  const config = {
    project: { tsconfig: 't', sourceRoot: 'src', cwd: dir, includeOutOfRoot: false },
  } as ResolvedConfig;
  const graph = makeGraph({});
  const ctx = makeContext('exact-dependency-versions', {
    severity: 'error',
    project: graph.project,
    options,
  });
  return exactDependencyVersions.check(graph, config, ctx);
}

describe('exact-dependency-versions', () => {
  it('passes exact pinned versions', () => {
    const ds = run('{"dependencies":{"zod":"4.4.3"}}', { sections: ['dependencies'] });
    expect(ds).toEqual([]);
  });

  it('flags a caret range', () => {
    const ds = run('{"dependencies":{"zod":"^4.4.3"}}', { sections: ['dependencies'] });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.fingerprint).toBe('dependencies#zod');
    expect(ds[0]!.entity).toBe('package.json');
  });

  it('flags a tilde range and a dist-tag', () => {
    const ds = run('{"devDependencies":{"a":"~1.0.0","b":"latest"}}', {
      sections: ['devDependencies'],
    });
    expect(ds.map((d) => d.fingerprint).sort()).toEqual(['devDependencies#a', 'devDependencies#b']);
  });

  it('ignores peerDependencies even if listed in sections', () => {
    const ds = run('{"peerDependencies":{"react":"^18.0.0"}}', {
      sections: ['dependencies', 'devDependencies', 'peerDependencies'],
    });
    expect(ds).toEqual([]);
  });

  it('ignores workspace and file protocols', () => {
    const ds = run('{"dependencies":{"pkg":"workspace:*","local":"file:../local"}}', {
      sections: ['dependencies'],
    });
    expect(ds).toEqual([]);
  });
});
