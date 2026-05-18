/**
 * @fileoverview Tests for ConsoleLogger — every level writes a line to stderr.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger } from './console-logger.js';

describe('ConsoleLogger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes each level to process.stderr with a trailing newline', () => {
    const written: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    });
    const logger = new ConsoleLogger();
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.debug('d');
    expect(written).toEqual(['i\n', 'w\n', 'e\n', 'd\n']);
  });
});
