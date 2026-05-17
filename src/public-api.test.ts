/**
 * @fileoverview Verifies the public API surface: the four entry functions are
 * exported and the internal Resolution helper is not.
 */
import { describe, expect, it } from 'vitest';
import * as api from './public-api.js';

describe('public-api', () => {
  it('exports the four public functions', () => {
    expect(typeof api.defineConfig).toBe('function');
    expect(typeof api.resolveConfig).toBe('function');
    expect(typeof api.buildGraph).toBe('function');
    expect(typeof api.check).toBe('function');
  });

  it('defineConfig returns its argument unchanged', () => {
    const cfg = { project: { tsconfig: './tsconfig.json' } };
    expect(api.defineConfig(cfg)).toBe(cfg);
  });

  it('does not export the internal Resolution helper', () => {
    expect('Resolution' in api).toBe(false);
  });
});
