/**
 * @fileoverview Tests for the `baseline prune` command — it drops baseline
 * records that no longer reproduce, gated by an injected confirmation prompt.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError } from '../../errors.js';
import type { ResolvedConfig } from '../../config/types.js';
import type { BaselineFile, CheckResult, Diagnostic } from '../../types.js';

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

const pruneBaselineMock = vi.fn();
const writeBaselineMock = vi.fn();
vi.mock('../../baseline/index.js', () => ({
  snapshotBaseline: vi.fn(),
  diffBaseline: vi.fn(),
  pruneBaseline: (...args: unknown[]): unknown => pruneBaselineMock(...args),
  writeBaseline: (...args: unknown[]): unknown => writeBaselineMock(...args),
}));

const { runBaselinePrune } = await import('./baseline.js');

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

function baselineFile(recordCount: number): BaselineFile {
  return {
    schemaVersion: 1,
    generatedAt: 'now',
    generatorVersion: '1.0.0',
    records: Array.from({ length: recordCount }, (_, i) => ({
      ruleId: 'layer-boundary',
      entity: `src/r${i}.ts`,
    })),
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('runBaselinePrune', () => {
  it('throws a ConfigError when no baseline file exists', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(resolvedConfig());
    resolveBaselineMock.mockResolvedValue(null);

    await expect(
      runBaselinePrune({ cwd: '/repo', yes: true, confirm: async () => true }),
    ).rejects.toBeInstanceOf(ConfigError);
    expect(runCheckMock).not.toHaveBeenCalled();
    expect(writeBaselineMock).not.toHaveBeenCalled();
  });

  it('with --yes skips the prompt and writes the pruned baseline', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(resolvedConfig());
    resolveBaselineMock.mockResolvedValue(baselineFile(3));
    runCheckMock.mockResolvedValue({ result: checkResult([]) });
    const pruned = baselineFile(1);
    pruneBaselineMock.mockReturnValue(pruned);
    const confirm = vi.fn(async () => true);

    const outcome = await runBaselinePrune({ cwd: '/repo', yes: true, confirm });

    expect(confirm).not.toHaveBeenCalled();
    expect(writeBaselineMock).toHaveBeenCalledTimes(1);
    expect(writeBaselineMock).toHaveBeenCalledWith('/repo/.arch-lint-baseline.json', pruned);
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toBe('Pruned 2 resolved record(s) → /repo/.arch-lint-baseline.json');
  });

  it('says "already clean" and writes nothing when nothing is removed', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(resolvedConfig());
    resolveBaselineMock.mockResolvedValue(baselineFile(2));
    runCheckMock.mockResolvedValue({ result: checkResult([]) });
    pruneBaselineMock.mockReturnValue(baselineFile(2));
    const confirm = vi.fn(async () => true);

    const outcome = await runBaselinePrune({ cwd: '/repo', yes: false, confirm });

    expect(confirm).not.toHaveBeenCalled();
    expect(writeBaselineMock).not.toHaveBeenCalled();
    expect(outcome.stdout).toBe('Baseline is already clean — nothing to prune.');
    expect(outcome.exitCode).toBe(0);
  });

  it('writes nothing when the confirmation is declined', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(resolvedConfig());
    resolveBaselineMock.mockResolvedValue(baselineFile(3));
    runCheckMock.mockResolvedValue({ result: checkResult([]) });
    pruneBaselineMock.mockReturnValue(baselineFile(1));
    const confirm = vi.fn(async () => false);

    const outcome = await runBaselinePrune({ cwd: '/repo', yes: false, confirm });

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(writeBaselineMock).not.toHaveBeenCalled();
    expect(outcome.stdout).toBe('Prune cancelled.');
    expect(outcome.exitCode).toBe(0);
  });

  it('writes the pruned baseline when the confirmation is accepted', async () => {
    loadConfigMock.mockResolvedValue({});
    resolveConfigMock.mockReturnValue(resolvedConfig());
    resolveBaselineMock.mockResolvedValue(baselineFile(3));
    runCheckMock.mockResolvedValue({ result: checkResult([]) });
    const pruned = baselineFile(1);
    pruneBaselineMock.mockReturnValue(pruned);
    const confirm = vi.fn(async () => true);

    const outcome = await runBaselinePrune({ cwd: '/repo', yes: false, confirm });

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(writeBaselineMock).toHaveBeenCalledWith('/repo/.arch-lint-baseline.json', pruned);
    expect(outcome.stdout).toBe('Pruned 2 resolved record(s) → /repo/.arch-lint-baseline.json');
  });
});
