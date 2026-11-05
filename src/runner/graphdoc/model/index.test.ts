/**
 * @fileoverview Tests for buildGraphDoc — ConsumerGraph projection into a GraphDoc.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { buildGraphDoc } from './index.js';
import { slugOf } from './tree.js';

function cfg(): ResolvedConfig {
  return {
    project: { sourceRoot: 'src', cwd: '.', tsconfig: 'tsconfig.json' },
    layers: {},
    units: {},
    conventions: {
      privateSegment: 'private',
      sharedSegment: 'shared',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
    },
  } as ResolvedConfig;
}

describe('buildGraphDoc', () => {
  it('emits an Overview section first', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/b/y.ts': {} },
      edges: [{ consumer: 'src/a/x.ts', producer: 'src/b/y.ts', symbol: 'Y', typeOnly: false }],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    expect(doc.sections[0]?.slug).toBe('overview');
  });

  it('marks a node in a 2-file cycle as inCycle', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/a/y.ts': {} },
      edges: [
        { consumer: 'src/a/x.ts', producer: 'src/a/y.ts', symbol: 'Y', typeOnly: false },
        { consumer: 'src/a/y.ts', producer: 'src/a/x.ts', symbol: 'X', typeOnly: false },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const nodes = doc.sections.flatMap((s) => s.diagram.nodes);
    expect(nodes.some((n) => n.path === 'src/a/x.ts' && n.inCycle)).toBe(true);
  });

  it('classifies an index file as a barrel', () => {
    const graph = makeGraph({ nodes: { 'src/a/index.ts': { isEntity: false } } });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const node = doc.sections
      .flatMap((s) => s.diagram.nodes)
      .find((n) => n.path === 'src/a/index.ts');
    expect(node?.role).toBe('barrel');
  });

  it('carries the fileoverview text onto the node', () => {
    const graph = makeGraph({ nodes: { 'src/a/x.ts': { isEntity: true } } });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map([['src/a/x.ts', 'does a thing']]),
      config: cfg(),
      locByPath: new Map(),
    });
    const node = doc.sections.flatMap((s) => s.diagram.nodes).find((n) => n.path === 'src/a/x.ts');
    expect(node?.fileoverview).toBe('does a thing');
  });

  it('promotes a folder over THRESHOLD to a group node with its own section', () => {
    const nodes: Record<string, Record<string, never>> = {};
    for (let i = 0; i < 20; i += 1) nodes[`src/big/f${i}.ts`] = {};
    const graph = makeGraph({ nodes });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });

    const overview = doc.sections.find((s) => s.slug === 'overview');
    const group = overview?.diagram.nodes.find((n) => n.kind === 'group');
    expect(group?.path).toBe('src/big');
    expect(group?.linkSlug).toBe('big');
    expect(doc.sections.some((s) => s.slug === 'big')).toBe(true);
  });

  it('inlines a small subfolder as a RenderCluster', () => {
    const graph = makeGraph({
      nodes: { 'src/app/core/a.ts': {}, 'src/app/core/b.ts': {}, 'src/app/top.ts': {} },
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const appSection = doc.sections.find((s) => s.slug === 'app');
    expect(appSection).toBeDefined();
    const cluster = appSection?.diagram.clusters.find((c) => c.title === 'core');
    expect(cluster).toBeDefined();
    expect(cluster?.nodeIds.length).toBe(2);
  });

  it('routes a cross-section edge through a port node', () => {
    const nodes: Record<string, Record<string, never>> = {};
    for (let i = 0; i < 20; i += 1) nodes[`src/big/f${i}.ts`] = {};
    nodes['src/lonely/u.ts'] = {};
    const graph = makeGraph({
      nodes,
      edges: [
        { consumer: 'src/big/f0.ts', producer: 'src/lonely/u.ts', symbol: 'U', typeOnly: false },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const bigSection = doc.sections.find((s) => s.slug === 'big');
    const port = bigSection?.diagram.nodes.find((n) => n.kind === 'port');
    expect(port).toBeDefined();
    expect(port?.linkSlug).toBe('lonely');
    const edge = bigSection?.diagram.edges.find((e) => e.toId === port?.id);
    expect(edge).toBeDefined();
  });

  it('attaches a coupling badge to each Overview subsystem', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/b/y.ts': {} },
      edges: [{ consumer: 'src/a/x.ts', producer: 'src/b/y.ts', symbol: 'Y', typeOnly: false }],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const overview = doc.sections.find((s) => s.slug === 'overview');
    const aNode = overview?.diagram.nodes.find((n) => n.path === 'src/a');
    expect(aNode).toBeDefined();
    const badge = overview?.diagram.coupling.get(aNode?.id ?? '');
    expect(badge).toBeDefined();
    expect(badge?.ce).toBe(1);
    expect(badge?.ca).toBe(0);
    expect(badge?.instability).toBe(1);
  });

  it('groups the Overview by top-level folder when sub-folder units are declared', () => {
    const graph = makeGraph({
      nodes: { 'src/a/sub/x.ts': {}, 'src/b/sub/y.ts': {} },
      edges: [
        { consumer: 'src/a/sub/x.ts', producer: 'src/b/sub/y.ts', symbol: 'Y', typeOnly: false },
      ],
    });
    const config = {
      ...cfg(),
      units: { 'a/sub': 'a/sub/**', 'b/sub': 'b/sub/**' },
    } as ResolvedConfig;
    const doc = buildGraphDoc({ graph, fileoverviews: new Map(), config, locByPath: new Map() });
    const overview = doc.sections.find((s) => s.slug === 'overview');
    const aNode = overview?.diagram.nodes.find((n) => n.path === 'src/a');
    const bNode = overview?.diagram.nodes.find((n) => n.path === 'src/b');
    expect(aNode).toBeDefined();
    expect(bNode).toBeDefined();
    expect(
      overview?.diagram.edges.some((e) => e.fromId === aNode?.id && e.toId === bNode?.id),
    ).toBe(true);
    expect(overview?.diagram.coupling.get(aNode?.id ?? '')?.ce).toBe(1);
  });

  it('gives the lower-weight direction of an Overview cycle a back edge', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/a/x2.ts': {}, 'src/b/y.ts': {} },
      edges: [
        { consumer: 'src/a/x.ts', producer: 'src/b/y.ts', symbol: 'Y', typeOnly: false },
        { consumer: 'src/a/x2.ts', producer: 'src/b/y.ts', symbol: 'Y2', typeOnly: false },
        { consumer: 'src/b/y.ts', producer: 'src/a/x.ts', symbol: 'X', typeOnly: false },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const overview = doc.sections.find((s) => s.slug === 'overview');
    expect(overview?.diagram.edges.some((e) => e.back)).toBe(true);
  });

  it('renders an unresolved import as an unresolved-role node with an edge', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {} },
      unresolved: [
        {
          file: 'src/a/x.ts',
          specifier: './missing.js',
          symbol: 'Gone',
          location: { file: 'src/a/x.ts', line: 1, column: 1 },
          reason: 'missing',
        },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const nodes = doc.sections.flatMap((s) => s.diagram.nodes);
    const unresolved = nodes.find((n) => n.role === 'unresolved');
    expect(unresolved?.path).toBe('./missing.js');
    expect(unresolved?.fileoverview).toBe('unresolved (missing)');
    const section = doc.sections.find((s) =>
      s.diagram.nodes.some((n) => n.path === './missing.js'),
    );
    expect(section?.diagram.edges.some((e) => e.toId === unresolved?.id)).toBe(true);
    expect(section?.note).toBeNull();
  });

  it('options.subsystem returns only that subsystem section with no Overview', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/b/y.ts': {} },
      edges: [{ consumer: 'src/a/x.ts', producer: 'src/b/y.ts', symbol: 'Y', typeOnly: false }],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
      subsystem: 'a',
    });
    expect(doc.sections.every((s) => s.slug !== 'overview')).toBe(true);
    expect(doc.sections.some((s) => s.slug === 'a')).toBe(true);
    expect(doc.sections.some((s) => s.slug === 'b')).toBe(false);
  });

  it('collapses parallel edges and keeps a same-section edge', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/a/y.ts': {} },
      edges: [
        { consumer: 'src/a/x.ts', producer: 'src/a/y.ts', symbol: 'Y1', typeOnly: false },
        { consumer: 'src/a/x.ts', producer: 'src/a/y.ts', symbol: 'Y2', typeOnly: true },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
      subsystem: 'a',
    });
    const section = doc.sections.find((s) => s.slug === 'a');
    expect(section?.diagram.edges.length).toBe(1);
    expect(section?.diagram.edges[0]?.typeOnly).toBe(false);
  });

  it('marks a type-only edge as typeOnly when every collapsed edge is type-only', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/a/y.ts': {} },
      edges: [{ consumer: 'src/a/x.ts', producer: 'src/a/y.ts', symbol: 'T', typeOnly: true }],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
      subsystem: 'a',
    });
    const section = doc.sections.find((s) => s.slug === 'a');
    expect(section?.diagram.edges[0]?.typeOnly).toBe(true);
  });

  it('classifies a folder graph node as component-folder', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/a/sub': { kind: 'folder' } },
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const node = doc.sections.flatMap((s) => s.diagram.nodes).find((n) => n.path === 'src/a/sub');
    expect(node?.role).toBe('component-folder');
  });

  it('classifies a convention-segment folder as a role-folder', () => {
    const graph = makeGraph({ nodes: { 'src/a/hooks/h.ts': {} } });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const hooks = doc.sections
      .flatMap((s) => s.diagram.clusters)
      .flatMap(function flat(c): unknown[] {
        return [c, ...c.children.flatMap(flat)];
      });
    expect(hooks.some((c) => (c as { title: string }).title === 'hooks')).toBe(true);
  });

  it('classifies an entity file as entity-file and propagates placement/cluster', () => {
    const graph = makeGraph({
      nodes: {
        'src/a/x.ts': { isEntity: true, placementMode: 'explicit', cluster: 'ui' },
      },
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const node = doc.sections.flatMap((s) => s.diagram.nodes).find((n) => n.path === 'src/a/x.ts');
    expect(node?.role).toBe('entity-file');
    expect(node?.placement).toBe('explicit');
    expect(node?.cluster).toBe('ui');
  });

  it('resolves a layer for a node when layers are configured', () => {
    const config = cfg();
    const withLayers = {
      ...config,
      layers: { domain: { canImport: [] } },
    } as ResolvedConfig;
    const graph = makeGraph({ nodes: { 'src/domain/x.ts': { isEntity: true } } });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: withLayers,
      locByPath: new Map(),
    });
    const node = doc.sections
      .flatMap((s) => s.diagram.nodes)
      .find((n) => n.path === 'src/domain/x.ts');
    expect(node?.layer).toBe('domain');
  });

  it('renders a root-level file directly under the source root', () => {
    const graph = makeGraph({ nodes: { 'src/main.ts': {}, 'src/a/x.ts': {} } });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const overview = doc.sections.find((s) => s.slug === 'overview');
    const node = overview?.diagram.nodes.find((n) => n.path === 'src/main.ts');
    expect(node?.name).toBe('main.ts');
    expect(node?.role).toBe('plain-file');
  });

  it('nests a deeper subfolder as a child RenderCluster', () => {
    const graph = makeGraph({
      nodes: { 'src/app/core/deep/d.ts': {}, 'src/app/core/c.ts': {}, 'src/app/top.ts': {} },
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const appSection = doc.sections.find((s) => s.slug === 'app');
    const core = appSection?.diagram.clusters.find((c) => c.title === 'core');
    expect(core?.children.some((c) => c.title === 'deep')).toBe(true);
  });

  it('keeps a big subfolder of a section as a group node linking to its section', () => {
    const nodes: Record<string, Record<string, never>> = { 'src/app/top.ts': {} };
    for (let i = 0; i < 20; i += 1) nodes[`src/app/heavy/f${i}.ts`] = {};
    const graph = makeGraph({ nodes });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const appSection = doc.sections.find((s) => s.slug === 'app');
    const group = appSection?.diagram.nodes.find((n) => n.kind === 'group');
    expect(group?.path).toBe('src/app/heavy');
    expect(group?.linkSlug).toBe('app-heavy');
  });

  it('uses the from > to tiebreak for an equal-weight Overview cycle', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/b/y.ts': {} },
      edges: [
        { consumer: 'src/a/x.ts', producer: 'src/b/y.ts', symbol: 'Y', typeOnly: false },
        { consumer: 'src/b/y.ts', producer: 'src/a/x.ts', symbol: 'X', typeOnly: false },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const overview = doc.sections.find((s) => s.slug === 'overview');
    const backEdges = overview?.diagram.edges.filter((e) => e.back) ?? [];
    expect(backEdges.length).toBe(1);
  });

  it('emits no diagram nodes when the graph is empty', () => {
    const doc = buildGraphDoc({
      graph: makeGraph({}),
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    expect(doc.sections).toEqual([
      {
        title: 'Overview',
        slug: 'overview',
        note: null,
        diagram: { nodes: [], edges: [], clusters: [], coupling: new Map() },
      },
    ]);
  });

  it('takes a folder barrel @fileoverview as the section note', () => {
    const graph = makeGraph({
      nodes: { 'src/a/index.ts': {}, 'src/a/x.ts': {} },
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map([['src/a/index.ts', 'the a barrel']]),
      config: cfg(),
      locByPath: new Map(),
    });
    const section = doc.sections.find((s) => s.slug === 'a');
    expect(section?.note).toBe('the a barrel');
  });

  it('ignores graph nodes outside the source root', () => {
    const graph = makeGraph({ nodes: { 'src/a/x.ts': {}, 'vendor/lib.ts': {} } });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
    });
    const paths = doc.sections.flatMap((s) => s.diagram.nodes).map((n) => n.path);
    expect(paths).not.toContain('vendor/lib.ts');
  });

  it('collapses two runtime parallel edges into one runtime edge', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/a/y.ts': {} },
      edges: [
        { consumer: 'src/a/x.ts', producer: 'src/a/y.ts', symbol: 'A', typeOnly: false },
        { consumer: 'src/a/x.ts', producer: 'src/a/y.ts', symbol: 'B', typeOnly: false },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
      subsystem: 'a',
    });
    const edges = doc.sections.find((s) => s.slug === 'a')?.diagram.edges ?? [];
    expect(edges.length).toBe(1);
    expect(edges[0]?.typeOnly).toBe(false);
  });

  it('collapses a runtime + type-only pair, keeping it as a type-only edge only if all are', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {}, 'src/a/y.ts': {} },
      edges: [
        { consumer: 'src/a/x.ts', producer: 'src/a/y.ts', symbol: 'A', typeOnly: true },
        { consumer: 'src/a/x.ts', producer: 'src/a/y.ts', symbol: 'B', typeOnly: false },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
      subsystem: 'a',
    });
    const edges = doc.sections.find((s) => s.slug === 'a')?.diagram.edges ?? [];
    expect(edges[0]?.typeOnly).toBe(false);
  });

  it('deduplicates an unresolved specifier imported twice from the same file', () => {
    const entry = {
      file: 'src/a/x.ts',
      specifier: './gone.js',
      symbol: 'A',
      location: { file: 'src/a/x.ts', line: 1, column: 1 },
      reason: 'missing' as const,
    };
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {} },
      unresolved: [entry, { ...entry, symbol: 'B' }],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
      subsystem: 'a',
    });
    const section = doc.sections.find((s) => s.slug === 'a');
    const unresolvedNodes = section?.diagram.nodes.filter((n) => n.role === 'unresolved') ?? [];
    expect(unresolvedNodes.length).toBe(1);
  });

  it('drops an unresolved entry whose importer is not in the section', () => {
    const graph = makeGraph({
      nodes: { 'src/a/x.ts': {} },
      unresolved: [
        {
          file: 'src/b/y.ts',
          specifier: './nope.js',
          symbol: 'N',
          location: { file: 'src/b/y.ts', line: 1, column: 1 },
          reason: 'missing',
        },
      ],
    });
    const doc = buildGraphDoc({
      graph,
      fileoverviews: new Map(),
      config: cfg(),
      locByPath: new Map(),
      subsystem: 'a',
    });
    const section = doc.sections.find((s) => s.slug === 'a');
    expect(section?.diagram.nodes.some((n) => n.role === 'unresolved')).toBe(false);
  });
});

describe('buildGraphDoc — sourceRoot spellings', () => {
  function docFor(sourceRoot: string, prefix: string) {
    const graph = makeGraph({
      nodes: { [`${prefix}main.ts`]: {}, [`${prefix}a/x.ts`]: {}, [`${prefix}b/y.ts`]: {} },
      edges: [
        { consumer: `${prefix}a/x.ts`, producer: `${prefix}b/y.ts`, symbol: 'Y', typeOnly: false },
      ],
    });
    const base = cfg();
    const config = { ...base, project: { ...base.project, sourceRoot } } as ResolvedConfig;
    const doc = buildGraphDoc({ graph, fileoverviews: new Map(), config, locByPath: new Map() });
    return doc.sections.map((s) => ({
      slug: s.slug,
      title: s.title,
      nodes: s.diagram.nodes.map((n) => n.name),
      edges: s.diagram.edges.length,
    }));
  }

  it.each([
    { sourceRoot: 'src/', prefix: 'src/' },
    { sourceRoot: './src', prefix: 'src/' },
    { sourceRoot: '.', prefix: '' },
    { sourceRoot: './', prefix: '' },
    { sourceRoot: '', prefix: '' },
  ])('renders under "$sourceRoot" exactly what "src" renders', ({ sourceRoot, prefix }) => {
    expect(docFor(sourceRoot, prefix)).toEqual(docFor('src', 'src/'));
  });
});

describe('slugOf', () => {
  it('maps the source root to overview', () => {
    expect(slugOf('src', 'src')).toBe('overview');
  });

  it('joins nested path segments with a hyphen', () => {
    expect(slugOf('src/a/b', 'src')).toBe('a-b');
  });

  it('does not collide a hyphenated folder name with a nested path', () => {
    expect(slugOf('src/a-b', 'src')).not.toBe(slugOf('src/a/b', 'src'));
  });
});
