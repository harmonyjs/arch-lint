/**
 * @fileoverview Tests for the typed error taxonomy that maps each class to a
 * fixed process exit code.
 */
import { describe, expect, it } from 'vitest';
import { ArchLintError, ConfigError, EngineError, GraphBuildError, IOError } from './errors.js';

describe('ArchLintError', () => {
  it('is an abstract base — every concrete error is an instance of it', () => {
    expect(new ConfigError('x')).toBeInstanceOf(ArchLintError);
    expect(new GraphBuildError('x')).toBeInstanceOf(ArchLintError);
    expect(new IOError('x')).toBeInstanceOf(ArchLintError);
    expect(new EngineError('x')).toBeInstanceOf(ArchLintError);
  });

  it('every concrete error is also a plain Error', () => {
    expect(new ConfigError('x')).toBeInstanceOf(Error);
    expect(new EngineError('x')).toBeInstanceOf(Error);
  });
});

describe('ConfigError', () => {
  it('has name ConfigError and message preserved', () => {
    const err = new ConfigError('bad config');
    expect(err.name).toBe('ConfigError');
    expect(err.message).toBe('bad config');
  });

  it('carries exitCode 2', () => {
    expect(new ConfigError('bad config').exitCode).toBe(2);
  });

  it('records an optional config path', () => {
    const err = new ConfigError('invalid value', { configPath: '/p/arch-lint.config.ts' });
    expect(err.configPath).toBe('/p/arch-lint.config.ts');
  });

  it('leaves configPath undefined when not provided', () => {
    expect(new ConfigError('no config').configPath).toBeUndefined();
  });

  it('propagates an underlying cause', () => {
    const cause = new Error('root');
    expect(new ConfigError('wrap', { cause }).cause).toBe(cause);
  });
});

describe('GraphBuildError', () => {
  it('has name GraphBuildError and carries exitCode 3', () => {
    const err = new GraphBuildError('x');
    expect(err.name).toBe('GraphBuildError');
    expect(err.exitCode).toBe(3);
  });

  it('propagates an underlying cause', () => {
    const cause = new Error('root');
    expect(new GraphBuildError('wrap', { cause }).cause).toBe(cause);
  });
});

describe('IOError', () => {
  it('has name IOError and carries exitCode 4', () => {
    const err = new IOError('x');
    expect(err.name).toBe('IOError');
    expect(err.exitCode).toBe(4);
  });

  it('propagates an underlying cause', () => {
    const cause = new Error('root');
    expect(new IOError('wrap', { cause }).cause).toBe(cause);
  });
});

describe('EngineError', () => {
  it('has name EngineError and message preserved', () => {
    const err = new EngineError('boom');
    expect(err.name).toBe('EngineError');
    expect(err.message).toBe('boom');
  });

  it('carries exitCode 5', () => {
    expect(new EngineError('x').exitCode).toBe(5);
  });

  it('is identifiable via instanceof', () => {
    const err: unknown = new EngineError('x');
    expect(err instanceof EngineError).toBe(true);
  });
});
