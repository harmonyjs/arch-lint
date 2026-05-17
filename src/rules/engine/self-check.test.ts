/**
 * @fileoverview Tests for runtimeSelfCheck — the §10.2 collision detector.
 */
import { describe, expect, it } from 'vitest';
import { EngineError } from '#errors/index.js';
import type { Diagnostic } from '#types.js';
import { runtimeSelfCheck } from './self-check.js';

function diag(over: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'lca-placement',
    severity: 'warning',
    entity: 'src/App/X',
    message: 'm',
    actual: 'a',
    reason: 'r',
    suggestions: [],
    location: { file: 'src/App/X', line: 1, column: 1 },
    ...over,
  };
}

describe('runtimeSelfCheck', () => {
  it('passes when every diagnostic has a unique (ruleId, entity, fingerprint)', () => {
    const diags = [
      diag({ entity: 'src/A' }),
      diag({ entity: 'src/B' }),
      diag({ ruleId: 'lib-purity', entity: 'src/A', fingerprint: 'src/A#react#x' }),
    ];
    expect(() => runtimeSelfCheck(diags)).not.toThrow();
  });

  it('passes when fingerprints differ for the same rule and entity', () => {
    const diags = [
      diag({ ruleId: 'layer-boundary', entity: 'src/A', fingerprint: 'src/A#src/p1' }),
      diag({ ruleId: 'layer-boundary', entity: 'src/A', fingerprint: 'src/A#src/p2' }),
    ];
    expect(() => runtimeSelfCheck(diags)).not.toThrow();
  });

  it('throws EngineError on a duplicate (ruleId, entity, fingerprint)', () => {
    const diags = [
      diag({ ruleId: 'layer-boundary', entity: 'src/A', fingerprint: 'src/A#src/p' }),
      diag({ ruleId: 'layer-boundary', entity: 'src/A', fingerprint: 'src/A#src/p' }),
    ];
    expect(() => runtimeSelfCheck(diags)).toThrow(EngineError);
  });

  it('throws on a duplicate when both diagnostics lack a fingerprint', () => {
    const diags = [diag({ entity: 'src/A' }), diag({ entity: 'src/A' })];
    expect(() => runtimeSelfCheck(diags)).toThrow(EngineError);
  });
});
