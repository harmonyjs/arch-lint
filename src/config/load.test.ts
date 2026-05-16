import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { loadConfig } from './load.js';
import { ConfigError } from '../errors.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '__tests__', 'fixtures');

describe('loadConfig — file loaders', () => {
  it('loads a .ts config via jiti', async () => {
    const cfg = await loadConfig(path.join(fixtures, 'with-ts-config'));
    expect(cfg.project.tsconfig).toBe('./tsconfig.json');
  });

  it('loads an .mjs config', async () => {
    const cfg = await loadConfig(path.join(fixtures, 'with-mjs-config'));
    expect(cfg.project.tsconfig).toBe('./tsconfig.json');
  });

  it('loads a .js config via native import', async () => {
    const cfg = await loadConfig(path.join(fixtures, 'load-js'));
    expect(cfg.packs).toEqual(['layers']);
  });
});

describe('loadConfig — package.json field', () => {
  it('loads the arch-lint field from package.json', async () => {
    const cfg = await loadConfig(path.join(fixtures, 'pkg-field'));
    expect(cfg.project.tsconfig).toBe('./tsconfig.json');
  });
});

describe('loadConfig — zero-config path', () => {
  it('synthesizes a config when only tsconfig.json exists', async () => {
    const cfg = await loadConfig(path.join(fixtures, 'zero-config'));
    expect(cfg.project.tsconfig).toBe('./tsconfig.json');
  });
});

describe('loadConfig — error paths (exit 2)', () => {
  it('throws ConfigError when the config module has no default export', async () => {
    await expect(loadConfig(path.join(fixtures, 'no-default-export'))).rejects.toThrow(ConfigError);
  });

  it('throws ConfigError when the loaded config is invalid', async () => {
    await expect(loadConfig(path.join(fixtures, 'invalid-config'))).rejects.toThrow(ConfigError);
  });

  it('throws ConfigError for an unsupported explicit format', async () => {
    const explicit = path.join(fixtures, 'bad-format', 'arch-lint.config.json');
    await expect(loadConfig(path.join(fixtures, 'empty-dir'), explicit)).rejects.toThrow(
      ConfigError,
    );
  });

  it('throws ConfigError when no source exists', async () => {
    await expect(loadConfig(path.join(fixtures, 'empty-dir'))).rejects.toThrow(ConfigError);
  });

  it('throws ConfigError when an explicit package.json is malformed', async () => {
    const explicit = path.join(fixtures, 'malformed-pkg', 'package.json');
    await expect(loadConfig(path.join(fixtures, 'empty-dir'), explicit)).rejects.toThrow(
      ConfigError,
    );
  });

  it('throws ConfigError when an explicit package.json has no arch-lint field', async () => {
    const explicit = path.join(fixtures, 'pkg-no-field', 'package.json');
    await expect(loadConfig(path.join(fixtures, 'empty-dir'), explicit)).rejects.toThrow(
      ConfigError,
    );
  });
});
