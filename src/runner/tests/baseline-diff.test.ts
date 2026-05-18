/**
 * @fileoverview Tests for the `baseline diff` command — it classifies the
 * current run against the stored baseline and reports new and resolved records
 * without writing anything.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BaselineDiff } from '#baseline/index.js';
import type { BaselineFile } from '#baseline/types.js';
import type { ResolvedConfig } from '#config/types.js';
import type { CheckResult } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

const loadConfigMock = vi.fn();
vi.mock('#config/load.js', () => ({
  loadConfig: (...args: unknown[]): unknown => loadConfigMock(...args),
}));

const resolveConfigMock = vi.fn();
vi.mock('#config/resolve-defaults.js', () => ({
  resolveConfig: (...args: unknown[]): unknown => resolveConfigMock(...args),
}));

const runCheckMock = vi.fn();
const resolveBaselineMock = vi.fn();
vi.mock('#runner/check.js', () => ({
  runCheck: (...args: unknown[]): unknown => runCheckMock(...args),
  resolveBaseline: (...args: unknown[]): unknown => resolveBaselineMock(...args),
}));

const diffBaselineMock = vi.fn();
const writeBaselineMock = vi.fn();
vi.mock('#baseline/index.js', () => ({
  snapshotBaseline: vi.fn(),
  diffBaseline: (...args: unknown[]): unknown => diffBaselineMock(...args),
  pruneBaseline: vi.fn(),
  writeBaseline: (...args: unknown[]): unknown => writeBaselineMock(...args),
}));

const { runBaselineDiff } = await import('#runner/baseline.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function resolvedConfig(): ResolvedConfig {
  return {
    project: {
      cwd: '/repo',
      tsconfig: './tsconfig.json',
      sourceRoot: 'src',
      includeOutOfRoot: false,
    },
    baseline: {
      file: '.arch-lint-baseline.json',
      sortRecords: 'alphabetical',
      missingBehavior: 'ignore',
    },
  } as ResolvedConfig;
}

function diagnostic(entity: string): Diagnostic {
  return {
    ruleId: 'layer-boundary',
    severity: 'error',
    entity,
    message: 'm',
    actual: 'a',
    reason: 'r',
    suggestions: [],
    location: { file: entity, line: 1, column: 1 },
  };
}

function checkResult(diagnostics: readonly Diagnostic[]): CheckResult {
  return {
    diagnostics,
    summary: {
      total: diagnostics.length,
      bySeverity: { error: 0, warning: 0, info: 0 },
      new: 0,
      inBaseline: 0,
    },
    exitCode: 0,
  };
}

const emptyBaseline: BaselineFile = {
  schemaVersion: 1,
  generatedAt: 'now',
  generatorVersion: '1.0.0',
  records: [],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('runBaselineDiff', () => {
  it('reports the counts of new and resolved records with exit code 0', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(resolvedConfig());
    resolveBaselineMock.mockResolvedValue(emptyBaseline);
    runCheckMock.mockResolvedValue({ result: checkResult([diagnostic('src/a.ts')]) });
    const diff: BaselineDiff = {
      added: [
        { ruleId: 'layer-boundary', entity: 'src/a.ts' },
        { ruleId: 'lca-placement', entity: 'src/b.ts' },
      ],
      resolved: [{ ruleId: 'layer-boundary', entity: 'src/old.ts' }],
    };
    diffBaselineMock.mockReturnValue(diff);

    const outcome = await runBaselineDiff({ cwd: '/repo' });

    expect(outcome.exitCode).toBe(0);
    expect(resolveBaselineMock).toHaveBeenCalledWith(expect.anything(), { noBaseline: false });
    expect(runCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({ noBaseline: false, changedOnly: false }),
    );
    expect(outcome.stdout).toContain('Baseline diff (/repo/.arch-lint-baseline.json):');
    expect(outcome.stdout).toContain('  new:      2');
    expect(outcome.stdout).toContain('  resolved: 1');
    expect(outcome.stdout).toContain('  + layer-boundary  src/a.ts');
    expect(outcome.stdout).toContain('  + lca-placement  src/b.ts');
    expect(outcome.stdout).toContain('  - layer-boundary  src/old.ts');
    expect(writeBaselineMock).not.toHaveBeenCalled();
  });

  it('reports zero counts when the baseline matches the current run', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(resolvedConfig());
    resolveBaselineMock.mockResolvedValue(emptyBaseline);
    runCheckMock.mockResolvedValue({ result: checkResult([]) });
    diffBaselineMock.mockReturnValue({ added: [], resolved: [] });

    const outcome = await runBaselineDiff({ cwd: '/repo' });

    expect(outcome.stdout).toBe(
      'Baseline diff (/repo/.arch-lint-baseline.json):\n  new:      0\n  resolved: 0',
    );
    expect(writeBaselineMock).not.toHaveBeenCalled();
  });
});
