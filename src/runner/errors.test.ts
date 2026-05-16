/**
 * @fileoverview Tests for the typed error hierarchy that maps to exit codes.
 */
import { describe, expect, it } from 'vitest';
import { ArchLintError, ConfigError, EngineError, GraphBuildError, IOError } from './errors.js';

describe('typed errors', () => {
  it('ConfigError carries exit code 2', () => {
    const e = new ConfigError('bad config');
    expect(e).toBeInstanceOf(ArchLintError);
    expect(e.exitCode).toBe(2);
    expect(e.message).toBe('bad config');
    expect(e.name).toBe('ConfigError');
  });

  it('GraphBuildError carries exit code 3', () => {
    expect(new GraphBuildError('x').exitCode).toBe(3);
  });

  it('IOError carries exit code 4', () => {
    expect(new IOError('x').exitCode).toBe(4);
  });

  it('EngineError carries exit code 5', () => {
    expect(new EngineError('x').exitCode).toBe(5);
  });

  it('preserves the underlying cause', () => {
    const cause = new Error('root');
    expect(new IOError('wrap', { cause }).cause).toBe(cause);
  });
});
