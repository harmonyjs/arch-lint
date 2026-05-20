/**
 * @fileoverview Tests for renderShape — markdown emission of the topology
 * observations section.
 */
import { describe, expect, it } from 'vitest';
import { renderShape } from './render.js';
import type { ShapeFinding } from './types.js';

describe('renderShape', () => {
  it('renders the empty-state sentence when there are no findings', () => {
    expect(renderShape([])).toBe('## Topology observations\n\nNo topology observations.');
  });

  it('renders one sub-heading per non-empty detector and skips empty ones', () => {
    const findings: ShapeFinding[] = [
      {
        kind: 'sibling-asymmetry',
        folder: 'src/rules/metrics/coupling-decomposition',
        usedBy: ['afferent', 'cross-cutting', 'efferent', 'unit-cohesion'],
        missing: ['instability'],
        total: 5,
      },
    ];
    const md = renderShape(findings);
    expect(md).toContain('## Topology observations');
    expect(md).toContain('### Sibling-asymmetry');
    expect(md).not.toContain('### Carved-aspect');
    expect(md).not.toContain('### Type-circular');
    expect(md).not.toContain('### Hubs');
  });

  it('renders the sibling-asymmetry row with used-by count and missing list', () => {
    const findings: ShapeFinding[] = [
      {
        kind: 'sibling-asymmetry',
        folder: 'src/metrics/shared',
        usedBy: ['a', 'b'],
        missing: ['c'],
        total: 3,
      },
    ];
    const md = renderShape(findings);
    expect(md).toContain('`src/metrics/shared`');
    expect(md).toContain('2/3');
    expect(md).toContain('`c`');
  });

  it('renders the carved-aspect row with direction and LOC', () => {
    const findings: ShapeFinding[] = [
      {
        kind: 'carved-aspect',
        core: 'src/runner/check.ts',
        aspect: 'src/runner/check-logging.ts',
        coreLoc: 314,
        aspectLoc: 35,
        direction: 'core→aspect',
      },
    ];
    const md = renderShape(findings);
    expect(md).toContain('### Carved-aspect pairs');
    expect(md).toContain('314 / 35');
    expect(md).toContain('core→aspect');
  });

  it('renders the type-circular section with pair and triplet sub-tables together', () => {
    const findings: ShapeFinding[] = [
      { kind: 'type-circular-pair', a: 'src/a.ts', b: 'src/b.ts' },
      {
        kind: 'type-circular-triplet',
        a: 'src/verdict.ts',
        b: 'src/analyze.ts',
        consumer: 'src/thin.ts',
      },
    ];
    const md = renderShape(findings);
    expect(md).toContain('### Type-circular');
    expect(md).toContain('Pair');
    expect(md).toContain('Triplet');
    expect(md).toContain('`src/thin.ts`');
  });

  it('renders the hubs row with fan-in / fan-out columns', () => {
    const findings: ShapeFinding[] = [
      { kind: 'hub', file: 'src/runner/cli-commands.ts', fanIn: 1, fanOut: 5 },
    ];
    const md = renderShape(findings);
    expect(md).toContain('### Hubs');
    expect(md).toContain('| Fan-in');
    expect(md).toContain('| 1 | 5 |');
  });
});
