/**
 * @fileoverview Tests for file-kind node enumeration over a ConsumerGraph.
 */

import { describe, expect, it } from 'vitest';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { fileNodeIds } from './find-source-file.js';

describe('fileNodeIds', () => {
  it('lists only file-kind node ids, skipping folders', () => {
    const graph = makeGraph({
      nodes: {
        'src/App/App.tsx': { kind: 'file' },
        'src/App': { kind: 'folder', isEntity: true },
      },
    });
    expect(fileNodeIds(graph)).toEqual(['src/App/App.tsx']);
  });
});
