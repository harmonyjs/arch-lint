import { describe, it, expect } from 'vitest';
import * as api from './public-api.js';

describe('public-api', () => {
  it('exports defineConfig as a function', () => {
    expect(typeof api.defineConfig).toBe('function');
  });

  it('exports resolveConfig as a function', () => {
    expect(typeof api.resolveConfig).toBe('function');
  });

  it('defineConfig + resolveConfig produce a resolved config end-to-end', () => {
    const cfg = api.defineConfig({ project: { tsconfig: './tsconfig.json' } });
    const resolved = api.resolveConfig(cfg);
    expect(resolved.project.sourceRoot).toBe('src');
    expect(resolved.packs).toEqual([
      'layers',
      'barrels',
      'placement',
      'meta',
      'perfile',
      'hygiene',
    ]);
  });

  it('does not export the internal Resolution type as a runtime value', () => {
    expect((api as Record<string, unknown>)['Resolution']).toBeUndefined();
  });
});
