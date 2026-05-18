/**
 * @fileoverview Tests for the `check`-run logging helpers — `warnIfMetricsInert`
 * warns when the metrics pack is enabled with no `units` declared.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { InMemoryLogger } from '#foundation/logger/index.js';
import { warnIfMetricsInert } from './check-logging.js';

describe('warnIfMetricsInert', () => {
  function cfg(over: Partial<ResolvedConfig>): ResolvedConfig {
    return { packs: [], units: {}, ...over } as ResolvedConfig;
  }

  it('warns when the metrics pack is enabled but no units are declared', () => {
    const logger = new InMemoryLogger();
    warnIfMetricsInert(cfg({ packs: ['metrics'], units: {} }), logger);
    expect(
      logger.entries.some(
        (e) => e.level === 'warn' && e.message.includes('metrics pack is enabled but no `units`'),
      ),
    ).toBe(true);
  });

  it('is silent when units are declared', () => {
    const logger = new InMemoryLogger();
    warnIfMetricsInert(cfg({ packs: ['metrics'], units: { graph: 'graph/**' } }), logger);
    expect(logger.entries).toEqual([]);
  });

  it('is silent when the metrics pack is not enabled', () => {
    const logger = new InMemoryLogger();
    warnIfMetricsInert(cfg({ packs: ['layers'], units: {} }), logger);
    expect(logger.entries).toEqual([]);
  });
});
