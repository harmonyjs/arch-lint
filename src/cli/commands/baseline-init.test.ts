/**
 * @fileoverview Tests for the `baseline init` command — it runs a baseline-free
 * check and writes a fresh snapshot of every violation.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BaselineFile } from '../../baseline/types.js';
import type { ResolvedConfig } from '../../config/types.js';
import type { CheckResult } from '../../rules/types.js';
import type { Diagnostic } from '../../types.js';

const loadConfigMock = vi.fn();
vi.mock('../../config/load.js', () => ({
  loadConfig: (...args: unknown[]): unknown => loadConfigMock(...args),
}));

const resolveConfigMock = vi.fn();
vi.mock('../../config/resolve-defaults.js', () => ({
  resolveConfig: (...args: unknown[]): unknown => resolveConfigMock(...args),
}));

const runCheckMock = vi.fn();
const resolveBaselineMock = vi.fn();
vi.mock('../../runner/index.js', () => ({
  runCheck: (...args: unknown[]): unknown => runCheckMock(...args),
  resolveBaseline: (...args: unknown[]): unknown => resolveBaselineMock(...args),
}));

const snapshotBaselineMock = vi.fn();
const writeBaselineMock = vi.fn();
vi.mock('../../baseline/index.js', () => ({
  snapshotBaseline: (...args: unknown[]): unknown => snapshotBaselineMock(...args),
  diffBaseline: vi.fn(),
  pruneBaseline: vi.fn(),
  writeBaseline: (...args: unknown[]): unknown => writeBaselineMock(...args),
}));

const { runBaselineInit } = await import('./baseline.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function resolvedConfig(over: Partial<ResolvedConfig> = {}): ResolvedConfig {
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
    ...over,
  } as ResolvedConfig;
}

function diagnostic(over: Partial<Diagnostic> = {}): Diagnostic {
  return {
    ruleId: 'layer-boundary',
    severity: 'error',
    entity: 'src/a.ts',
    message: 'm',
    actual: 'a',
    reason: 'r',
    suggestions: [],
    location: { file: 'src/a.ts', line: 1, column: 1 },
    ...over,
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

afterEach(() => {
  vi.clearAllMocks();
});

describe('runBaselineInit', () => {
  it('writes the snapshot and returns exit code 0', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(resolvedConfig());
    const diagnostics = [diagnostic({ entity: 'src/a.ts' }), diagnostic({ entity: 'src/b.ts' })];
    runCheckMock.mockResolvedValue({ result: checkResult(diagnostics) });
    const snapshot: BaselineFile = {
      schemaVersion: 1,
      generatedAt: '2026-05-17T00:00:00.000Z',
      generatorVersion: '1.0.0',
      records: [
        { ruleId: 'layer-boundary', entity: 'src/a.ts' },
        { ruleId: 'layer-boundary', entity: 'src/b.ts' },
      ],
    };
    snapshotBaselineMock.mockReturnValue(snapshot);

    const outcome = await runBaselineInit({ cwd: '/repo' });

    expect(outcome.exitCode).toBe(0);
    expect(runCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: '/repo', mode: 'ci', noBaseline: true, changedOnly: false }),
    );
    expect(snapshotBaselineMock).toHaveBeenCalledWith(diagnostics, expect.any(String));
    expect(writeBaselineMock).toHaveBeenCalledTimes(1);
    expect(writeBaselineMock).toHaveBeenCalledWith('/repo/.arch-lint-baseline.json', snapshot);
    expect(outcome.stdout).toBe('Baseline written: 2 record(s) → /repo/.arch-lint-baseline.json');
  });

  it('keeps an absolute baseline path as-is', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(
      resolvedConfig({
        baseline: {
          file: '/abs/baseline.json',
          sortRecords: 'alphabetical',
          missingBehavior: 'ignore',
        },
      }),
    );
    runCheckMock.mockResolvedValue({ result: checkResult([]) });
    snapshotBaselineMock.mockReturnValue({
      schemaVersion: 1,
      generatedAt: 'now',
      generatorVersion: '1.0.0',
      records: [],
    });

    const outcome = await runBaselineInit({ cwd: '/repo' });

    expect(writeBaselineMock).toHaveBeenCalledWith('/abs/baseline.json', expect.anything());
    expect(outcome.stdout).toBe('Baseline written: 0 record(s) → /abs/baseline.json');
  });
});
