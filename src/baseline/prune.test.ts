/**
 * @fileoverview Tests for pruneBaseline — the `baseline prune` operation.
 */
import { describe, expect, it } from 'vitest';
import type { BaselineFile, Diagnostic, Location } from '../types.js';
import { pruneBaseline } from './prune.js';

const loc: Location = { file: 'src/a.ts', line: 1, column: 1 };
const AT = '2026-05-16T00:00:00.000Z';

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
  return { schemaVersion: 1, generatedAt: 'old', generatorVersion: '0.9.0', records };
}

describe('pruneBaseline', () => {
  it('keeps a record that still has a matching diagnostic', () => {
    const result = pruneBaseline(
      baseline([{ ruleId: 'lca-placement', entity: 'src/Widget' }]),
      [diag({})],
      '1.0.0',
      AT,
    );
    expect(result.records).toHaveLength(1);
  });

  it('removes a record with no matching diagnostic (resolved)', () => {
    const result = pruneBaseline(
      baseline([{ ruleId: 'lca-placement', entity: 'src/Gone' }]),
      [diag({ entity: 'src/Widget' })],
      '1.0.0',
      AT,
    );
    expect(result.records).toEqual([]);
  });

  it('does not add a new diagnostic that is absent from the baseline', () => {
    const result = pruneBaseline(baseline([]), [diag({})], '1.0.0', AT);
    expect(result.records).toEqual([]);
  });

  it('preserves firstSeenAt and note of a kept record', () => {
    const result = pruneBaseline(
      baseline([
        {
          ruleId: 'lca-placement',
          entity: 'src/Widget',
          firstSeenAt: '2025-01-01T00:00:00.000Z',
          note: 'tracked separately',
        },
      ]),
      [diag({})],
      '1.0.0',
      AT,
    );
    expect(result.records[0]).toEqual({
      ruleId: 'lca-placement',
      entity: 'src/Widget',
      firstSeenAt: '2025-01-01T00:00:00.000Z',
      note: 'tracked separately',
    });
  });

  it('matches on fingerprint when present', () => {
    const result = pruneBaseline(
      baseline([
        { ruleId: 'lca-placement', entity: 'src/Widget', fingerprint: 'keep' },
        { ruleId: 'lca-placement', entity: 'src/Widget', fingerprint: 'drop' },
      ]),
      [diag({ fingerprint: 'keep' })],
      '1.0.0',
      AT,
    );
    expect(result.records.map((r) => r.fingerprint)).toEqual(['keep']);
  });

  it('updates generatedAt and generatorVersion, sorts surviving records', () => {
    const result = pruneBaseline(
      baseline([
        { ruleId: 'lca-placement', entity: 'src/B' },
        { ruleId: 'lca-placement', entity: 'src/A' },
      ]),
      [diag({ entity: 'src/B' }), diag({ entity: 'src/A' })],
      '1.0.0',
      AT,
    );
    expect(result.generatedAt).toBe(AT);
    expect(result.generatorVersion).toBe('1.0.0');
    expect(result.records.map((r) => r.entity)).toEqual(['src/A', 'src/B']);
  });

  it('is idempotent — pruning an already-pruned baseline is a no-op on records', () => {
    const diags = [diag({ entity: 'src/A' })];
    const once = pruneBaseline(
      baseline([{ ruleId: 'lca-placement', entity: 'src/A' }]),
      diags,
      '1.0.0',
      AT,
    );
    const twice = pruneBaseline(once, diags, '1.0.0', AT);
    expect(twice.records).toEqual(once.records);
  });
});
