/**
 * @fileoverview Tests for the prefix-cluster-folder rule.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { only } from '../../test-support/only.js';
import { prefixClusterFolder } from './index.js';

const cfg = {} as ResolvedConfig;

describe('prefixClusterFolder', () => {
  it('has the canonical metadata', () => {
    expect(prefixClusterFolder.id).toBe('prefix-cluster-folder');
    expect(prefixClusterFolder.pack).toBe('structure');
    expect(prefixClusterFolder.engine).toBe('graph');
    expect(prefixClusterFolder.defaultSeverity).toBe('warning');
  });

  it('flags a directory where 3 files share a prefix', () => {
    const g = makeGraph({
      nodes: {
        'src/auth/auth-login.ts': {},
        'src/auth/auth-logout.ts': {},
        'src/auth/auth-session.ts': {},
      },
    });
    const out = prefixClusterFolder.check(g, cfg, makeContext('prefix-cluster-folder'));
    const d = only(out);
    expect(d.entity).toBe('src/auth');
    expect(d.fingerprint).toBe('prefix-cluster-folder#src/auth#auth');
    expect(d.message).toBe('3 files in src/auth share the "auth-" prefix');
    expect(d.actual).toBe('auth-login.ts, auth-logout.ts, auth-session.ts');
    expect(d.location).toEqual({ file: 'src/auth', line: 1, column: 1 });
  });

  it('does not flag a 2-file cluster under the default min of 3', () => {
    const g = makeGraph({
      nodes: { 'src/a/auth-login.ts': {}, 'src/a/auth-logout.ts': {} },
    });
    expect(prefixClusterFolder.check(g, cfg, makeContext('prefix-cluster-folder'))).toEqual([]);
  });

  it('respects a custom min option', () => {
    const g = makeGraph({
      nodes: { 'src/a/auth-login.ts': {}, 'src/a/auth-logout.ts': {} },
    });
    const ctx = makeContext('prefix-cluster-folder', { options: { min: 2 } });
    expect(prefixClusterFolder.check(g, cfg, ctx)).toHaveLength(1);
  });

  it('excludes test files from the cluster count', () => {
    const g = makeGraph({
      nodes: {
        'src/a/auth-login.ts': {},
        'src/a/auth-logout.ts': {},
        'src/a/auth-session.test.ts': {},
      },
    });
    expect(prefixClusterFolder.check(g, cfg, makeContext('prefix-cluster-folder'))).toEqual([]);
  });

  it('does not count a file whose name equals the bare prefix', () => {
    const g = makeGraph({
      nodes: {
        'src/a/auth.ts': {},
        'src/a/auth-login.ts': {},
        'src/a/auth-logout.ts': {},
      },
    });
    expect(prefixClusterFolder.check(g, cfg, makeContext('prefix-cluster-folder'))).toEqual([]);
  });

  it('groups by direct parent only — nested files do not merge', () => {
    const g = makeGraph({
      nodes: {
        'src/a/auth-login.ts': {},
        'src/a/auth-logout.ts': {},
        'src/a/nested/auth-session.ts': {},
      },
    });
    expect(prefixClusterFolder.check(g, cfg, makeContext('prefix-cluster-folder'))).toEqual([]);
  });

  it('emits one diagnostic per (directory, prefix) pair', () => {
    const g = makeGraph({
      nodes: {
        'src/a/auth-login.ts': {},
        'src/a/auth-logout.ts': {},
        'src/a/auth-session.ts': {},
        'src/a/user-create.ts': {},
        'src/a/user-delete.ts': {},
        'src/a/user-update.ts': {},
      },
    });
    const out = prefixClusterFolder.check(g, cfg, makeContext('prefix-cluster-folder'));
    expect(out).toHaveLength(2);
    expect(out.map((d) => d.fingerprint).sort()).toEqual([
      'prefix-cluster-folder#src/a#auth',
      'prefix-cluster-folder#src/a#user',
    ]);
  });

  it('emits nothing for an empty graph', () => {
    expect(
      prefixClusterFolder.check(makeGraph({}), cfg, makeContext('prefix-cluster-folder')),
    ).toEqual([]);
  });
});
