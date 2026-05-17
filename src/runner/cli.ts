/**
 * @fileoverview The CLI router — the single place that parses argv and
 * dispatches to a runner operation (check, baseline, explain, watch). This
 * is where the complete command set can be read in one file.
 */
import { createInterface } from 'node:readline/promises';
import chokidar from 'chokidar';
import { Command } from 'commander';
import { ArchLintError, ConfigError } from '../errors/index.js';
import { runBaselineDiff, runBaselineInit, runBaselinePrune } from './baseline.js';
import { runCheckCommand } from './check.js';
import { runExplain } from './explain.js';
import { runWatch } from './watch.js';

/** The global options every command inherits, as parsed by commander. */
interface GlobalOptions {
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

/** Writes each line of a stderr stream as its own line. */
function writeStderr(lines: readonly string[]): void {
  for (const line of lines) {
    process.stderr.write(`${line}\n`);
  }
}

/** ANSI escape sequence that clears the screen, its scrollback, and homes the cursor. */
const CLEAR_SCREEN = '\x1B[2J\x1B[3J\x1B[H';

/**
 * Builds the arch-lint commander program: the named root with its five global
 * options and the four commands. Each command's `.action` reads the merged
 * global+local options via `optsWithGlobals()`, delegates to its adapter, and
 * applies the resulting stdout/stderr/exit code.
 */
export function buildProgram(): Command {
  const program = new Command();
  program
    .name('arch-lint')
    .description('Static architecture linter for TypeScript projects')
    .option('--config <path>', 'path to the arch-lint config file')
    .option('--rules <ids>', 'comma-separated rule ids to run')
    .option('--base <ref>', 'git base ref for changed-only runs')
    .option('--no-baseline', 'ignore the baseline file — treat every violation as new')
    .option('--debug', 'enable verbose diagnostic output');

  program
    .command('check')
    .description('run the architecture check')
    .option('--changed-only', 'restrict the run to files changed against the git base')
    .action(async (_local: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals() as GlobalOptions & { changedOnly?: boolean };
      const ruleFilter = parseRuleList(globals.rules);
      const outcome = await runCheckCommand({
        cwd: process.cwd(),
        changedOnly: globals.changedOnly === true,
        noBaseline: noBaselineFrom(globals),
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
        ...(globals.base !== undefined ? { base: globals.base } : {}),
        ...(ruleFilter !== undefined ? { ruleFilter } : {}),
      });
      process.stdout.write(`${outcome.stdout}\n`);
      writeStderr(outcome.stderr);
      process.exitCode = outcome.exitCode;
    });

  program
    .command('watch')
    .description('watch the project and re-run the check on every change')
    .action(async (_local: unknown, cmd: Command) => {
      const globals = cmd.optsWithGlobals() as GlobalOptions;
      const session = await runWatch({
        cwd: process.cwd(),
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
        createWatcher: (sourceRoot) => chokidar.watch(sourceRoot, { ignoreInitial: true }),
        print: (text) => {
          process.stdout.write(`${text}\n`);
        },
        clearScreen: () => {
          process.stdout.write(CLEAR_SCREEN);
        },
      });
      process.once('SIGINT', () => {
        void session.close().then(() => process.exit(0));
      });
    });

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
        ...(globals.config !== undefined ? { configPath: globals.config } : {}),
      });
      process.stdout.write(`${outcome.stdout}\n`);
      process.exitCode = outcome.exitCode;
    });

  program
    .command('explain')
    .description("print a rule's documentation")
    .argument('<rule-id>', 'the rule id to explain')
    .action(async (ruleId: string) => {
      const outcome = await runExplain(ruleId);
      process.stdout.write(`${outcome.stdout}\n`);
      process.exitCode = outcome.exitCode;
    });

  return program;
}

/**
 * Parses `argv` and runs the matching command. A thrown `ArchLintError` is
 * reported on stderr and mapped to its declared exit code; any other failure
 * is an unexpected internal fault and maps to exit code 5.
 */
export async function runCli(argv: readonly string[]): Promise<void> {
  try {
    await buildProgram().parseAsync([...argv]);
  } catch (err) {
    if (err instanceof ArchLintError) {
      process.stderr.write(`error: ${err.message}\n`);
      process.exitCode = err.exitCode;
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: ${message}\n`);
    process.exitCode = 5;
  }
}
