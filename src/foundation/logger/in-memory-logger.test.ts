/**
 * @fileoverview Tests for InMemoryLogger — records messages for assertion.
 */
import { describe, expect, it } from 'vitest';
import { InMemoryLogger } from './in-memory-logger.js';

describe('InMemoryLogger', () => {
  it('records every message with its level, in order', () => {
    const logger = new InMemoryLogger();
    logger.warn('first');
    logger.error('second');
    expect(logger.entries).toEqual([
      { level: 'warn', message: 'first' },
      { level: 'error', message: 'second' },
    ]);
  });
});
