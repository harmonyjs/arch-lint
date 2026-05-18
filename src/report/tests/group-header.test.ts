/**
 * @fileoverview Golden tests for the rule-group header line.
 */
import { describe, expect, it } from 'vitest';
import { groupHeader } from '#report/format.js';

describe('groupHeader', () => {
  it('renders rule id and severity inside a divider line', () => {
    expect(groupHeader('lca-placement', 'warning')).toBe(
      '─── lca-placement (warning) ─────────────────────────────────',
    );
  });

  it('renders an error-severity header', () => {
    expect(groupHeader('layer-boundary', 'error')).toBe(
      '─── layer-boundary (error) ──────────────────────────────────',
    );
  });
});
