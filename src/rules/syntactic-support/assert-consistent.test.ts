/**
 * @fileoverview Tests for the dev-mode graph/project consistency assertion.
 */
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { makeGraph } from '../test-support/make-graph.js';
import { assertGraphProjectConsistent } from './assert-consistent.js';

function projectWith(...ids: string[]): Project {
  const project = new Project({ useInMemoryFileSystem: true });
  for (const id of ids) project.createSourceFile(id, '');
  return project;
}

describe('assertGraphProjectConsistent', () => {
  it('passes when graph file nodes and project files match exactly', () => {
    const graph = makeGraph({ nodes: { 'src/a.ts': { kind: 'file' } } });
    const project = projectWith('src/a.ts');
    expect(() => assertGraphProjectConsistent(graph, project)).not.toThrow();
  });
  it('throws when a graph file node has no SourceFile', () => {
    const graph = makeGraph({ nodes: { 'src/missing.ts': { kind: 'file' } } });
    const project = projectWith();
    expect(() => assertGraphProjectConsistent(graph, project)).toThrow(/src\/missing\.ts/);
  });
  it('throws when a SourceFile has no graph file node', () => {
    const graph = makeGraph({ nodes: {} });
    const project = projectWith('src/orphan.ts');
    expect(() => assertGraphProjectConsistent(graph, project)).toThrow(/src\/orphan\.ts/);
  });
});
