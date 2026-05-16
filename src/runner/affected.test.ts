/**
 * @fileoverview Tests for the changed-only reporting filter.
 */
import { describe, expect, it } from 'vitest';
import type { ConsumerGraph, Diagnostic, Edge } from '../types.js';
import { affectedEntities, filterToAffected } from './changed-files.js';

function edge(consumer: string, producer: string): Edge {
  return { consumer, producer, symbol: 'X', typeOnly: false };
}

const appImportsUtil = edge('src/App/App.tsx', 'src/lib/util.ts');
const apiImportsApp = edge('src/api/api.ts', 'src/App/App.tsx');

const graph = {
  edges: [appImportsUtil, apiImportsApp],
  consumersOf: new Map([
    ['src/lib/util.ts', [appImportsUtil]],
    ['src/App/App.tsx', [apiImportsApp]],
  ]),
  producersOf: new Map([
    ['src/App/App.tsx', [appImportsUtil]],
    ['src/api/api.ts', [apiImportsApp]],
  ]),
} as unknown as ConsumerGraph;

function diag(entity: string): Diagnostic {
  return {
    ruleId: 'r',
    severity: 'warning',
    entity,
    message: 'm',
    actual: entity,
    reason: 'x',
    suggestions: [],
    location: { file: entity, line: 1, column: 1 },
  };
}

describe('affectedEntities', () => {
  it('includes changed files, their producers and their consumers', () => {
    const set = affectedEntities(['src/App/App.tsx'], graph);
    expect(set).toContain('src/App/App.tsx');
    expect(set).toContain('src/lib/util.ts');
    expect(set).toContain('src/api/api.ts');
  });

  it('returns an empty set when no files changed', () => {
    expect(affectedEntities([], graph).size).toBe(0);
  });
});

describe('filterToAffected', () => {
  it('keeps only diagnostics whose entity is in the affected set', () => {
    const diags = [diag('src/App/App.tsx'), diag('src/model/m.ts')];
    const kept = filterToAffected(diags, new Set(['src/App/App.tsx']));
    expect(kept).toHaveLength(1);
    expect(kept[0]!.entity).toBe('src/App/App.tsx');
  });

  it('returns all diagnostics unchanged when the filter is null', () => {
    const diags = [diag('a'), diag('b')];
    expect(filterToAffected(diags, null)).toEqual(diags);
  });
});
