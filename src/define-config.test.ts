import { describe, it, expect } from 'vitest';
import { defineConfig } from './define-config.js';
import type { Config } from './types.js';

describe('defineConfig', () => {
  it('returns the config object unchanged (identity)', () => {
    const input: Config = { project: { tsconfig: './tsconfig.json' } };
    const result = defineConfig(input);
    expect(result).toBe(input);
  });

  it('preserves literal inference of the argument type', () => {
    const result = defineConfig({
      project: { tsconfig: './tsconfig.json' },
      packs: ['layers', 'meta'],
    });
    // Per D1, defineConfig is generic and does NOT widen the argument to
    // Config: packs keeps element-literal inference ('layers' | 'meta'),
    // not the wide readonly Pack[]. Assigning to that exact array type
    // type-checks only when no widening happened.
    const packs: ('layers' | 'meta')[] = result.packs;
    expect(packs).toEqual(['layers', 'meta']);
  });

  it('keeps a const-asserted argument as a readonly tuple', () => {
    const result = defineConfig({
      project: { tsconfig: './tsconfig.json' },
      packs: ['layers', 'meta'],
    } as const);
    const packs: readonly ['layers', 'meta'] = result.packs;
    expect(packs).toEqual(['layers', 'meta']);
  });
});
