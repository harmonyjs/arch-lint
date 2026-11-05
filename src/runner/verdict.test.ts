/**
 * @fileoverview Tests for the blocking predicate and the verdict exit code
 * derived from it.
 */
import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '#foundation/types/index.js';
import { isBlocking, verdictExitCode } from './verdict.js';

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

describe('isBlocking', () => {
  it.each([
    { severity: 'info', status: 'new', blocking: false },
    { severity: 'info', status: 'inBaseline', blocking: false },
    { severity: 'info', status: undefined, blocking: false },
    { severity: 'warning', status: 'new', blocking: true },
    { severity: 'warning', status: 'inBaseline', blocking: false },
    { severity: 'warning', status: undefined, blocking: true },
    { severity: 'error', status: 'new', blocking: true },
    { severity: 'error', status: 'inBaseline', blocking: false },
    { severity: 'error', status: undefined, blocking: true },
  ] as const)(
    'is $blocking for a $severity diagnostic with status $status',
    ({ severity, status, blocking }) => {
      const d = diagnostic(status === undefined ? { severity } : { severity, status });
      expect(isBlocking(d)).toBe(blocking);
    },
  );
});

describe('verdictExitCode', () => {
  it('is 0 for no diagnostics', () => {
    expect(verdictExitCode([])).toBe(0);
  });

  it('is 0 when every new diagnostic is info', () => {
    expect(verdictExitCode([diagnostic({ severity: 'info', status: 'new' })])).toBe(0);
  });

  it('is 1 when one blocking diagnostic sits among non-blocking ones', () => {
    const diagnostics = [
      diagnostic({ severity: 'info', status: 'new' }),
      diagnostic({ severity: 'error', status: 'inBaseline' }),
      diagnostic({ severity: 'warning', status: 'new' }),
    ];
    expect(verdictExitCode(diagnostics)).toBe(1);
  });
});
