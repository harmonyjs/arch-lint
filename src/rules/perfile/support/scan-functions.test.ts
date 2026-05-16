/**
 * @fileoverview Tests for the shared per-function scan helper of function-level perfile rules.
 */
import { describe, it, expect } from 'vitest';
import { scanFunctions, functionLocation } from './scan-functions.js';
import { makeGraph } from '../../test-support/make-graph.js';
import type { FunctionUnit } from './functions.js';

describe('scanFunctions', () => {
  it('visits every function of every file node with its file id', () => {
    const graph = makeGraph({
      nodes: { 'src/a.ts': { kind: 'file' }, 'src/b.ts': { kind: 'file' } },
      files: { 'src/a.ts': 'function f() {}\n', 'src/b.ts': 'const g = () => {};\n' },
    });
    const seen: string[] = [];
    scanFunctions(graph, graph.project, (fileId: string, unit: FunctionUnit) => {
      seen.push(`${fileId}#${unit.qualifiedPath}`);
    });
    expect(seen.sort()).toEqual(['src/a.ts#f', 'src/b.ts#g']);
  });

  it('skips a file node absent from the project', () => {
    const graph = makeGraph({ nodes: { 'src/ghost.ts': { kind: 'file' } }, files: {} });
    let count = 0;
    scanFunctions(graph, graph.project, () => {
      count += 1;
    });
    expect(count).toBe(0);
  });
});

describe('functionLocation', () => {
  it('reports the 1-based start line and column of a function', () => {
    const graph = makeGraph({
      nodes: { 'src/a.ts': { kind: 'file' } },
      files: { 'src/a.ts': '\n  function f() {}\n' },
    });
    let loc = { file: '', line: 0, column: 0 };
    scanFunctions(graph, graph.project, (fileId, unit) => {
      loc = functionLocation(fileId, unit);
    });
    expect(loc).toEqual({ file: 'src/a.ts', line: 2, column: 3 });
  });
});
