/**
 * @fileoverview Tests for diffBaseline — the read-only `baseline diff` operation.
 */
import { describe, expect, it } from 'vitest';
import type { Diagnostic, Location } from '#types.js';
import { diffBaseline } from './diff.js';
import type { BaselineFile } from './types.js';

const loc: Location = { file: 'src/a.ts', line: 1, column: 1 };

function diag(over: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'lca-placement',
    severity: 'warning',
    entity: 'src/Widget',
    actual: 'src/Widget',
    message: 'm',
    reason: 'r',
    suggestions: [],
    location: loc,
    ...over,
  };
}

function baseline(records: BaselineFile['records']): BaselineFile {
  return { schemaVersion: 1, generatedAt: 'x', generatorVersion: '1.0.0', records };
}

describe('diffBaseline', () => {
  it('reports an empty diff when diagnostics exactly match the baseline', () => {
    const result = diffBaseline(baseline([{ ruleId: 'lca-placement', entity: 'src/Widget' }]), [
      diag({}),
    ]);
    expect(result).toEqual({ added: [], resolved: [] });
  });

  it('reports a diagnostic absent from the baseline as added', () => {
    const result = diffBaseline(baseline([]), [diag({})]);
    expect(result.added).toEqual([{ ruleId: 'lca-placement', entity: 'src/Widget' }]);
    expect(result.resolved).toEqual([]);
  });

  it('reports a baseline record with no diagnostic as resolved', () => {
    const result = diffBaseline(baseline([{ ruleId: 'lca-placement', entity: 'src/Gone' }]), [
      diag({ entity: 'src/Widget' }),
    ]);
    expect(result.added).toEqual([{ ruleId: 'lca-placement', entity: 'src/Widget' }]);
    expect(result.resolved).toEqual([{ ruleId: 'lca-placement', entity: 'src/Gone' }]);
  });

  it('preserves the fingerprint of an added diagnostic', () => {
    const result = diffBaseline(baseline([]), [diag({ fingerprint: 'src/a.ts#src/b.ts' })]);
    expect(result.added[0]?.fingerprint).toBe('src/a.ts#src/b.ts');
  });

  it('treats a null baseline as all-added with nothing resolved', () => {
    const result = diffBaseline(null, [diag({ entity: 'src/A' }), diag({ entity: 'src/B' })]);
    expect(result.added).toHaveLength(2);
    expect(result.resolved).toEqual([]);
  });

  it('sorts added and resolved records alphabetically', () => {
    const result = diffBaseline(
      baseline([
        { ruleId: 'lca-placement', entity: 'src/GoneB' },
        { ruleId: 'lca-placement', entity: 'src/GoneA' },
      ]),
      [diag({ entity: 'src/NewB' }), diag({ entity: 'src/NewA' })],
    );
    expect(result.added.map((r) => r.entity)).toEqual(['src/NewA', 'src/NewB']);
    expect(result.resolved.map((r) => r.entity)).toEqual(['src/GoneA', 'src/GoneB']);
  });

  it('does not mutate the inputs', () => {
    const records = [{ ruleId: 'lca-placement', entity: 'src/Gone' }];
    const file = baseline(records);
    diffBaseline(file, [diag({})]);
    expect(file.records).toBe(records);
  });
});
