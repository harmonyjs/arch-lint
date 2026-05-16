/**
 * @fileoverview Golden tests for single-diagnostic body rendering.
 */
import { describe, it, expect } from 'vitest';
import type { Diagnostic } from '../types.js';
import { renderDiagnostic } from './cli.js';

const opts = { showConsumers: true, showSuggestions: true, foldLongLists: true, hyperlinks: false };

const full: Diagnostic = {
  ruleId: 'lca-placement',
  severity: 'warning',
  entity: 'src/App/Header/items/HeaderLabel',
  message: 'entity is not at its LCA',
  expected: 'src/App/Header/MonthRow/slots/HeaderLabel',
  actual: 'src/App/Header/items/HeaderLabel',
  reason: '1 consumer, LCA narrows to MonthRow',
  consumers: [
    {
      file: 'src/App/Header/MonthRow/MonthRow.tsx',
      symbol: 'HeaderLabel',
      importPath: '../items/HeaderLabel',
      resolved: 'src/App/Header/items/HeaderLabel',
      location: { file: 'src/App/Header/MonthRow/MonthRow.tsx', line: 4, column: 1 },
    },
  ],
  suggestions: [
    { action: 'move', target: 'MonthRow/slots/HeaderLabel/', rationale: 'place at LCA' },
  ],
  location: { file: 'src/App/Header/items/HeaderLabel/HeaderLabel.tsx', line: 1, column: 1 },
};

describe('renderDiagnostic', () => {
  it('renders entity, expected, actual, reason, consumers and suggestions', () => {
    expect(renderDiagnostic(full, opts)).toBe(
      [
        '  src/App/Header/items/HeaderLabel',
        '    Expected: src/App/Header/MonthRow/slots/HeaderLabel',
        '    Actual:   src/App/Header/items/HeaderLabel',
        '    Reason:   1 consumer, LCA narrows to MonthRow',
        '    Consumers:',
        '      1. src/App/Header/MonthRow/MonthRow.tsx (line 4)',
        '    Suggest:',
        '      [a] move → MonthRow/slots/HeaderLabel/',
      ].join('\n'),
    );
  });

  it('omits Expected and Consumers when absent', () => {
    const minimal: Diagnostic = {
      ruleId: 'unresolved-import',
      severity: 'warning',
      entity: 'src/api/api.ts',
      message: 'import not resolved',
      actual: 'src/api/api.ts',
      reason: 'missing export',
      suggestions: [],
      location: { file: 'src/api/api.ts', line: 2, column: 1 },
    };
    expect(renderDiagnostic(minimal, opts)).toBe(
      [
        '  src/api/api.ts',
        '    Actual:   src/api/api.ts',
        '    Reason:   missing export',
      ].join('\n'),
    );
  });
});
