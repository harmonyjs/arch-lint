import { describe, expect, it } from 'vitest';
import type { EntityResolver, SuppressEntity } from './types.js';

describe('EntityResolver contract', () => {
  it('a plain object satisfies the interface with a listEntities method', () => {
    const entities: readonly SuppressEntity[] = [
      { id: 'src/Widget', name: 'Widget', entryFilePath: 'src/Widget/Widget.tsx' },
    ];
    const resolver: EntityResolver = { listEntities: () => entities };
    expect(resolver.listEntities()).toEqual(entities);
  });
  it('SuppressEntity carries exactly id, name and entryFilePath', () => {
    const entity: SuppressEntity = { id: 'src/a.ts', name: 'a', entryFilePath: 'src/a.ts' };
    expect(Object.keys(entity).sort()).toEqual(['entryFilePath', 'id', 'name']);
  });
});
