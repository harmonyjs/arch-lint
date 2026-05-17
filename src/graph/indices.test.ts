/**
 * @fileoverview Tests for forward/reverse edge indices consumersOf and producersOf.
 */
import { describe, expect, it } from 'vitest';
import { buildIndices } from './indices.js';
import type { Edge } from './types.js';

const edges: Edge[] = [
  { consumer: 'src/B.ts', producer: 'src/A.ts', symbol: 'a', typeOnly: false },
  { consumer: 'src/C.ts', producer: 'src/A.ts', symbol: 'a', typeOnly: false },
  { consumer: 'src/B.ts', producer: 'src/D.ts', symbol: 'd', typeOnly: false },
];

describe('buildIndices', () => {
  it('groups edges by producer for consumersOf', () => {
    const { consumersOf } = buildIndices(edges);
    expect(consumersOf.get('src/A.ts')?.map((e) => e.consumer)).toEqual(['src/B.ts', 'src/C.ts']);
    expect(consumersOf.get('src/D.ts')?.map((e) => e.consumer)).toEqual(['src/B.ts']);
  });

  it('groups edges by consumer for producersOf', () => {
    const { producersOf } = buildIndices(edges);
    expect(producersOf.get('src/B.ts')?.map((e) => e.producer)).toEqual(['src/A.ts', 'src/D.ts']);
    expect(producersOf.get('src/C.ts')?.map((e) => e.producer)).toEqual(['src/A.ts']);
  });

  it('returns empty maps for an empty edge list', () => {
    const { consumersOf, producersOf } = buildIndices([]);
    expect(consumersOf.size).toBe(0);
    expect(producersOf.size).toBe(0);
  });

  it('sorts a producer bucket by symbol when consumer and producer match', () => {
    const sameLink: Edge[] = [
      { consumer: 'src/X.ts', producer: 'src/Y.ts', symbol: 'beta', typeOnly: false },
      { consumer: 'src/X.ts', producer: 'src/Y.ts', symbol: 'alpha', typeOnly: false },
    ];
    const { consumersOf } = buildIndices(sameLink);
    expect(consumersOf.get('src/Y.ts')?.map((e) => e.symbol)).toEqual(['alpha', 'beta']);
  });
});
