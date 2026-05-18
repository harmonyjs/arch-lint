/**
 * @fileoverview Tests for the SuppressIndex class — isSuppressed, findExpired, factory.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { SuppressConfig } from '#foundation/config/types.js';
import type {
  Diagnostic,
  EntityResolver,
  Location,
  SuppressEntity,
} from '#foundation/types/index.js';
import { buildSuppressIndex, SuppressIndexImpl } from './suppress-index.js';
import type { EntitySuppressData, MalformedSuppress, ParsedSuppress } from './types.js';

/** Wraps a fixed entity list into the EntityResolver buildSuppressIndex consumes. */
function resolverOf(entities: readonly SuppressEntity[]): EntityResolver {
  return { listEntities: () => entities };
}

const loc: Location = { file: 'src/Widget/Widget.tsx', line: 1, column: 1 };
const NOW = new Date('2026-06-01T00:00:00Z');

const cfg: SuppressConfig = {
  marker: '@arch-decision',
  minReasonLength: 12,
  expirySupport: true,
  scanLocations: ['leading-comment', 'jsdoc'],
  maxDistanceLines: 5,
};

function diag(over: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'lca-placement',
    severity: 'warning',
    entity: 'src/Widget',
    actual: 'src/Widget',
    message: 'm',
    reason: 'r',
    suggestions: [],
    location: loc,
    ...over,
  };
}

function suppress(over: Partial<ParsedSuppress>): ParsedSuppress {
  return { ruleId: null, reason: 'a reason long enough', expiry: null, location: loc, ...over };
}

describe('SuppressIndexImpl.isSuppressed', () => {
  it('returns false for an entity with no suppress data', () => {
    const index = new SuppressIndexImpl(new Map(), NOW);
    expect(index.isSuppressed(diag({}))).toBe(false);
  });

  it('suppresses a diagnostic whose entity has a matching broad suppress', () => {
    const data = new Map<string, EntitySuppressData>([
      ['src/Widget', { valid: [suppress({})], malformed: [] }],
    ]);
    const index = new SuppressIndexImpl(data, NOW);
    expect(index.isSuppressed(diag({}))).toBe(true);
  });

  it('does not suppress a diagnostic of a different entity', () => {
    const data = new Map<string, EntitySuppressData>([
      ['src/Other', { valid: [suppress({})], malformed: [] }],
    ]);
    const index = new SuppressIndexImpl(data, NOW);
    expect(index.isSuppressed(diag({ entity: 'src/Widget' }))).toBe(false);
  });

  it('respects rule-specific scoping through the stack precedence', () => {
    const data = new Map<string, EntitySuppressData>([
      ['src/Widget', { valid: [suppress({ ruleId: 'slots-privacy' })], malformed: [] }],
    ]);
    const index = new SuppressIndexImpl(data, NOW);
    expect(index.isSuppressed(diag({ ruleId: 'lca-placement' }))).toBe(false);
    expect(index.isSuppressed(diag({ ruleId: 'slots-privacy' }))).toBe(true);
  });

  it('does not suppress when the matching suppress is expired', () => {
    const data = new Map<string, EntitySuppressData>([
      [
        'src/Widget',
        { valid: [suppress({ expiry: new Date('2026-01-01T00:00:00Z') })], malformed: [] },
      ],
    ]);
    const index = new SuppressIndexImpl(data, NOW);
    expect(index.isSuppressed(diag({}))).toBe(false);
  });
});

describe('SuppressIndexImpl.findExpired', () => {
  it('returns an empty list when nothing is expired or malformed', () => {
    const data = new Map<string, EntitySuppressData>([
      ['src/Widget', { valid: [suppress({})], malformed: [] }],
    ]);
    expect(new SuppressIndexImpl(data, NOW).findExpired()).toEqual([]);
  });

  it('returns a valid suppress whose expiry has passed', () => {
    const expired = suppress({ expiry: new Date('2026-01-01T00:00:00Z') });
    const data = new Map<string, EntitySuppressData>([
      ['src/Widget', { valid: [expired], malformed: [] }],
    ]);
    const found = new SuppressIndexImpl(data, NOW).findExpired();
    expect(found).toHaveLength(1);
    expect(found[0]?.expiry?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('does not return a valid suppress with a future expiry', () => {
    const future = suppress({ expiry: new Date('2026-12-31T00:00:00Z') });
    const data = new Map<string, EntitySuppressData>([
      ['src/Widget', { valid: [future], malformed: [] }],
    ]);
    expect(new SuppressIndexImpl(data, NOW).findExpired()).toEqual([]);
  });

  it('includes malformed suppress entries in findExpired output', () => {
    const malformed: MalformedSuppress = {
      kind: 'short-reason',
      ruleId: 'lca-placement',
      reason: 'short',
      location: loc,
    };
    const data = new Map<string, EntitySuppressData>([
      ['src/Widget', { valid: [], malformed: [malformed] }],
    ]);
    const found = new SuppressIndexImpl(data, NOW).findExpired();
    expect(found).toHaveLength(1);
    expect(found[0]?.ruleId).toBe('lca-placement');
  });

  it('findMalformed returns the raw malformed entries', () => {
    const malformed: MalformedSuppress = {
      kind: 'no-main-export',
      ruleId: null,
      reason: undefined,
      location: loc,
    };
    const data = new Map<string, EntitySuppressData>([
      ['src/Widget', { valid: [], malformed: [malformed] }],
    ]);
    const found = new SuppressIndexImpl(data, NOW).findMalformed();
    expect(found).toEqual([malformed]);
  });

  it('combines expired-valid and malformed across multiple entities', () => {
    const expired = suppress({ expiry: new Date('2026-01-01T00:00:00Z') });
    const malformed: MalformedSuppress = {
      kind: 'missing-reason',
      ruleId: null,
      reason: undefined,
      location: loc,
    };
    const data = new Map<string, EntitySuppressData>([
      ['src/A', { valid: [expired], malformed: [] }],
      ['src/B', { valid: [], malformed: [malformed] }],
    ]);
    expect(new SuppressIndexImpl(data, NOW).findExpired()).toHaveLength(2);
  });
});

describe('buildSuppressIndex', () => {
  it('builds an index that suppresses a diagnostic from a parsed comment', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile(
      'src/Widget/Widget.tsx',
      '// @arch-decision: deliberate architectural choice\nexport const Widget = () => null;',
    );
    const entities: SuppressEntity[] = [
      { id: 'src/Widget', name: 'Widget', entryFilePath: 'src/Widget/Widget.tsx' },
    ];
    const index = buildSuppressIndex(project, cfg, resolverOf(entities), NOW);
    expect(index.isSuppressed(diag({ entity: 'src/Widget' }))).toBe(true);
  });

  it('skips entities whose entry file is not in the project', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const entities: SuppressEntity[] = [
      { id: 'src/Missing', name: 'Missing', entryFilePath: 'src/Missing/Missing.tsx' },
    ];
    const index = buildSuppressIndex(project, cfg, resolverOf(entities), NOW);
    expect(index.isSuppressed(diag({ entity: 'src/Missing' }))).toBe(false);
  });

  it('collects malformed suppress across all entities into findExpired', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile(
      'src/Widget/Widget.tsx',
      '// @arch-decision: short\nexport const Widget = () => null;',
    );
    const entities: SuppressEntity[] = [
      { id: 'src/Widget', name: 'Widget', entryFilePath: 'src/Widget/Widget.tsx' },
    ];
    const index = buildSuppressIndex(project, cfg, resolverOf(entities), NOW);
    expect(index.findExpired()).toHaveLength(1);
  });
});
