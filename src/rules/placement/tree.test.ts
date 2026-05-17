/**
 * @fileoverview Tests for the entity-tree helpers: componentParentOf, lca.
 */
import { describe, expect, it } from 'vitest';
import { makeGraph } from '../test-support/make-graph.js';
import { componentParentOf, lca } from './tree.js';

const conv = {
  privateSegment: 'slots',
  sharedSegment: 'items',
  libSegment: 'lib',
  hooksSegment: 'hooks',
  explicitClusterSegment: 'ui',
  modelSegment: 'model',
} as const;

describe('componentParentOf', () => {
  it('returns the nearest ancestor entity, skipping role folders', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/items/Card': { kind: 'folder', isEntity: true },
      },
    });
    expect(componentParentOf('src/App/items/Card', g, conv)).toBe('src/App');
  });

  it('returns null when no ancestor entity exists', () => {
    const g = makeGraph({
      nodes: { 'src/App/Card': { kind: 'folder', isEntity: true } },
    });
    expect(componentParentOf('src/App/Card', g, conv)).toBe(null);
  });

  it('skips plain (non-entity, non-role) folders too', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/widgets/Card': { kind: 'folder', isEntity: true },
      },
    });
    expect(componentParentOf('src/App/widgets/Card', g, conv)).toBe('src/App');
  });
});

describe('lca', () => {
  it('finds the nearest common ancestor entity of two entities', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Header/Title': { kind: 'folder', isEntity: true },
        'src/App/Footer': { kind: 'folder', isEntity: true },
      },
    });
    expect(lca(['src/App/Header/Title', 'src/App/Footer'], g, conv)).toBe('src/App');
  });

  it('returns the common entity even when one is an ancestor of the other', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
        'src/App/Header/Title': { kind: 'folder', isEntity: true },
      },
    });
    expect(lca(['src/App/Header', 'src/App/Header/Title'], g, conv)).toBe('src/App/Header');
  });

  it('returns null when entities share no ancestor entity', () => {
    const g = makeGraph({
      nodes: {
        'src/A': { kind: 'folder', isEntity: true },
        'src/B': { kind: 'folder', isEntity: true },
      },
    });
    expect(lca(['src/A', 'src/B'], g, conv)).toBe(null);
  });

  it('returns null for an empty entity list', () => {
    expect(lca([], makeGraph({}), conv)).toBe(null);
  });

  it('falls back to componentParentOf for a single entity', () => {
    const g = makeGraph({
      nodes: {
        'src/App': { kind: 'folder', isEntity: true },
        'src/App/Header': { kind: 'folder', isEntity: true },
      },
    });
    expect(lca(['src/App/Header'], g, conv)).toBe('src/App');
  });
});
