/**
 * @fileoverview Tests for ui-cluster-membership — a trigger-package file must live in the cluster.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { type UiClusterMembershipOptions, uiClusterMembership } from './index.js';

const config = {} as unknown as ResolvedConfig;

function graphFor(files: Record<string, string>) {
  return makeGraph({
    nodes: Object.fromEntries(
      Object.keys(files).map((id) => [id, { kind: 'file' as const, isEntity: true }]),
    ),
    files,
  });
}

function run(files: Record<string, string>, opts: Partial<UiClusterMembershipOptions> = {}) {
  const graph = graphFor(files);
  return uiClusterMembership.check(
    graph,
    config,
    makeContext<UiClusterMembershipOptions>('ui-cluster-membership', {
      severity: 'error',
      options: {
        triggerPackages: ['@react-aria/*', '@react-stately/*'],
        mustLiveIn: 'src/App/ui',
        ...opts,
      },
      project: graph.project,
    }),
  );
}

describe('ui-cluster-membership', () => {
  it('has the canonical metadata', () => {
    expect(uiClusterMembership.pack).toBe('view');
    expect(uiClusterMembership.engine).toBe('syntactic');
    expect(uiClusterMembership.defaultSeverity).toBe('error');
  });

  it('flags a file with a trigger package outside the cluster', () => {
    const diags = run({
      'src/App/Widget/Widget.tsx': `import { useButton } from '@react-aria/button';`,
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      ruleId: 'ui-cluster-membership',
      severity: 'error',
      entity: 'src/App/Widget/Widget.tsx',
    });
    expect(diags[0]?.fingerprint).toBeUndefined();
    expect(diags[0]?.expected).toBe('src/App/ui');
  });

  it('does not flag a file already inside the cluster', () => {
    expect(
      run({
        'src/App/ui/Button/Button.tsx': `import { useButton } from '@react-aria/button';`,
      }),
    ).toHaveLength(0);
  });

  it('does not flag a file with no trigger imports', () => {
    expect(run({ 'src/App/Widget/Widget.tsx': `import { useState } from 'react';` })).toHaveLength(
      0,
    );
  });

  it('emits one verdict per file with several trigger imports', () => {
    const diags = run({
      'src/App/Widget/Widget.tsx':
        `import { useButton } from '@react-aria/button';\n` +
        `import { useToggleState } from '@react-stately/toggle';`,
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain('@react-aria/button');
    expect(diags[0]?.message).toContain('@react-stately/toggle');
  });

  it('suggestion recommends extracting the primitive into the cluster', () => {
    const [diag] = run({
      'src/App/Widget/Widget.tsx': `import { useButton } from '@react-aria/button';`,
    });
    expect(diag?.suggestions[0]).toMatchObject({ action: 'move', target: 'src/App/ui' });
    expect(diag?.suggestions[0]?.rationale).toContain('thin wrapper');
  });

  it('is parametrized by config — Preact packages', () => {
    const diags = run(
      { 'src/Widget/Widget.tsx': `import { signal } from '@preact/signals';` },
      { triggerPackages: ['@preact/*'], mustLiveIn: 'src/ui' },
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.expected).toBe('src/ui');
  });

  it('flags several files outside the cluster', () => {
    expect(
      run({
        'src/App/A/A.tsx': `import { useButton } from '@react-aria/button';`,
        'src/App/B/B.tsx': `import { useToggleState } from '@react-stately/toggle';`,
      }),
    ).toHaveLength(2);
  });

  it('treats a file at the cluster depth as outside the cluster', () => {
    const diags = run(
      { 'src/App/ui.tsx': `import { useButton } from '@react-aria/button';` },
      { mustLiveIn: 'src/App/ui' },
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/App/ui.tsx');
  });

  it('skips a file node that is absent from the parsed project', () => {
    const graph = makeGraph({
      nodes: { 'src/App/Widget/Widget.tsx': { kind: 'file', isEntity: true } },
    });
    const diags = uiClusterMembership.check(
      graph,
      config,
      makeContext<UiClusterMembershipOptions>('ui-cluster-membership', {
        severity: 'error',
        options: { triggerPackages: ['@react-aria/*'], mustLiveIn: 'src/App/ui' },
        project: graph.project,
      }),
    );
    expect(diags).toEqual([]);
  });

  it('applies its option defaults when the context carries no options', () => {
    const graph = graphFor({
      'src/App/App.tsx': `import { useButton } from '@react-aria/button';`,
    });
    const emptyCtx = makeContext<UiClusterMembershipOptions>('ui-cluster-membership', {
      severity: 'error',
      project: graph.project,
    });
    expect(() => uiClusterMembership.check(graph, config, emptyCtx)).not.toThrow();
    // Default triggerPackages:[] makes the rule a no-op until a project names its packages.
    expect(uiClusterMembership.check(graph, config, emptyCtx)).toEqual([]);
  });
});
