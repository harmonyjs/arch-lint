/**
 * @fileoverview Tests for snapshotBaseline — the `baseline init` operation.
 */
import { describe, expect, it } from 'vitest';
import type { Diagnostic, Location } from '../types.js';
import { snapshotBaseline } from './snapshot.js';

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

describe('snapshotBaseline', () => {
  it('produces a schema-v1 file with the given generatorVersion and timestamp', () => {
    const file = snapshotBaseline([diag({})], '1.0.0', AT);
    expect(file.schemaVersion).toBe(1);
    expect(file.generatorVersion).toBe('1.0.0');
    expect(file.generatedAt).toBe(AT);
  });

  it('records every diagnostic with ruleId, entity and firstSeenAt', () => {
    const file = snapshotBaseline([diag({})], '1.0.0', AT);
    expect(file.records).toEqual([
      { ruleId: 'lca-placement', entity: 'src/Widget', firstSeenAt: AT },
    ]);
  });

  it('preserves the fingerprint of a fingerprinted diagnostic', () => {
    const file = snapshotBaseline([diag({ fingerprint: 'src/a.ts#src/b.ts' })], '1.0.0', AT);
    expect(file.records[0]?.fingerprint).toBe('src/a.ts#src/b.ts');
  });

  it('collapses duplicate (ruleId, entity, fingerprint) diagnostics into one record', () => {
    const file = snapshotBaseline([diag({}), diag({})], '1.0.0', AT);
    expect(file.records).toHaveLength(1);
  });

  it('keeps distinct fingerprints of the same (ruleId, entity) as separate records', () => {
    const file = snapshotBaseline(
      [diag({ fingerprint: 'a' }), diag({ fingerprint: 'b' })],
      '1.0.0',
      AT,
    );
    expect(file.records).toHaveLength(2);
  });

  it('sorts records alphabetically by (ruleId, entity, fingerprint)', () => {
    const file = snapshotBaseline(
      [diag({ entity: 'src/B' }), diag({ entity: 'src/A' })],
      '1.0.0',
      AT,
    );
    expect(file.records.map((r) => r.entity)).toEqual(['src/A', 'src/B']);
  });

  it('is idempotent — re-snapshotting the same diagnostics yields identical records', () => {
    const diags = [diag({ entity: 'src/B' }), diag({ entity: 'src/A' }), diag({ entity: 'src/B' })];
    const first = snapshotBaseline(diags, '1.0.0', AT);
    const second = snapshotBaseline(diags, '1.0.0', AT);
    expect(second.records).toEqual(first.records);
  });
});
