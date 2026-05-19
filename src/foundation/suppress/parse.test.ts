/**
 * @fileoverview Tests for parsing all @arch-decision suppress data of one
 * entity from the ts-morph-free comment model.
 */

import { describe, expect, it } from 'vitest';
import type { SuppressConfig } from '#foundation/config/types.js';
import type { CommentBlock, EntityComments } from '#foundation/types/index.js';
import { parseEntitySuppress } from './parse.js';

const cfg: SuppressConfig = {
  marker: '@arch-decision',
  minReasonLength: 12,
  expirySupport: true,
  scanLocations: ['leading-comment', 'jsdoc'],
  maxDistanceLines: 5,
};

function block(over: Partial<CommentBlock>): CommentBlock {
  return {
    rawText: '',
    kind: 'leading-comment',
    location: { file: 'src/Widget/Widget.tsx', line: 1, column: 1 },
    distanceLines: 0,
    ...over,
  };
}
function resolved(comments: CommentBlock[]): EntityComments {
  return { anchor: 'resolved', comments };
}
function absent(fileComments: CommentBlock[]): EntityComments {
  return { anchor: 'absent', fileComments };
}

describe('parseEntitySuppress — resolved anchor', () => {
  it('returns empty data when the anchor has no comments', () => {
    expect(parseEntitySuppress(resolved([]), cfg)).toEqual({ valid: [], malformed: [] });
  });

  it('parses one valid broad suppress', () => {
    const data = parseEntitySuppress(
      resolved([block({ rawText: '// @arch-decision: deliberate architectural choice' })]),
      cfg,
    );
    expect(data.valid).toHaveLength(1);
    expect(data.valid[0]?.ruleId).toBeNull();
    expect(data.valid[0]?.reason).toBe('deliberate architectural choice');
    expect(data.malformed).toEqual([]);
  });

  it('parses a rule-scoped suppress with an expiry', () => {
    const data = parseEntitySuppress(
      resolved([
        block({
          rawText: '// @arch-decision[lca-placement]: until 2026-12-31, migration in progress',
        }),
      ]),
      cfg,
    );
    expect(data.valid[0]?.ruleId).toBe('lca-placement');
    expect(data.valid[0]?.expiry?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });

  it('collects a short-reason comment into malformed', () => {
    const data = parseEntitySuppress(
      resolved([block({ rawText: '// @arch-decision: short' })]),
      cfg,
    );
    expect(data.valid).toEqual([]);
    expect(data.malformed).toHaveLength(1);
    expect(data.malformed[0]?.kind).toBe('short-reason');
  });

  it('parses multiple stacked suppress comments', () => {
    const data = parseEntitySuppress(
      resolved([
        block({ rawText: '// @arch-decision[lca-placement]: rule scoped decision here' }),
        block({ rawText: '// @arch-decision: broad decision long enough' }),
      ]),
      cfg,
    );
    expect(data.valid).toHaveLength(2);
  });

  it('ignores a JSDoc comment when scanLocations excludes jsdoc', () => {
    const data = parseEntitySuppress(
      resolved([
        block({
          kind: 'jsdoc',
          rawText: '/**\n * @arch-decision: jsdoc decision long enough\n */',
        }),
      ]),
      { ...cfg, scanLocations: ['leading-comment'] },
    );
    expect(data.valid).toEqual([]);
  });

  it('ignores a comment farther than maxDistanceLines away', () => {
    const data = parseEntitySuppress(
      resolved([block({ rawText: '// @arch-decision: far decision here now', distanceLines: 7 })]),
      cfg,
    );
    expect(data.valid).toEqual([]);
  });

  it('keeps a comment exactly maxDistanceLines away', () => {
    const data = parseEntitySuppress(
      resolved([
        block({ rawText: '// @arch-decision: borderline decision here', distanceLines: 5 }),
      ]),
      cfg,
    );
    expect(data.valid).toHaveLength(1);
  });
});

describe('parseEntitySuppress — absent anchor', () => {
  it('reports no-main-export for a stray @arch-decision directive', () => {
    const data = parseEntitySuppress(
      absent([block({ rawText: '// @arch-decision: stray decision with no main export' })]),
      cfg,
    );
    expect(data.valid).toEqual([]);
    expect(data.malformed).toHaveLength(1);
    expect(data.malformed[0]?.kind).toBe('no-main-export');
  });

  it('ignores a marker that appears as prose, not as a directive', () => {
    const data = parseEntitySuppress(
      absent([
        block({
          kind: 'jsdoc',
          rawText: '/**\n * @fileoverview parser reporting malformed @arch-decision comments.\n */',
        }),
      ]),
      cfg,
    );
    expect(data).toEqual({ valid: [], malformed: [] });
  });

  it('returns empty data when there are no file comments at all', () => {
    expect(parseEntitySuppress(absent([]), cfg)).toEqual({ valid: [], malformed: [] });
  });
});
