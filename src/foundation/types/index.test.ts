import { describe, expect, it } from 'vitest';
import type { EntityComments, EntityResolver, SuppressEntity } from './index.js';

describe('EntityResolver contract', () => {
  it('a plain object satisfies the interface with listEntities and commentsFor', () => {
    const entities: readonly SuppressEntity[] = [
      { id: 'src/Widget', name: 'Widget', entryFilePath: 'src/Widget/Widget.tsx' },
    ];
    const comments: EntityComments = { anchor: 'resolved', comments: [] };
    const resolver: EntityResolver = {
      listEntities: () => entities,
      commentsFor: () => comments,
    };
    expect(resolver.listEntities()).toEqual(entities);
    expect(resolver.commentsFor({ id: 'x', name: 'x', entryFilePath: 'x.ts' })).toEqual(comments);
  });
  it('SuppressEntity carries exactly id, name and entryFilePath', () => {
    const entity: SuppressEntity = { id: 'src/a.ts', name: 'a', entryFilePath: 'src/a.ts' };
    expect(Object.keys(entity).sort()).toEqual(['entryFilePath', 'id', 'name']);
  });
});
