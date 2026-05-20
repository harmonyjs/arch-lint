/**
 * @fileoverview Type-level smoke test for the graphdoc render-model types.
 */
import { describe, expect, it } from 'vitest';
import type { Diagram, DocSection, GraphDoc, RenderEdge, RenderNode } from './types.js';

describe('graphdoc types', () => {
  it('a minimal GraphDoc value satisfies the types', () => {
    const node: RenderNode = {
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
    };
    const edge: RenderEdge = {
      fromId: 'n0',
      toId: 'n0',
      typeOnly: false,
      back: false,
      weight: null,
    };
    const diagram: Diagram = { nodes: [node], edges: [edge], clusters: [], coupling: new Map() };
    const section: DocSection = { title: 'Overview', slug: 'overview', note: null, diagram };
    const doc: GraphDoc = { sections: [section], findings: [] };
    expect(doc.sections[0]?.title).toBe('Overview');
  });
});
