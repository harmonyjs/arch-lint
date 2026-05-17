/**
 * @fileoverview Tests for node-id source-file lookup over a RuleContext project (D9).
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { makeGraph } from '../test-support/make-graph.js';
import { fileNodeIds, sourceFileFor } from './find-source-file.js';

describe('sourceFileFor', () => {
  it('finds a file by its exact node id', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('src/App/App.tsx', 'export const App = 1;');
    expect(sourceFileFor(project, 'src/App/App.tsx')?.getBaseName()).toBe('App.tsx');
  });

  it('finds a file by node id when the project keys it by an absolute path', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('/repo/src/App/App.tsx', 'export const App = 1;');
    expect(sourceFileFor(project, 'src/App/App.tsx')?.getBaseName()).toBe('App.tsx');
  });

  it('returns undefined for a node id absent from the project', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    expect(sourceFileFor(project, 'src/missing.ts')).toBeUndefined();
  });
});

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
