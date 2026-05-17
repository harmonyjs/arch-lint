/**
 * @fileoverview Tests for baseline file schema, parsing, serialization and file io.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadBaseline,
  parseBaselineFile,
  serializeBaseline,
  sortRecords,
  writeBaseline,
} from './serialize.js';
import type { BaselineFile, BaselineRecord } from './types.js';

const SAMPLE: BaselineFile = {
  schemaVersion: 1,
  generatedAt: '2026-05-16T00:00:00.000Z',
  generatorVersion: '1.0.0',
  records: [{ ruleId: 'lca-placement', entity: 'src/Widget' }],
};

describe('sortRecords', () => {
  it('sorts records alphabetically by ruleId, then entity, then fingerprint', () => {
    const input: BaselineRecord[] = [
      { ruleId: 'lca-placement', entity: 'src/B' },
      { ruleId: 'lca-placement', entity: 'src/A' },
      { ruleId: 'layer-boundary', entity: 'src/Z' },
      { ruleId: 'lca-placement', entity: 'src/A', fingerprint: 'b' },
      { ruleId: 'lca-placement', entity: 'src/A', fingerprint: 'a' },
    ];
    const sorted = sortRecords(input);
    expect(sorted).toEqual([
      { ruleId: 'layer-boundary', entity: 'src/Z' },
      { ruleId: 'lca-placement', entity: 'src/A' },
      { ruleId: 'lca-placement', entity: 'src/A', fingerprint: 'a' },
      { ruleId: 'lca-placement', entity: 'src/A', fingerprint: 'b' },
      { ruleId: 'lca-placement', entity: 'src/B' },
    ]);
  });

  it('treats a missing fingerprint as sorting before any present one', () => {
    const sorted = sortRecords([
      { ruleId: 'r', entity: 'e', fingerprint: 'x' },
      { ruleId: 'r', entity: 'e' },
    ]);
    expect(sorted[0]?.fingerprint).toBeUndefined();
  });
});

describe('serializeBaseline', () => {
  it('produces pretty JSON with sorted records and a trailing newline', () => {
    const text = serializeBaseline({
      ...SAMPLE,
      records: [
        { ruleId: 'lca-placement', entity: 'src/B' },
        { ruleId: 'lca-placement', entity: 'src/A' },
      ],
    });
    expect(text.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(text) as BaselineFile;
    expect(parsed.records.map((r) => r.entity)).toEqual(['src/A', 'src/B']);
  });
});

describe('parseBaselineFile', () => {
  it('round-trips a valid baseline file', () => {
    const text = serializeBaseline(SAMPLE);
    expect(parseBaselineFile(text)).toEqual(SAMPLE);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseBaselineFile('{ not json')).toThrow();
  });

  it('throws when schemaVersion is not 1', () => {
    const bad = JSON.stringify({ ...SAMPLE, schemaVersion: 2 });
    expect(() => parseBaselineFile(bad)).toThrow();
  });

  it('throws when records is missing', () => {
    const bad = JSON.stringify({ schemaVersion: 1, generatedAt: 'x', generatorVersion: '1.0.0' });
    expect(() => parseBaselineFile(bad)).toThrow();
  });
});

describe('loadBaseline / writeBaseline', () => {
  it('writes a baseline file that loadBaseline reads back identically', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'arch-lint-baseline-'));
    try {
      const path = join(dir, 'baseline.json');
      await writeBaseline(path, SAMPLE);
      expect(await loadBaseline(path)).toEqual(SAMPLE);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('loadBaseline rejects when the file content is invalid', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'arch-lint-baseline-'));
    try {
      const path = join(dir, 'baseline.json');
      await writeFile(path, '{ broken', 'utf8');
      await expect(loadBaseline(path)).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('loadBaseline rejects when the file does not exist', async () => {
    await expect(
      loadBaseline(join(tmpdir(), 'arch-lint-no-such-baseline-xyz.json')),
    ).rejects.toThrow();
  });
});
