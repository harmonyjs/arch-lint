import { describe, expect, it } from 'vitest';
import { ConfigError, EngineError } from './errors.js';

describe('ConfigError', () => {
  it('is an Error subclass with name ConfigError', () => {
    const err = new ConfigError('bad config');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ConfigError');
    expect(err.message).toBe('bad config');
  });

  it('carries exitCode 2', () => {
    const err = new ConfigError('bad config');
    expect(err.exitCode).toBe(2);
  });

  it('records an optional config path', () => {
    const err = new ConfigError('invalid value', { configPath: '/p/arch-lint.config.ts' });
    expect(err.configPath).toBe('/p/arch-lint.config.ts');
  });

  it('leaves configPath undefined when not provided', () => {
    const err = new ConfigError('no config');
    expect(err.configPath).toBeUndefined();
  });
});

describe('EngineError', () => {
  it('is an Error subclass with name EngineError', () => {
    const err = new EngineError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('EngineError');
    expect(err.message).toBe('boom');
  });

  it('is identifiable via instanceof', () => {
    const err: unknown = new EngineError('x');
    expect(err instanceof EngineError).toBe(true);
  });

  it('carries exitCode 5 (D8 error taxonomy)', () => {
    expect(new EngineError('x').exitCode).toBe(5);
  });
});
