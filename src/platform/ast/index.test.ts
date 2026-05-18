/**
 * @fileoverview Tests for the AST helper barrel.
 */
import { describe, expect, it } from 'vitest';
import * as support from './index.js';

describe('ast barrel', () => {
  it('re-exports every public helper', () => {
    expect(typeof support.assertGraphProjectConsistent).toBe('function');
    expect(typeof support.sourceFileFor).toBe('function');
    expect(typeof support.fileNodeIds).toBe('function');
    expect(typeof support.importsOf).toBe('function');
    expect(typeof support.isBarrelFile).toBe('function');
    expect(typeof support.isComponentFolderEntry).toBe('function');
    expect(typeof support.componentFolderOf).toBe('function');
    expect(typeof support.roleFolderSegment).toBe('function');
  });
});
