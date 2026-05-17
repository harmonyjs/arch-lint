/**
 * @fileoverview Tests for resolveBaseline() — resolves and loads the baseline
 * file, honouring noBaseline and the missingBehavior setting.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BaselineFile } from '../baseline/types.js';
import type { ResolvedConfig } from '../config/types.js';
import { ConfigError } from '../errors/index.js';
import { resolveBaseline } from './check.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arch-lint-baseline-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A ResolvedConfig stub carrying just the project + baseline fields used here. */
function cfg(over: Partial<ResolvedConfig['baseline']> = {}): ResolvedConfig {
  return {
    project: { cwd: dir },
    baseline: {
      file: '.arch-lint-baseline.json',
      sortRecords: 'alphabetical',
      missingBehavior: 'error',
      ...over,
    },
  } as ResolvedConfig;
}

const validBaseline: BaselineFile = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  generatorVersion: '1.0.0',
  records: [{ ruleId: 'layer-boundary', entity: 'src/a.ts' }],
};

describe('resolveBaseline', () => {
  it('returns null when noBaseline is set, without touching disk', async () => {
    const result = await resolveBaseline(cfg({ missingBehavior: 'error' }), { noBaseline: true });
    expect(result).toBeNull();
  });

  it('loads and parses an existing valid baseline file', async () => {
    writeFileSync(join(dir, '.arch-lint-baseline.json'), JSON.stringify(validBaseline));
    const result = await resolveBaseline(cfg(), { noBaseline: false });
    expect(result).toEqual(validBaseline);
  });

  it('throws ConfigError for a missing file when missingBehavior is error', async () => {
    await expect(
      resolveBaseline(cfg({ missingBehavior: 'error' }), { noBaseline: false }),
    ).rejects.toBeInstanceOf(ConfigError);
  });

  it('returns null for a missing file when missingBehavior is ignore', async () => {
    const result = await resolveBaseline(cfg({ missingBehavior: 'ignore' }), { noBaseline: false });
    expect(result).toBeNull();
  });

  it('throws ConfigError for a present-but-malformed JSON file', async () => {
    writeFileSync(join(dir, '.arch-lint-baseline.json'), '{ not valid json');
    await expect(resolveBaseline(cfg(), { noBaseline: false })).rejects.toBeInstanceOf(ConfigError);
  });

  it('throws ConfigError for a JSON file that fails baseline validation', async () => {
    writeFileSync(join(dir, '.arch-lint-baseline.json'), JSON.stringify({ schemaVersion: 2 }));
    await expect(resolveBaseline(cfg(), { noBaseline: false })).rejects.toBeInstanceOf(ConfigError);
  });

  it('resolves an absolute baseline path as-is', async () => {
    const abs = join(dir, 'custom-baseline.json');
    writeFileSync(abs, JSON.stringify(validBaseline));
    const result = await resolveBaseline(cfg({ file: abs }), { noBaseline: false });
    expect(result).toEqual(validBaseline);
  });
});
