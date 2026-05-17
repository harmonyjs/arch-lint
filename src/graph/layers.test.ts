/**
 * @fileoverview Tests for layerOf — longest segment-wise prefix layer match.
 */
import { describe, expect, it } from 'vitest';
import type { LayersConfig } from '#config/types.js';
import { layerOf } from './layers.js';

describe('layerOf', () => {
  const layers: LayersConfig = {
    'src/App': { canImport: [] },
    'src/api': { canImport: [] },
    'src/main.tsx': { canImport: [] },
  };

  it('matches a segment-wise prefix', () => {
    expect(layerOf('src/App/Header', layers)).toBe('src/App');
  });

  it('does not match a partial segment', () => {
    expect(layerOf('src/Application/X', layers)).toBe(null);
  });

  it('matches an exact file-path layer key', () => {
    expect(layerOf('src/main.tsx', layers)).toBe('src/main.tsx');
  });

  it('returns null when no key matches', () => {
    expect(layerOf('src/lib/util', layers)).toBe(null);
  });

  it('returns null for an empty layers map', () => {
    expect(layerOf('src/App/Header', {})).toBe(null);
  });

  it('picks the longest (most specific) matching layer key', () => {
    const nested: LayersConfig = {
      'src/App': { canImport: [] },
      'src/App/Header': { canImport: [] },
    };
    expect(layerOf('src/App/Header/Title', nested)).toBe('src/App/Header');
  });
});
