/**
 * @fileoverview Tests for check() — it runs the (mocked) engine, then classifies the
 * raw diagnostics against the baseline and tallies them into a CheckResult.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BaselineFile } from '../baseline/types.js';
import type { Diagnostic } from '../types.js';
import type { CheckInputs } from './check.js';

const runEngineMock = vi.fn();
vi.mock('../rules/engine.js', () => ({
  runEngine: (...args: unknown[]): unknown => runEngineMock(...args),
}));

const { check } = await import('./check.js');

/** The engine is mocked, so the inputs are an opaque value forwarded to it. */
const inputs = {} as CheckInputs;

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

  it('forwards the rule filter to runEngine', () => {
    runEngineMock.mockReturnValueOnce([]);
    check(inputs, ['layer-boundary']);
    expect(runEngineMock).toHaveBeenCalledWith(inputs, ['layer-boundary']);
  });

  it('runs the engine with no rule filter when none is supplied', () => {
    runEngineMock.mockReturnValueOnce([]);
    check(inputs);
    expect(runEngineMock).toHaveBeenCalledWith(inputs, undefined);
  });
});
