/**
 * @fileoverview Golden tests for single-section Mermaid rendering.
 */
import { describe, expect, it } from 'vitest';
import { renderDiagram } from './mermaid.js';
import type { DocSection, RenderCluster, RenderEdge, RenderNode } from './types.js';

function section(over: Partial<DocSection> = {}): DocSection {
  return {
    title: 'graph',
    slug: 'graph',
    note: null,
    diagram: {
      nodes: [
        {
          id: 'n0',
          path: 'src/graph/build.ts',
          name: 'build.ts',
          kind: 'file',
          role: 'entity-file',
          layer: null,
          placement: 'reactive',
          cluster: null,
          fileoverview: 'Cold build orchestration.',
          inCycle: false,
          linkSlug: null,
        },
      ],
      edges: [],
      clusters: [],
      coupling: new Map(),
    },
    ...over,
  };
}

/** Build a render node with overridable defaults. */
function node(over: Partial<RenderNode> = {}): RenderNode {
  return {
    id: 'n0',
    path: 'src/a.ts',
    name: 'a.ts',
    kind: 'file',
    role: 'entity-file',
    layer: null,
    placement: 'reactive',
    cluster: null,
    fileoverview: null,
    inCycle: false,
    linkSlug: null,
    ...over,
  };
}

/** Build a section whose diagram holds exactly the given nodes/edges/clusters. */
function withDiagram(
  nodes: RenderNode[],
  edges: RenderEdge[] = [],
  clusters: RenderCluster[] = [],
): DocSection {
  return section({ diagram: { nodes, edges, clusters, coupling: new Map() } });
}

/** The bracketed declaration line for a node id — the part without the %% comment. */
function nodeLine(rendered: string, id: string): string {
  const line = rendered.split('\n').find((l) => new RegExp(`^\\s*${id}[\\[{(>]`).test(l));
  if (line === undefined) throw new Error(`no declaration line for ${id}`);
  return line;
}

