/**
 * @fileoverview Tests for hooks-folder-required — use-* files must live in hooks/ (D7).
 */
import { describe, it, expect } from 'vitest';
import { hooksFolderRequired, type HooksFolderRequiredOptions } from './index.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { makeContext } from '../../test-support/make-context.js';
import type { ConventionsConfig, ResolvedConfig } from '../../../types.js';

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

function ctx(opts: Partial<HooksFolderRequiredOptions> = {}) {
  return makeContext<HooksFolderRequiredOptions>('hooks-folder-required', {
    severity: 'error',
    options: {
      hookFilePattern: '^use-[a-z][a-z0-9-]*\\.tsx?$',
      strictCheck: true,
      ...opts,
    },
  });
}

function graphOf(fileIds: readonly string[]) {
  return makeGraph({
    nodes: Object.fromEntries(fileIds.map((id) => [id, { kind: 'file' as const }])),
  });
}

describe('hooks-folder-required', () => {
  it('has the canonical metadata', () => {
    expect(hooksFolderRequired.pack).toBe('view');
    expect(hooksFolderRequired.engine).toBe('syntactic');
    expect(hooksFolderRequired.defaultSeverity).toBe('error');
  });

  it('flags a use-* file outside hooks/', () => {
    const diags = hooksFolderRequired.check(graphOf(['src/App/use-toggle.ts']), config, ctx());
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      ruleId: 'hooks-folder-required',
      severity: 'error',
      entity: 'src/App/use-toggle.ts',
      fingerprint: 'src/App/use-toggle.ts',
    });
  });

  it('does not flag a use-* file inside hooks/', () => {
    expect(
      hooksFolderRequired.check(graphOf(['src/App/hooks/use-toggle.ts']), config, ctx()),
    ).toHaveLength(0);
  });

  it('does not flag a regular file outside hooks/', () => {
    expect(
      hooksFolderRequired.check(graphOf(['src/App/Card.tsx']), config, ctx()),
    ).toHaveLength(0);
  });

  it('strictCheck:true flags a non-hook file inside hooks/', () => {
    const diags = hooksFolderRequired.check(graphOf(['src/App/hooks/helper.ts']), config, ctx());
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain('does not match the hook pattern');
  });

  it('strictCheck:false does not flag a non-hook file inside hooks/', () => {
    expect(
      hooksFolderRequired.check(
        graphOf(['src/App/hooks/helper.ts']),
        config,
        ctx({ strictCheck: false }),
      ),
    ).toHaveLength(0);
  });

  it('strictCheck:true does not flag a barrel inside hooks/', () => {
    expect(
      hooksFolderRequired.check(graphOf(['src/App/hooks/index.ts']), config, ctx()),
    ).toHaveLength(0);
  });

  it('uses a custom hookFilePattern for the Preact style', () => {
    const diags = hooksFolderRequired.check(
      graphOf(['src/App/useToggle.ts']),
      config,
      ctx({ hookFilePattern: '^use[A-Z][A-Za-z0-9]*\\.tsx?$' }),
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/App/useToggle.ts');
  });

  it('flags several use-* files outside hooks/', () => {
    expect(
      hooksFolderRequired.check(
        graphOf(['src/App/use-a.ts', 'src/App/use-b.tsx']),
        config,
        ctx(),
      ),
    ).toHaveLength(2);
  });
});
