/**
 * @fileoverview Tests for the `check` command adapter — it translates CLI
 * flags into a `RunCheckOptions`, runs the check, and projects the outcome
 * onto a process-pure shape. `runCheck` is mocked at its module seam.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CheckResult } from '../../rules/types.js';
import type { Diagnostic } from '../../types.js';
const runCheckMock = vi.fn();
vi.mock('../../runner/index.js', () => ({
  runCheck: (...args: unknown[]): unknown => runCheckMock(...args),
}));

const { runCheckCommand } = await import('./check.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

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

describe('runCheckCommand', () => {
  it('runs a plain check as a ci verdict with changed-only off', async () => {
    runCheckMock.mockResolvedValue({
      result: checkResult([]),
      report: 'all clear',
      exitCode: 0,
      warnings: [],
    });

    const outcome = await runCheckCommand({
      cwd: '/repo',
      changedOnly: false,
      noBaseline: false,
    });

    expect(runCheckMock).toHaveBeenCalledTimes(1);
    const options = runCheckMock.mock.calls[0]![0];
    expect(options).toMatchObject({
      cwd: '/repo',
      mode: 'ci',
      changedOnly: false,
      noBaseline: false,
    });
    // Absent optional flags must not land as explicit undefined keys.
    expect(options).not.toHaveProperty('configPath');
    expect(options).not.toHaveProperty('base');
    expect(options).not.toHaveProperty('ruleFilter');
    expect(outcome).toEqual({ stdout: 'all clear', stderr: [], exitCode: 0 });
  });

  it('runs --changed-only as a preCommit verdict and forwards warnings + exit code', async () => {
    runCheckMock.mockResolvedValue({
      result: checkResult([]),
      report: 'one new violation',
      exitCode: 1,
      warnings: ['changed-only: could not determine the git base'],
    });

    const outcome = await runCheckCommand({
      cwd: '/repo',
      configPath: '/repo/arch-lint.config.ts',
      changedOnly: true,
      noBaseline: true,
      base: 'origin/main',
      ruleFilter: ['layer-boundary'],
    });

    const options = runCheckMock.mock.calls[0]![0];
    expect(options).toEqual({
      cwd: '/repo',
      mode: 'preCommit',
      changedOnly: true,
      noBaseline: true,
      configPath: '/repo/arch-lint.config.ts',
      base: 'origin/main',
      ruleFilter: ['layer-boundary'],
    });
    expect(outcome.stdout).toBe('one new violation');
    expect(outcome.stderr).toEqual(['changed-only: could not determine the git base']);
    expect(outcome.exitCode).toBe(1);
  });
});
