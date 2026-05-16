/**
 * @fileoverview Tests for the M5 syntactic-support helper barrel.
 */
import { describe, it, expect } from 'vitest';
import * as support from './index.js';

describe('syntactic-support barrel', () => {
  it('re-exports every public helper', () => {
    expect(typeof support.dedupByFingerprint).toBe('function');
    expect(typeof support.segmentsOf).toBe('function');
    expect(typeof support.isUnderSegment).toBe('function');
    expect(typeof support.enforceForSegmentsMatches).toBe('function');
    expect(typeof support.sourceFileFor).toBe('function');
    expect(typeof support.fileNodeIds).toBe('function');
    expect(typeof support.importsOf).toBe('function');
    expect(typeof support.isBarrelFile).toBe('function');
    expect(typeof support.isComponentFolderEntry).toBe('function');
    expect(typeof support.componentFolderOf).toBe('function');
    expect(typeof support.roleFolderSegment).toBe('function');
  });
});
