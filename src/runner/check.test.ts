/**
 * @fileoverview Tests for check() — the pure, I/O-free passthrough to runEngine.
 */
import type { Project } from 'ts-morph';
import { describe, expect, it, vi } from 'vitest';
import type { BaselineFile } from '../baseline/types.js';
import type { ResolvedConfig } from '../config/types.js';
import type { ConsumerGraph } from '../graph/types.js';
import type { CheckResult } from '../rules/types.js';
import type { SuppressIndex } from '../suppress/types.js';

const runEngineMock = vi.fn();
vi.mock('../rules/engine.js', () => ({
  runEngine: (...args: unknown[]): unknown => runEngineMock(...args),
}));

const { check } = await import('./check.js');

/** A sentinel CheckResult the mocked engine returns. */
const engineResult: CheckResult = {
  diagnostics: [],
  summary: { total: 0, bySeverity: { info: 0, warning: 0, error: 0 }, new: 0, inBaseline: 0 },
  exitCode: 0,
};

const graph = { nodes: new Map() } as unknown as ConsumerGraph;
const config = {} as ResolvedConfig;
const suppress = {} as SuppressIndex;
const project = {} as Project;

const inputs = { graph, config, suppress, project };

describe('check', () => {
  it('returns exactly what runEngine returns', () => {
    runEngineMock.mockReturnValueOnce(engineResult);
    expect(check(inputs)).toBe(engineResult);
  });

  it('forwards every argument to runEngine unchanged', () => {
    runEngineMock.mockReturnValueOnce(engineResult);
    const baseline = { schemaVersion: 1, records: [] } as unknown as BaselineFile;
    const ruleFilter = ['layer-boundary'] as const;
    check(inputs, ruleFilter, baseline);
    expect(runEngineMock).toHaveBeenCalledWith(
      { graph, config, suppress, project },
      { ruleFilter, baseline },
    );
  });

  it('forwards an explicit null baseline through unchanged', () => {
    runEngineMock.mockReturnValueOnce(engineResult);
    check(inputs, undefined, null);
    expect(runEngineMock).toHaveBeenCalledWith(
      { graph, config, suppress, project },
      { ruleFilter: undefined, baseline: null },
    );
  });

  it('omits trailing optional arguments when not supplied', () => {
    runEngineMock.mockReturnValueOnce(engineResult);
    check(inputs);
    expect(runEngineMock).toHaveBeenCalledWith(
      { graph, config, suppress, project },
      { ruleFilter: undefined, baseline: undefined },
    );
  });
});
