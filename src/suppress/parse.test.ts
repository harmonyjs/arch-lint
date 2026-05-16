/**
 * @fileoverview Tests for parsing all @arch-decision suppress data of one entity.
 */
import { describe, it, expect } from 'vitest';
import { Project, type SourceFile } from 'ts-morph';
import { parseEntitySuppress } from './parse.js';
import type { SuppressConfig } from '../types.js';

const cfg: SuppressConfig = {
  marker: '@arch-decision',
  minReasonLength: 12,
  expirySupport: true,
  scanLocations: ['leading-comment', 'jsdoc'],
  maxDistanceLines: 5,
};

function sf(code: string): SourceFile {
  return new Project({ useInMemoryFileSystem: true }).createSourceFile('src/Widget/Widget.tsx', code);
}

describe('parseEntitySuppress', () => {
  it('returns empty data for an entity without any @arch-decision comment', () => {
    const data = parseEntitySuppress(sf('export const Widget = () => null;'), 'Widget', 'src/Widget', cfg);
    expect(data).toEqual({ valid: [], malformed: [] });
  });

  it('parses one valid broad suppress above the main export', () => {
    const data = parseEntitySuppress(
      sf('// @arch-decision: deliberate architectural choice\nexport const Widget = () => null;'),
      'Widget',
      'src/Widget',
      cfg,
    );
    expect(data.valid).toHaveLength(1);
    expect(data.valid[0]?.ruleId).toBeNull();
    expect(data.valid[0]?.reason).toBe('deliberate architectural choice');
    expect(data.malformed).toEqual([]);
  });

  it('parses a rule-scoped suppress with an expiry', () => {
    const data = parseEntitySuppress(
      sf('// @arch-decision[lca-placement]: until 2026-12-31, migration in progress\nexport const Widget = () => null;'),
      'Widget',
      'src/Widget',
      cfg,
    );
    expect(data.valid[0]?.ruleId).toBe('lca-placement');
    expect(data.valid[0]?.expiry?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });

  it('collects a short-reason comment into malformed', () => {
    const data = parseEntitySuppress(
      sf('// @arch-decision: short\nexport const Widget = () => null;'),
      'Widget',
      'src/Widget',
      cfg,
    );
    expect(data.valid).toEqual([]);
    expect(data.malformed).toHaveLength(1);
    expect(data.malformed[0]?.kind).toBe('short-reason');
  });

  it('parses multiple suppress comments stacked above the export', () => {
    const data = parseEntitySuppress(
      sf(
        '// @arch-decision[lca-placement]: rule scoped decision here\n' +
          '// @arch-decision: broad decision long enough\n' +
          'export const Widget = () => null;',
      ),
      'Widget',
      'src/Widget',
      cfg,
    );
    expect(data.valid).toHaveLength(2);
  });

  it('reports no-main-export malformed when a stray @arch-decision has no anchor', () => {
    const data = parseEntitySuppress(
      sf('// @arch-decision: stray decision with no main export\nexport const helper = 1;'),
      'Widget',
      'src/Widget',
      cfg,
    );
    expect(data.valid).toEqual([]);
    expect(data.malformed).toHaveLength(1);
    expect(data.malformed[0]?.kind).toBe('no-main-export');
  });

  it('does not scan jsdoc when scanLocations excludes it', () => {
    const data = parseEntitySuppress(
      sf('/**\n * @arch-decision: jsdoc decision long enough\n */\nexport const Widget = () => null;'),
      'Widget',
      'src/Widget',
      { ...cfg, scanLocations: ['leading-comment'] },
    );
    expect(data.valid).toEqual([]);
  });
});
