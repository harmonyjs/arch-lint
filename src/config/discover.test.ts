import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError } from '../errors.js';
import { discoverConfig } from './discover.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '__tests__', 'fixtures');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('discoverConfig — explicit path', () => {
  it('returns an explicit-path descriptor for a supported extension', () => {
    const explicit = path.join(fixtures, 'with-mjs-config', 'arch-lint.config.mjs');
    const result = discoverConfig(path.join(fixtures, 'empty-dir'), explicit);
    expect(result).toEqual({ kind: 'file', path: explicit });
  });

  it('returns a package-field descriptor for an explicit package.json path', () => {
    const explicit = path.join(fixtures, 'pkg-field', 'package.json');
    const result = discoverConfig(path.join(fixtures, 'empty-dir'), explicit);
    expect(result).toEqual({ kind: 'package-field', path: explicit });
  });

  it('throws ConfigError for an unsupported explicit format', () => {
    const explicit = path.join(fixtures, 'bad-format', 'arch-lint.config.json');
    expect(() => discoverConfig(path.join(fixtures, 'empty-dir'), explicit)).toThrow(ConfigError);
  });

  it('the unsupported-format ConfigError mentions the format', () => {
    const explicit = path.join(fixtures, 'bad-format', 'arch-lint.config.json');
    let caught: unknown;
    try {
      discoverConfig(path.join(fixtures, 'empty-dir'), explicit);
    } catch (err) {
      caught = err;
    }
    expect((caught as ConfigError).message).toContain('unsupported config format');
  });
});

describe('discoverConfig — autodiscovery', () => {
  it('finds arch-lint.config.ts in cwd', () => {
    const dir = path.join(fixtures, 'with-ts-config');
    const result = discoverConfig(dir);
    expect(result).toEqual({ kind: 'file', path: path.join(dir, 'arch-lint.config.ts') });
  });

  it('finds arch-lint.config.mjs in cwd', () => {
    const dir = path.join(fixtures, 'with-mjs-config');
    const result = discoverConfig(dir);
    expect(result).toEqual({ kind: 'file', path: path.join(dir, 'arch-lint.config.mjs') });
  });

  it('finds the arch-lint field in package.json', () => {
    const dir = path.join(fixtures, 'pkg-field');
    const result = discoverConfig(dir);
    expect(result).toEqual({
      kind: 'package-field',
      path: path.join(dir, 'package.json'),
    });
  });

  it('ignores a package.json without an arch-lint field', () => {
    const dir = path.join(fixtures, 'pkg-no-field');
    const result = discoverConfig(dir);
    expect(result).toEqual({ kind: 'defaults' });
  });

  it('ignores a malformed package.json and falls back to defaults', () => {
    const dir = path.join(fixtures, 'malformed-pkg');
    const result = discoverConfig(dir);
    expect(result).toEqual({ kind: 'defaults' });
  });

  it('falls back to defaults when only tsconfig.json exists', () => {
    const dir = path.join(fixtures, 'zero-config');
    const result = discoverConfig(dir);
    expect(result).toEqual({ kind: 'defaults' });
  });
});

describe('discoverConfig — precedence and warnings', () => {
  it('prefers arch-lint.config.ts over .mjs and warns about multiple sources', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const dir = path.join(fixtures, 'two-sources');
    const result = discoverConfig(dir);
    expect(result).toEqual({ kind: 'file', path: path.join(dir, 'arch-lint.config.ts') });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('multiple');
  });

  it('does not warn when a single source is found', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    discoverConfig(path.join(fixtures, 'with-ts-config'));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('discoverConfig — no source', () => {
  it('throws ConfigError when nothing is found and tsconfig.json is absent', () => {
    expect(() => discoverConfig(path.join(fixtures, 'empty-dir'))).toThrow(ConfigError);
  });

  it('the no-config ConfigError says config was not found', () => {
    let caught: unknown;
    try {
      discoverConfig(path.join(fixtures, 'empty-dir'));
    } catch (err) {
      caught = err;
    }
    expect((caught as ConfigError).message).toContain('not found');
  });
});
