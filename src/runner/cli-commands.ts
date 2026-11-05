/**
 * @fileoverview Per-command registration plumbing for the CLI router. Each
 * `register*Command` helper attaches one command (with its options and
 * `.action`) to the commander program; `buildProgram` in `cli.ts` wires them
 * together. Keeping the registration helpers here lets `cli.ts` stay a focused
 * argv-parse-and-dispatch story.
 */
import { createInterface } from 'node:readline/promises';
import chokidar from 'chokidar';
import type { Command } from 'commander';
import { ConfigError } from '#foundation/errors/index.js';
import { isDependencyPath } from '#foundation/file-classification/index.js';
import type { Logger } from '#foundation/logger/index.js';
import { runBaselineDiff, runBaselineInit, runBaselinePrune } from './baseline/command.js';
import { runCheckCommand } from './check.js';
import { runExplain } from './explain.js';
import { runGraphCommand } from './graph.js';
import { runWatch } from './watch.js';

/** The global options every command inherits, as parsed by commander. */
export interface GlobalOptions {
  /** Explicit config path from `--config`, bypassing autodiscovery. */
  readonly config?: string;
  /** Raw comma-separated rule ids from `--rules`, before normalisation. */
  readonly rules?: string;
  /** Git base ref from `--base` for changed-only runs. */
  readonly base?: string;
  /** False when `--no-baseline` was passed; commander defaults it to true. */
  readonly baseline?: boolean;
  /** True when `--debug` was passed. */
  readonly debug?: boolean;
}

/** The `check` command's merged global + local options, as parsed by commander. */
type CheckOptions = GlobalOptions & {
  changedOnly?: boolean;
  telemetry?: boolean;
  explain?: boolean;
};

/**
 * Normalises the raw `--rules` value into a rule-id list. Splits on commas,
 * trims each id, and drops empties; an undefined input or a list with no
 * non-empty ids yields `undefined` so the runner falls back to every rule.
 */
export function parseRuleList(value: string | undefined): readonly string[] | undefined {
  if (value === undefined) return undefined;
  const ids = value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return ids.length > 0 ? ids : undefined;
}

/** True when `--no-baseline` was passed (commander stores it as `baseline: false`). */
function noBaselineFrom(globals: GlobalOptions): boolean {
  return globals.baseline === false;
}

/**
 * Prompts the user to confirm a destructive `baseline prune`. Returns `false`
 * immediately when stdin is not a TTY — a non-interactive invocation never
 * silently confirms. Otherwise reads a single y/N answer.
 */
async function confirmPrune(): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('Prune resolved baseline records? [y/N] ');
    return answer.trim().toLowerCase().startsWith('y');
  } finally {
    rl.close();
  }
}

/** Routes each diagnostic line through the logger as a warning. */
function writeStderr(logger: Logger, lines: readonly string[]): void {
  for (const line of lines) {
    logger.warn(line);
  }
}

/** ANSI escape sequence that clears the screen, its scrollback, and homes the cursor. */
const CLEAR_SCREEN = '\x1B[2J\x1B[3J\x1B[H';

/** Registers the `check` command — the architecture run, optionally changed-only. */
export function registerCheckCommand(program: Command, logger: Logger): void {
  program
    .command('check')
    .description('run the architecture check')
    .option('--changed-only', 'restrict the run to files changed against the git base')
    .option('--telemetry', 'record per-rule timings and print a slowest-first summary')
    .option('--explain', 'print the full structural analysis for every enriched finding')
    .action(async (_local: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals() as CheckOptions;
      const ruleFilter = parseRuleList(globals.rules);
      const outcome = await runCheckCommand({
        cwd: process.cwd(),
        changedOnly: globals.changedOnly === true,
        telemetry: globals.telemetry === true,
        explain: globals.explain === true,
        noBaseline: noBaselineFrom(globals),
        logger,
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
        ...(globals.base !== undefined ? { base: globals.base } : {}),
        ...(ruleFilter !== undefined ? { ruleFilter } : {}),
      });
      process.stdout.write(`${outcome.stdout}\n`);
      writeStderr(logger, outcome.stderr);
      process.exitCode = outcome.exitCode;
    });
}

