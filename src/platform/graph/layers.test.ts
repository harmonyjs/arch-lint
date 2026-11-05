/**
 * @fileoverview Tests for layerOf — longest segment-wise prefix layer match.
 * Layer keys are written relative to the sourceRoot, the convention `units`
 * keys also follow; the fixtures here mirror that production shape.
 */
import { describe, expect, it } from 'vitest';
import type { LayersConfig } from '#foundation/config/types.js';
import { assertLayersReachFiles, layerOf } from './layers.js';

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

describe('assertLayersReachFiles', () => {
  const census = ['src/app/main.ts', 'src/domain/greet.ts'];

  it('accepts layers whose every key holds a file and every canImport names a layer', () => {
    const layers: LayersConfig = {
      app: { canImport: ['domain'] },
      domain: { canImport: [] },
    };
    expect(() => assertLayersReachFiles(layers, 'src', census)).not.toThrow();
  });

  it('rejects a key that holds no file, naming the sourceRoot it is relative to', () => {
    const layers: LayersConfig = {
      'src/app': { canImport: [] },
      domain: { canImport: [] },
    };
    expect(() => assertLayersReachFiles(layers, 'src', census)).toThrow(
      /"src\/app".*no file.*sourceRoot "src"/,
    );
  });

  it('rejects a canImport entry that is not a declared layer', () => {
    const layers: LayersConfig = { app: { canImport: ['domian'] }, domain: { canImport: [] } };
    expect(() => assertLayersReachFiles(layers, 'src', census)).toThrow(/"domian"/);
  });

  it('accepts a parent key whose files all sit under more specific keys', () => {
    const layers: LayersConfig = { app: { canImport: [] }, 'app/main.ts': { canImport: [] } };
    expect(() =>
      assertLayersReachFiles({ ...layers, domain: { canImport: [] } }, 'src', census),
    ).not.toThrow();
  });
});
