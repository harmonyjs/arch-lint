/**
 * @fileoverview Tests for the pure change-set normalization of warm builds.
 */
import { describe, expect, it } from 'vitest';
import { normalizeChanges } from '#platform/graph/incremental.js';

describe('normalizeChanges', () => {
  it('keeps a change set with disjoint added/removed/modified', () => {
    const changes = normalizeChanges({
      added: ['src/new.ts'],
      removed: ['src/old.ts'],
      modified: ['src/edit.ts'],
    });
    expect(changes.added).toEqual(['src/new.ts']);
    expect(changes.removed).toEqual(['src/old.ts']);
    expect(changes.modified).toEqual(['src/edit.ts']);
  });

  it('drops a file from modified when it is also added (add wins)', () => {
    const changes = normalizeChanges({
      added: ['src/f.ts'],
      removed: [],
      modified: ['src/f.ts'],
    });
    expect(changes.added).toEqual(['src/f.ts']);
    expect(changes.modified).toEqual([]);
  });

  it('drops a file from modified when it is also removed (remove wins)', () => {
    const changes = normalizeChanges({
      added: [],
      removed: ['src/f.ts'],
      modified: ['src/f.ts'],
    });
    expect(changes.removed).toEqual(['src/f.ts']);
    expect(changes.modified).toEqual([]);
  });
});
