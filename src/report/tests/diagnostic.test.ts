/**
 * @fileoverview Golden tests for single-diagnostic body rendering.
 */
import { describe, expect, it } from 'vitest';
import type { CouplingFacetsAnalysis, Diagnostic } from '#foundation/types/index.js';
import { renderDiagnostic } from '#report/format.js';

const opts = {
  showConsumers: true,
  showSuggestions: true,
  foldLongLists: true,
  hyperlinks: false,
  explain: false,
};

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
        '    Remedy:   place at LCA → MonthRow/slots/HeaderLabel/',
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
      ['  src/api/api.ts', '    Actual:   src/api/api.ts', '    Reason:   missing export'].join(
        '\n',
      ),
    );
  });
});

const baseDiag: Diagnostic = {
  ruleId: 'afferent-coupling',
  severity: 'warning',
  entity: 'foundation/x',
  message: 'm',
  actual: '8',
  reason: 'r',
  suggestions: [],
  location: { file: 'foundation/x', line: 1, column: 1 },
};

describe('renderDiagnostic — rich diagnostics', () => {
  it('renders the suggestion rationale in default mode', () => {
    const d: Diagnostic = {
      ...baseDiag,
      suggestions: [{ action: 'custom', rationale: 'replace the default export' }],
    };
    expect(renderDiagnostic(d, opts)).toContain('Remedy:   replace the default export');
  });

  it('hides the analysis block in default mode and shows it under explain', () => {
    const analysis: CouplingFacetsAnalysis = {
      kind: 'coupling-facets',
      facets: [
        { symbol: 'one', units: ['a'] },
        { symbol: 'two', units: ['b'] },
      ],
      disjoint: true,
    };
    const d: Diagnostic = {
      ...baseDiag,
      analysis,
      suggestions: [
        {
          action: 'split',
          rationale: 'split along the seam — relocate two',
          candidates: [
            { target: 'b', note: '+0 new unit edges', best: true },
            { target: 'a', note: '+1 new unit edge', best: false },
          ],
        },
      ],
    };
    expect(renderDiagnostic(d, opts)).not.toContain('Analysis:');
    const explained = renderDiagnostic(d, { ...opts, explain: true });
    expect(explained).toContain('Analysis:');
    expect(explained).toContain('one → a');
    expect(explained).toContain('[a] b');
    expect(explained).toContain('★');
  });
});
