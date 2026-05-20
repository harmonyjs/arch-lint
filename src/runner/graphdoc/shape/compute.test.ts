/**
 * @fileoverview Tests for computeShape — the orchestrator that runs every
 * detector and optionally filters by subsystem.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Edge } from '#platform/graph/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import type { FolderTree } from '../model/tree.js';
import { computeShape, filterBySubsystem } from './compute.js';
import type { ShapeFinding } from './types.js';

const config = { project: { sourceRoot: 'src' } } as unknown as ResolvedConfig;

function edge(consumer: string, producer: string, typeOnly = false): Edge {
  return { consumer, producer, symbol: 'x', typeOnly };
}

function emptyFolder(path: string): FolderTree {
  return {
    path,
    name: path.split('/').pop() ?? '',
    folders: new Map(),
    files: [],
    folderNodes: [],
    subtreeSize: 0,
  };
}

describe('computeShape', () => {
  it('returns concatenated findings from every detector', () => {
    const tree = emptyFolder('src');
    const graph = makeGraph({
      edges: [edge('src/a.ts', 'src/b.ts', false), edge('src/b.ts', 'src/a.ts', true)],
    });
    const findings = computeShape({ graph, config, tree, locByPath: new Map() });
    expect(findings.some((f) => f.kind === 'type-circular-pair')).toBe(true);
  });

  it('returns an empty list when the graph has no anomalies', () => {
    const tree = emptyFolder('src');
    const graph = makeGraph({ edges: [] });
    expect(computeShape({ graph, config, tree, locByPath: new Map() })).toEqual([]);
  });
});

describe('filterBySubsystem', () => {
  const findings: ShapeFinding[] = [
    { kind: 'hub', file: 'src/runner/cli-commands.ts', fanIn: 1, fanOut: 5 },
    { kind: 'hub', file: 'src/foundation/x.ts', fanIn: 3, fanOut: 0 },
    {
      kind: 'carved-aspect',
      core: 'src/runner/cli.ts',
      aspect: 'src/foundation/y.ts',
      coreLoc: 0,
      aspectLoc: 0,
      direction: 'core→aspect',
    },
  ];

  it('keeps a finding when at least one of its paths is inside the subsystem', () => {
    const kept = filterBySubsystem(findings, 'runner', 'src');
    expect(kept).toHaveLength(2);
    expect(kept.find((f) => f.kind === 'hub' && f.file === 'src/foundation/x.ts')).toBeUndefined();
  });

  it('keeps a cross-subsystem finding if any path falls inside', () => {
    const kept = filterBySubsystem(findings, 'foundation', 'src');
    expect(kept.find((f) => f.kind === 'carved-aspect')).toBeDefined();
  });

  it('drops findings with no path inside the subsystem', () => {
    const kept = filterBySubsystem(findings, 'platform', 'src');
    expect(kept).toEqual([]);
  });
});
