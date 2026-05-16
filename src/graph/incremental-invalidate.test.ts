/**
 * @fileoverview Tests for resolver-cache invalidation via the reverse index.
 */
import { describe, it, expect } from 'vitest';
import { cacheKeysToInvalidate } from './incremental.js';

const reverseIndex = new Map<string, Set<string>>([
  ['src/lib/util.ts', new Set(['src/App/App.tsx#util', 'src/api/api.ts#util'])],
  ['src/model/m.ts', new Set(['src/App/App.tsx#m'])],
]);

describe('cacheKeysToInvalidate', () => {
  it('collects every cache key whose chain touched a modified file', () => {
    const keys = cacheKeysToInvalidate(
      { added: [], removed: [], modified: ['src/lib/util.ts'] },
      reverseIndex,
    );
    expect([...keys].sort()).toEqual(['src/App/App.tsx#util', 'src/api/api.ts#util']);
  });

  it('unions keys across added, removed and modified files', () => {
    const keys = cacheKeysToInvalidate(
      { added: ['src/model/m.ts'], removed: [], modified: ['src/lib/util.ts'] },
      reverseIndex,
    );
    expect(keys.size).toBe(3);
  });

  it('returns an empty set when no indexed file changed', () => {
    const keys = cacheKeysToInvalidate(
      { added: [], removed: [], modified: ['src/untracked.ts'] },
      reverseIndex,
    );
    expect(keys.size).toBe(0);
  });
});
