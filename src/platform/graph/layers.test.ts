/**
 * @fileoverview Tests for layerOf — longest segment-wise prefix layer match.
 * Layer keys are written relative to the sourceRoot, the convention `units`
 * keys also follow; the fixtures here mirror that production shape.
 */
import { describe, expect, it } from 'vitest';
import type { LayersConfig } from '#foundation/config/types.js';
import { layerOf } from './layers.js';

describe('layerOf', () => {
  const layers: LayersConfig = {
    App: { canImport: [] },
    api: { canImport: [] },
    'main.tsx': { canImport: [] },
  };

  it('matches a segment-wise prefix', () => {
    expect(layerOf('src/App/Header', layers, 'src')).toBe('App');
  });

  it('does not match a partial segment', () => {
    expect(layerOf('src/Application/X', layers, 'src')).toBe(null);
  });

  it('matches an exact file-path layer key', () => {
    expect(layerOf('src/main.tsx', layers, 'src')).toBe('main.tsx');
  });

  it('returns null when no key matches', () => {
    expect(layerOf('src/lib/util', layers, 'src')).toBe(null);
  });

  it('returns null for an empty layers map', () => {
    expect(layerOf('src/App/Header', {}, 'src')).toBe(null);
  });

  it('picks the longest (most specific) matching layer key', () => {
    const nested: LayersConfig = {
      App: { canImport: [] },
      'App/Header': { canImport: [] },
    };
    expect(layerOf('src/App/Header/Title', nested, 'src')).toBe('App/Header');
  });

  it('matches an id that already lacks the sourceRoot prefix', () => {
    expect(layerOf('App/Header', layers, 'src')).toBe('App');
  });

  it('honours a non-default sourceRoot', () => {
    expect(layerOf('lib/App/Header', layers, 'lib')).toBe('App');
  });
});
