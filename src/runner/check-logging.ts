/**
 * @fileoverview Logging helpers for a `check` run: the pre-run config-health
 * warning `warnIfMetricsInert` and the post-run per-rule timing summary
 * `logTelemetrySummary`. Both are pure side-effect-on-logger helpers split
 * out of the `check` orchestrator to keep that file focused on orchestration.
 */
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Logger, RecordingTelemetry } from '#foundation/logger/index.js';

/**
 * Emits a one-line warning when the metrics pack is enabled but no `units` are
 * declared — every metrics rule is inert in that state (the unit of measurement
 * is declared, never positional).
 */
export function warnIfMetricsInert(config: ResolvedConfig, logger: Logger): void {
  if (config.packs.includes('metrics') && Object.keys(config.units).length === 0) {
    logger.warn(
      'metrics pack is enabled but no `units` are declared — metrics rules will not run; declare `units` to enable them',
    );
  }
}

/**
 * Logs a per-rule timing summary through `logger`, one `info` line per rule,
 * sorted slowest-first. Durations are reported in milliseconds.
 */
export function logTelemetrySummary(logger: Logger, telemetry: RecordingTelemetry): void {
  const rows = [...telemetry.timings.entries()].sort(
    ([idA, a], [idB, b]) => b - a || idA.localeCompare(idB),
  );
  logger.info('telemetry — per-rule timings (slowest first):');
  for (const [ruleId, ms] of rows) {
    logger.info(`  ${ruleId}: ${ms.toFixed(2)}ms`);
  }
}