/** Registers the `watch` command — re-runs the check on every file change. */
export function registerWatchCommand(program: Command, logger: Logger): void {
  program
    .command('watch')
    .description('watch the project and re-run the check on every change')
    .action(async (_local: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals() as GlobalOptions;
      const session = await runWatch({
        cwd: process.cwd(),
        logger,
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
        createWatcher: (sourceRoot) =>
          chokidar.watch(sourceRoot, { ignoreInitial: true, ignored: isDependencyPath }),
        print: (text) => void process.stdout.write(`${text}\n`),
        clearScreen: () => void process.stdout.write(CLEAR_SCREEN),
      });
      process.once('SIGINT', () => void session.close().then(() => process.exit(0)));
    });
}

/** Registers the `baseline` command and its `init`/`diff`/`prune` subcommands. */
export function registerBaselineCommand(program: Command, logger: Logger): void {
  const baseline = program
    .command('baseline')
    .description('manage the baseline file of pre-existing violations');

  baseline
    .command('init')
    .description('snapshot every current violation into the baseline file')
    .action(async (_local: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals() as GlobalOptions;
      const outcome = await runBaselineInit({
        cwd: process.cwd(),
        logger,
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
      });
      process.stdout.write(`${outcome.stdout}\n`);
      process.exitCode = outcome.exitCode;
    });

  baseline
    .command('diff')
    .description('report how the stored baseline drifts from the current run')
    .action(async (_local: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals() as GlobalOptions;
      const outcome = await runBaselineDiff({
        cwd: process.cwd(),
        logger,
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
      });
      process.stdout.write(`${outcome.stdout}\n`);
      process.exitCode = outcome.exitCode;
    });

  baseline
    .command('prune')
    .description('drop baseline records that no longer reproduce')
    .option('--yes', 'skip the confirmation prompt and write straight away')
    .action(async (_local: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals() as GlobalOptions & { yes?: boolean };
      if (parseRuleList(globals.rules) !== undefined) {
        throw new ConfigError('baseline prune is incompatible with --rules');
      }
      const outcome = await runBaselinePrune({
        cwd: process.cwd(),
        yes: globals.yes === true,
        confirm: confirmPrune,
        logger,
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
      });
      process.stdout.write(`${outcome.stdout}\n`);
      process.exitCode = outcome.exitCode;
    });
}

/** Registers the `explain` command — prints a single rule's documentation. */
export function registerExplainCommand(program: Command): void {
  program
    .command('explain')
    .description("print a rule's documentation")
    .argument('<rule-id>', 'the rule id to explain')
    .action(async (ruleId: string) => {
      const outcome = await runExplain(ruleId);
      process.stdout.write(`${outcome.stdout}\n`);
      process.exitCode = outcome.exitCode;
    });
}

/** Registers the `graph` command — renders the dependency graph as a Mermaid document. */
export function registerGraphCommand(program: Command, logger: Logger): void {
  program
    .command('graph')
    .description('render the dependency graph as a layered Mermaid document')
    .option('--out <path>', 'write the document to a file instead of stdout')
    .option('--subsystem <name>', 'limit the document to one subsystem')
    .action(async (_local: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals() as GlobalOptions & { out?: string; subsystem?: string };
      const outcome = await runGraphCommand({
        cwd: process.cwd(),
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
        ...(globals.out !== undefined ? { out: globals.out } : {}),
        ...(globals.subsystem !== undefined ? { subsystem: globals.subsystem } : {}),
      });
      if (outcome.stdout !== '') process.stdout.write(`${outcome.stdout}\n`);
      writeStderr(logger, outcome.stderr);
      process.exitCode = outcome.exitCode;
    });
}
