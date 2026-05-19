/**
 * @fileoverview The CLI router — the single place that parses argv and
 * dispatches to a runner operation (check, baseline, explain, watch, graph).
 * The per-command registration plumbing lives in `cli-commands.ts`; this file
 * assembles the program from those helpers and runs it.
 */
import { Command } from 'commander';
import { ArchLintError } from '#foundation/errors/index.js';
import type { Logger } from '#foundation/logger/index.js';
import { ConsoleLogger } from '#foundation/logger/index.js';
import {
  parseRuleList,
  registerBaselineCommand,
  registerCheckCommand,
  registerExplainCommand,
  registerGraphCommand,
  registerWatchCommand,
} from './cli-commands.js';

export { parseRuleList };

/**
 * Builds the arch-lint commander program: the named root with its five global
 * options and the five commands. Each command's `.action` reads the merged
 * global+local options via `optsWithGlobals()`, delegates to its adapter, and
 * applies the resulting stdout/stderr/exit code. Diagnostic output routes
 * through `logger`, which defaults to a ConsoleLogger.
 */
export function buildProgram(logger: Logger = new ConsoleLogger()): Command {
  const program = new Command();
  program
    .name('arch-lint')
    .description('Static architecture linter for TypeScript projects')
    .option('--config <path>', 'path to the arch-lint config file')
    .option('--rules <ids>', 'comma-separated rule ids to run')
    .option('--base <ref>', 'git base ref for changed-only runs')
    .option('--no-baseline', 'ignore the baseline file — treat every violation as new')
    .option('--debug', 'enable verbose diagnostic output');

  registerCheckCommand(program, logger);
  registerWatchCommand(program, logger);
  registerBaselineCommand(program, logger);
  registerExplainCommand(program);
  registerGraphCommand(program, logger);

  return program;
}

/**
 * Parses `argv` and runs the matching command. A thrown `ArchLintError` is
 * reported on stderr and mapped to its declared exit code; any other failure
 * is an unexpected internal fault and maps to exit code 5.
 */
export async function runCli(argv: readonly string[]): Promise<void> {
  const logger = new ConsoleLogger();
  try {
    await buildProgram(logger).parseAsync([...argv]);
  } catch (err) {
    if (err instanceof ArchLintError) {
      logger.error(`error: ${err.message}`);
      process.exitCode = err.exitCode;
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`error: ${message}`);
    process.exitCode = 5;
  }
}
