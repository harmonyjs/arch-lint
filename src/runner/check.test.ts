/**
 * @fileoverview Tests for check() — it resolves the active rule set, runs the
 * (mocked) engine, then classifies the raw diagnostics against the baseline and
 * tallies them into a CheckResult.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Diagnostic } from '#foundation/types/index.js';
import type { BaselineFile } from '#runner/baseline/types.js';
import type { CheckInputs } from './check.js';

const runEngineMock = vi.fn();
vi.mock('#platform/engine/index.js', () => ({
  runEngine: (...args: unknown[]): unknown => runEngineMock(...args),
}));

const getActiveRulesMock = vi.fn();
vi.mock('#rules/index.js', () => ({
  getActiveRules: (...args: unknown[]): unknown => getActiveRulesMock(...args),
}));

const { check } = await import('./check.js');

/** The engine and rule registry are mocked, so the inputs are an opaque forwarded value. */
const inputs = { config: { kind: 'config-sentinel' } } as unknown as CheckInputs;

/** A raw diagnostic — `check` is responsible for assigning its baseline status. */
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

function baselineWith(records: BaselineFile['records']): BaselineFile {
  return {
    schemaVersion: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    generatorVersion: '1.0.0',
    records,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('check', () => {
  it('classifies every diagnostic as new when no baseline is given', () => {
    runEngineMock.mockReturnValueOnce([diagnostic(), diagnostic({ entity: 'src/b.ts' })]);
    const result = check(inputs);
    expect(result.diagnostics.every((d) => d.status === 'new')).toBe(true);
    expect(result.summary).toEqual({
      total: 2,
      bySeverity: { info: 0, warning: 0, error: 2 },
      new: 2,
      inBaseline: 0,
    });
  });

  it('marks a diagnostic inBaseline when its logical id is recorded', () => {
    runEngineMock.mockReturnValueOnce([
      diagnostic({ entity: 'src/a.ts' }),
      diagnostic({ entity: 'src/b.ts' }),
    ]);
    const baseline = baselineWith([{ ruleId: 'layer-boundary', entity: 'src/a.ts' }]);
    const result = check(inputs, undefined, baseline);
    const status = new Map(result.diagnostics.map((d) => [d.entity, d.status]));
    expect(status.get('src/a.ts')).toBe('inBaseline');
    expect(status.get('src/b.ts')).toBe('new');
    expect(result.summary.new).toBe(1);
    expect(result.summary.inBaseline).toBe(1);
  });

  it('reports exitCode 1 when a new blocking diagnostic exists', () => {
    runEngineMock.mockReturnValueOnce([diagnostic({ severity: 'warning' })]);
    expect(check(inputs).exitCode).toBe(1);
  });

  it('reports exitCode 0 when every diagnostic is inBaseline', () => {
    runEngineMock.mockReturnValueOnce([diagnostic({ entity: 'src/a.ts' })]);
    const baseline = baselineWith([{ ruleId: 'layer-boundary', entity: 'src/a.ts' }]);
    expect(check(inputs, undefined, baseline).exitCode).toBe(0);
  });

  it('keeps exitCode 0 when the only new diagnostic is info severity', () => {
    runEngineMock.mockReturnValueOnce([diagnostic({ severity: 'info' })]);
    const result = check(inputs);
    expect(result.summary.bySeverity.info).toBe(1);
    expect(result.exitCode).toBe(0);
  });

  it('resolves the active rule set for the supplied rule filter', () => {
    getActiveRulesMock.mockReturnValueOnce([]);
    runEngineMock.mockReturnValueOnce([]);
    check(inputs, ['layer-boundary']);
    expect(getActiveRulesMock).toHaveBeenCalledWith(inputs.config, ['layer-boundary']);
  });

  it('resolves the active rule set with no filter when none is supplied', () => {
    getActiveRulesMock.mockReturnValueOnce([]);
    runEngineMock.mockReturnValueOnce([]);
    check(inputs);
    expect(getActiveRulesMock).toHaveBeenCalledWith(inputs.config, undefined);
  });

  it('passes the resolved active rules to runEngine', () => {
    const rules = [{ id: 'layer-boundary' }];
    getActiveRulesMock.mockReturnValueOnce(rules);
    runEngineMock.mockReturnValueOnce([]);
    check(inputs);
    expect(runEngineMock).toHaveBeenCalledWith(inputs, rules);
  });
});
