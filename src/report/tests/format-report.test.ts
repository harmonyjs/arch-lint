/**
 * @fileoverview Golden tests for the full CLI report.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { CheckResult } from '#platform/engine/types.js';
import { formatReport } from '#report/format.js';

function cfg(): ResolvedConfig {
  return {
    report: {
      cli: {
        color: 'never',
        showSuggestions: true,
        showConsumers: true,
        hyperlinks: 'never',
        foldLongLists: true,
      },
    },
  } as ResolvedConfig;
}

function diag(over: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'lca-placement',
    severity: 'warning',
    entity: 'src/X',
    message: 'm',
    actual: 'src/X',
    reason: 'r',
    suggestions: [],
    status: 'new',
    location: { file: 'src/X', line: 1, column: 1 },
    ...over,
  };
}

describe('formatReport', () => {
  it('renders an all-clear report when there are no diagnostics', () => {
    const result: CheckResult = {
      diagnostics: [],
      summary: { total: 0, bySeverity: { info: 0, warning: 0, error: 0 }, new: 0, inBaseline: 0 },
      exitCode: 0,
    };
    expect(formatReport(result, cfg())).toBe('No architecture violations found.');
  });

  it('groups diagnostics by ruleId and ends with a summary line', () => {
    const result: CheckResult = {
      diagnostics: [
        diag({ ruleId: 'lca-placement', severity: 'warning', entity: 'src/A', status: 'new' }),
        diag({
          ruleId: 'layer-boundary',
          severity: 'error',
          entity: 'src/B',
          status: 'inBaseline',
        }),
      ],
      summary: { total: 2, bySeverity: { info: 0, warning: 1, error: 1 }, new: 1, inBaseline: 1 },
      exitCode: 1,
    };
    const out = formatReport(result, cfg());
    expect(out).toContain('─── layer-boundary (error)');
    expect(out).toContain('─── lca-placement (warning)');
    expect(out).toContain('  src/A');
    expect(out).toContain('  src/B');
    expect(out.trimEnd().endsWith('Summary: 1 error, 1 warning (1 new, 1 in baseline)')).toBe(true);
  });
});
