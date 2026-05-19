import { describe, expect, it } from 'vitest';
import type { EntityResolver, SuppressEntity } from './index.js';

describe('EntityResolver contract', () => {
  it('a plain object satisfies the interface with listEntities and sourceFileFor', () => {
    const entities: readonly SuppressEntity[] = [
      { id: 'src/Widget', name: 'Widget', entryFilePath: 'src/Widget/Widget.tsx' },
    ];
    const resolver: EntityResolver = {
      listEntities: () => entities,
      sourceFileFor: () => undefined,
    };
    expect(resolver.listEntities()).toEqual(entities);
    expect(resolver.sourceFileFor({ id: 'x', name: 'x', entryFilePath: 'x.ts' })).toBeUndefined();
  });
  it('SuppressEntity carries exactly id, name and entryFilePath', () => {
    const entity: SuppressEntity = { id: 'src/a.ts', name: 'a', entryFilePath: 'src/a.ts' };
    expect(Object.keys(entity).sort()).toEqual(['entryFilePath', 'id', 'name']);
  });
});