describe('renderDiagram', () => {
  it('opens with a flowchart header', () => {
    expect(renderDiagram(section()).startsWith('flowchart LR')).toBe(true);
  });

  it('emits a %% comment carrying the full fileoverview', () => {
    expect(renderDiagram(section())).toContain('%% src/graph/build.ts: Cold build orchestration.');
  });

  it('renders an entity-file node as a rectangle with the name', () => {
    expect(renderDiagram(section())).toContain('n0["build.ts');
  });

  it('renders a type-only edge dashed', () => {
    const s = section({
      diagram: {
        nodes: [
          {
            id: 'n0',
            path: 'src/a.ts',
            name: 'a.ts',
            kind: 'file',
            role: 'entity-file',
            layer: null,
            placement: 'reactive',
            cluster: null,
            fileoverview: null,
            inCycle: false,
            linkSlug: null,
          },
          {
            id: 'n1',
            path: 'src/b.ts',
            name: 'b.ts',
            kind: 'file',
            role: 'entity-file',
            layer: null,
            placement: 'reactive',
            cluster: null,
            fileoverview: null,
            inCycle: false,
            linkSlug: null,
          },
        ],
        edges: [{ fromId: 'n0', toId: 'n1', typeOnly: true, back: false, weight: null }],
        clusters: [],
        coupling: new Map(),
      },
    });
    expect(renderDiagram(s)).toContain('n0 -.');
  });

  it('renders a component-folder node with double-rectangle brackets', () => {
    const out = renderDiagram(withDiagram([node({ role: 'component-folder', name: 'Header' })]));
    expect(out).toContain('n0[["Header"]]');
  });

  it('renders a barrel node with rounded-stadium brackets', () => {
    const out = renderDiagram(
      withDiagram([node({ role: 'barrel', name: 'index.ts', fileoverview: 'Barrel re-exports.' })]),
    );
    expect(out).toContain('n0(["index.ts"])');
  });

  it('renders a role-folder node with hexagon brackets', () => {
    const out = renderDiagram(withDiagram([node({ role: 'role-folder', name: 'rules' })]));
    expect(out).toContain('n0{{"rules"}}');
  });

  it('renders a group node with double-rectangle brackets', () => {
    const out = renderDiagram(withDiagram([node({ kind: 'group', name: 'graph' })]));
    expect(out).toContain('n0[["graph"]]');
  });

  it('renders a port node with the asymmetric flag shape', () => {
    const out = renderDiagram(withDiagram([node({ kind: 'port', name: 'public-api' })]));
    expect(out).toContain('n0>"public-api"]');
  });

  it('emits a (no @fileoverview) comment for a null fileoverview', () => {
    const out = renderDiagram(withDiagram([node({ path: 'src/x.ts', fileoverview: null })]));
    expect(out).toContain('%% src/x.ts: (no @fileoverview)');
  });

  it('renders a runtime edge with a solid arrow', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' }), node({ id: 'n1', path: 'src/b.ts', name: 'b.ts' })],
        [{ fromId: 'n0', toId: 'n1', typeOnly: false, back: false, weight: null }],
      ),
    );
    expect(out).toContain('n0 --> n1');
  });

  it('labels a back edge with "back"', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' }), node({ id: 'n1', path: 'src/b.ts', name: 'b.ts' })],
        [{ fromId: 'n0', toId: 'n1', typeOnly: false, back: true, weight: null }],
      ),
    );
    expect(out).toContain('|back|');
  });

  it('labels an edge with its weight', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' }), node({ id: 'n1', path: 'src/b.ts', name: 'b.ts' })],
        [{ fromId: 'n0', toId: 'n1', typeOnly: false, back: false, weight: 7 }],
      ),
    );
    expect(out).toContain('|7|');
  });

  it('renders a type-only back edge with a dashed arrow and back label', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' }), node({ id: 'n1', path: 'src/b.ts', name: 'b.ts' })],
        [{ fromId: 'n0', toId: 'n1', typeOnly: true, back: true, weight: null }],
      ),
    );
    expect(out).toContain('n0 -.');
    expect(out).toContain('back');
  });

  it('wraps a cluster in subgraph/end blocks', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' })],
        [],
        [{ title: 'graph subsystem', nodeIds: ['n0'], children: [], note: null }],
      ),
    );
    expect(out).toContain('subgraph graph subsystem');
    expect(out).toContain('end');
  });

  it('nests a child cluster inside its parent subgraph', () => {
    const child: RenderCluster = {
      title: 'inner',
      nodeIds: ['n1'],
      children: [],
      note: null,
    };
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' }), node({ id: 'n1', path: 'src/b.ts', name: 'b.ts' })],
        [],
        [{ title: 'outer', nodeIds: ['n0'], children: [child], note: null }],
      ),
    );
    const outerAt = out.indexOf('subgraph outer');
    const innerAt = out.indexOf('subgraph inner');
    expect(outerAt).toBeGreaterThanOrEqual(0);
    expect(innerAt).toBeGreaterThan(outerAt);
    // The inner subgraph closes before the outer one — two `end` lines.
    expect(out.match(/^\s*end$/gm)?.length).toBe(2);
  });

  it('precedes a cluster with its note as a %% comment', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' })],
        [],
        [{ title: 'graph', nodeIds: ['n0'], children: [], note: 'leaf subsystem' }],
      ),
    );
    expect(out).toContain('%% leaf subsystem');
  });

  it('gives an inCycle node a red-border class', () => {
    const out = renderDiagram(withDiagram([node({ id: 'n0', inCycle: true })]));
    expect(out).toMatch(/class n0 \w*[Cc]ycle\w*/);
    expect(out).toContain('classDef');
    expect(out.toLowerCase()).toContain('stroke:#');
  });

  it('gives an unresolved node a red-border class', () => {
    const out = renderDiagram(
      withDiagram([node({ id: 'n0', role: 'unresolved', name: 'missing-dep' })]),
    );
    expect(out).toMatch(/class n0 \w*[Uu]nresolved\w*/);
  });

  it('prefixes an explicit-placement node label with a diamond', () => {
    const out = renderDiagram(withDiagram([node({ id: 'n0', placement: 'explicit' })]));
    expect(out).toContain('◆');
  });

  it('does not prefix a reactive-placement node label with a diamond', () => {
    const out = renderDiagram(withDiagram([node({ id: 'n0', placement: 'reactive' })]));
    expect(out).not.toContain('◆');
  });

  it('escapes a double quote in a label as &quot;', () => {
    const out = renderDiagram(withDiagram([node({ id: 'n0', name: 'a"b.ts' })]));
    expect(out).toContain('&quot;');
    expect(out).not.toContain('a"b.ts');
  });

  it('drops newlines from a node label', () => {
    const out = renderDiagram(
      withDiagram([node({ id: 'n0', name: 'a.ts', fileoverview: 'Line one.\nLine two.' })]),
    );
    // Newlines may survive in the %% comment but never inside the node declaration.
    expect(nodeLine(out, 'n0')).not.toMatch(/[\r\n]/);
  });

  it('appends the first sentence of a fileoverview to a file node label', () => {
    const out = renderDiagram(
      withDiagram([
        node({
          id: 'n0',
          name: 'build.ts',
          fileoverview: 'Cold build orchestration. Second sentence ignored.',
        }),
      ]),
    );
    const line = nodeLine(out, 'n0');
    expect(line).toContain('<br/>');
    expect(line).toContain('Cold build orchestration.');
    expect(line).not.toContain('Second sentence ignored');
  });

  it('truncates a long first sentence to 80 characters in the label', () => {
    const long = `${'x'.repeat(120)}.`;
    const out = renderDiagram(
      withDiagram([node({ id: 'n0', name: 'big.ts', fileoverview: long })]),
    );
    const line = nodeLine(out, 'n0');
    expect(line).toContain('x'.repeat(80));
    expect(line).not.toContain('x'.repeat(81));
  });

  it('does not append a fileoverview sentence to a barrel node label', () => {
    const out = renderDiagram(
      withDiagram([
        node({ id: 'n0', role: 'barrel', name: 'index.ts', fileoverview: 'Barrel docs here.' }),
      ]),
    );
    expect(out).toContain('n0(["index.ts"])');
    expect(nodeLine(out, 'n0')).not.toContain('Barrel docs here');
  });

  it('adds a layer badge to a node carrying a layer', () => {
    const out = renderDiagram(withDiagram([node({ id: 'n0', name: 'a.ts', layer: 'domain' })]));
    expect(out).toContain('domain');
  });

  it('adds a cluster badge to a node carrying a cluster', () => {
    const out = renderDiagram(withDiagram([node({ id: 'n0', name: 'a.ts', cluster: 'core' })]));
    expect(out).toContain('core');
  });

  it('emits classDef statements for the node roles present', () => {
    const out = renderDiagram(withDiagram([node({ id: 'n0', role: 'entity-file' })]));
    expect(out).toMatch(/classDef \S+/);
    expect(out).toMatch(/class n0 \S+/);
  });

  it('tags a high-instability node with the unstable band class', () => {
    const s = section({
      diagram: {
        nodes: [node({ id: 'n0', path: 'src/graph/build.ts', name: 'build.ts' })],
        edges: [],
        clusters: [],
        coupling: new Map([['n0', { ca: 1, ce: 3, instability: 0.75 }]]),
      },
    });
    const out = renderDiagram(s);
    expect(out).toContain('classDef unstable ');
    expect(out).toContain('class n0 unstable;');
  });

  it('tags a low-instability node with the stable band class', () => {
    const s = section({
      diagram: {
        nodes: [node({ id: 'n0', path: 'src/graph/build.ts', name: 'build.ts' })],
        edges: [],
        clusters: [],
        coupling: new Map([['n0', { ca: 3, ce: 1, instability: 0.25 }]]),
      },
    });
    const out = renderDiagram(s);
    expect(out).toContain('classDef stable ');
    expect(out).toContain('class n0 stable;');
  });

  it('appends Ca / Ce / I figures to a subsystem node label', () => {
    const s = section({
      diagram: {
        nodes: [node({ id: 'n0', path: 'src/graph/build.ts', name: 'build.ts' })],
        edges: [],
        clusters: [],
        coupling: new Map([['n0', { ca: 3, ce: 7, instability: 0.7 }]]),
      },
    });
    expect(nodeLine(renderDiagram(s), 'n0')).toContain('Ca 3 · Ce 7 · I 0.70');
  });

  it('renders a node outside any cluster at top level', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' }), node({ id: 'n1', path: 'src/b.ts', name: 'b.ts' })],
        [],
        [{ title: 'one', nodeIds: ['n0'], children: [], note: null }],
      ),
    );
    // n1 is not in the cluster — it must still appear exactly once.
    expect(out.match(/^\s*n1\[/gm)?.length).toBe(1);
  });

  it('emits each clustered node exactly once', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' })],
        [],
        [{ title: 'one', nodeIds: ['n0'], children: [], note: null }],
      ),
    );
    expect(out.match(/^\s*n0\[/gm)?.length).toBe(1);
  });

  it('skips a cluster nodeId that names no known node', () => {
    const out = renderDiagram(
      withDiagram(
        [node({ id: 'n0' })],
        [],
        [{ title: 'one', nodeIds: ['n0', 'ghost'], children: [], note: null }],
      ),
    );
    expect(out).toContain('subgraph one');
    expect(out).not.toContain('ghost[');
  });
});
