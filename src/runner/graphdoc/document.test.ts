/**
 * @fileoverview Golden tests for the full Markdown document assembly.
 */
import { describe, expect, it } from 'vitest';
import { renderDocument } from './document.js';
import type { GraphDoc, RenderNode } from './types.js';

function groupNode(): RenderNode {
  return {
    id: 'n0',
    path: 'src/graph',
    name: 'graph',
    kind: 'group',
    role: 'plain-file',
    layer: null,
    placement: 'reactive',
    cluster: null,
    fileoverview: null,
    inCycle: false,
    linkSlug: 'graph',
  };
}

function doc(): GraphDoc {
  return {
    sections: [
      {
        title: 'Overview',
        slug: 'overview',
        note: null,
        diagram: {
          nodes: [groupNode()],
          edges: [],
          clusters: [],
          coupling: new Map(),
        },
      },
    ],
  };
}

describe('renderDocument', () => {
  it('starts with the document title', () => {
    expect(renderDocument(doc()).startsWith('# Project dependency graph')).toBe(true);
  });

  it('includes a Legend section', () => {
    expect(renderDocument(doc())).toContain('## Legend');
  });

  it('wraps each section diagram in a mermaid fence', () => {
    expect(renderDocument(doc())).toContain('```mermaid');
  });

  it('emits a heading for each section', () => {
    expect(renderDocument(doc())).toContain('## Overview');
  });

  it('renders a section note as a blockquote', () => {
    const withNote: GraphDoc = {
      sections: [
        {
          title: 'rules',
          slug: 'rules',
          note: 'Lint rule implementations.',
          diagram: { nodes: [], edges: [], clusters: [], coupling: new Map() },
        },
      ],
    };
    expect(renderDocument(withNote)).toContain('> Lint rule implementations.');
  });

  it('omits the blockquote when a section has no note', () => {
    expect(renderDocument(doc())).not.toContain('> ');
  });

  it('emits a Markdown link line for a group node', () => {
    expect(renderDocument(doc())).toContain('- [graph](#graph)');
  });

  it('does not emit a link line for a file node', () => {
    const fileDoc: GraphDoc = {
      sections: [
        {
          title: 'Overview',
          slug: 'overview',
          note: null,
          diagram: {
            nodes: [{ ...groupNode(), kind: 'file', linkSlug: null }],
            edges: [],
            clusters: [],
            coupling: new Map(),
          },
        },
      ],
    };
    expect(fileDoc.sections[0]?.diagram.nodes[0]?.kind).toBe('file');
    expect(renderDocument(fileDoc)).not.toContain('- [graph]');
  });

  it('does not emit a link line for a group node missing a linkSlug', () => {
    const noSlug: GraphDoc = {
      sections: [
        {
          title: 'Overview',
          slug: 'overview',
          note: null,
          diagram: {
            nodes: [{ ...groupNode(), linkSlug: null }],
            edges: [],
            clusters: [],
            coupling: new Map(),
          },
        },
      ],
    };
    expect(renderDocument(noSlug)).not.toContain('- [graph]');
  });

  it('emits an HTML anchor for each section slug', () => {
    expect(renderDocument(doc())).toContain('<a id="overview"></a>');
  });

  it('places the HTML anchor before the section heading', () => {
    const out = renderDocument(doc());
    expect(out.indexOf('<a id="overview"></a>')).toBeLessThan(out.indexOf('## Overview'));
  });

  it('lists every node role in the Legend table', () => {
    const out = renderDocument(doc());
    for (const role of [
      'entity-file',
      'component-folder',
      'barrel',
      'role-folder',
      'plain-file',
      'unresolved',
    ]) {
      expect(out).toContain(role);
    }
  });

  it('describes every edge style in the Legend table', () => {
    const out = renderDocument(doc());
    expect(out.toLowerCase()).toContain('runtime');
    expect(out.toLowerCase()).toContain('type-only');
    expect(out.toLowerCase()).toContain('cycle');
  });

  it('emits a heading per section in a multi-section document', () => {
    const multi: GraphDoc = {
      sections: [
        {
          title: 'Overview',
          slug: 'overview',
          note: null,
          diagram: { nodes: [], edges: [], clusters: [], coupling: new Map() },
        },
        {
          title: 'rules',
          slug: 'rules',
          note: null,
          diagram: { nodes: [], edges: [], clusters: [], coupling: new Map() },
        },
        {
          title: 'rules / perfile',
          slug: 'rules-perfile',
          note: null,
          diagram: { nodes: [], edges: [], clusters: [], coupling: new Map() },
        },
      ],
    };
    const out = renderDocument(multi);
    expect(out).toContain('## Overview');
    expect(out).toContain('## rules');
    expect(out).toContain('## rules / perfile');
    expect(out).toContain('<a id="rules-perfile"></a>');
  });

  it('embeds the rendered diagram inside the mermaid fence', () => {
    const out = renderDocument(doc());
    const start = out.indexOf('```mermaid');
    const end = out.indexOf('```', start + '```mermaid'.length);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(out.slice(start, end)).toContain('flowchart LR');
  });

  it('renders the document as a single string', () => {
    expect(typeof renderDocument(doc())).toBe('string');
  });
});
