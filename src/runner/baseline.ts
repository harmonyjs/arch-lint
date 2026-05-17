/**
 * @fileoverview The `baseline` command group — manages the baseline file that
 * records pre-existing violations. `init` snapshots every current violation,
 * `diff` reports how the stored baseline drifts from the current run, and
 * `prune` drops baseline records that no longer reproduce. Each `run*` function
 * is process-pure: it returns the text to print and a `0` exit code, leaving
 * the actual printing and `process.exit` to the CLI layer. Failures surface as
 * thrown typed errors the CLI maps to exit codes 2..5.
 */
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import {
  diffBaseline,
  pruneBaseline,
  snapshotBaseline,
  writeBaseline,
} from '../baseline/index.js';
import type { BaselineFile } from '../baseline/types.js';
import { loadConfig } from '../config/load.js';
import { resolveConfig } from '../config/resolve-defaults.js';
import type { ResolvedConfig } from '../config/types.js';
import { ConfigError } from '../errors.js';
import { packageRoot } from '../paths.js';
import type { CheckResult } from '../rules/types.js';
import { type RunCheckOptions, resolveBaseline, runCheck } from './check.js';
/** Inputs shared by every baseline subcommand. */
export interface BaselineCommandOptions {
  /** Directory the run is rooted at — config discovery starts here. */
  readonly cwd: string;
  /** Explicit config path from `--config`, bypassing autodiscovery. */
  readonly configPath?: string;
}

/** Extra inputs for `baseline prune`. */
export interface BaselinePruneOptions extends BaselineCommandOptions {
  /** Skip the interactive confirmation prompt and write straight away. */
  readonly yes: boolean;
  /** Confirmation prompt; injected so tests can answer it deterministically. */
  readonly confirm: () => Promise<boolean>;
}

/** Result of a baseline subcommand: the text to print and the process exit code. */
export interface BaselineOutcome {
  /** Text the CLI prints to stdout. */
  readonly stdout: string;
  /** Process exit code — always 0; failures surface as thrown typed errors. */
  readonly exitCode: 0;
}

/** Resolves the configured baseline file to an absolute path. */
function baselinePath(config: ResolvedConfig): string {
  const file = config.baseline.file;
  return isAbsolute(file) ? file : resolve(config.project.cwd, file);
}

/** Reads the arch-lint package version that stamps every generated baseline file. */
async function generatorVersion(): Promise<string> {
  const text = await readFile(join(packageRoot(), 'package.json'), 'utf8');
  const pkg = JSON.parse(text) as { version?: unknown };
  return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
}

/**
 * Runs a full check and returns its `CheckResult`. `withBaseline` selects
 * whether diagnostics are classified against the configured baseline (`diff`,
 * `prune`) or treated as all-new (`init`).
 */
async function runFullCheck(
  opts: BaselineCommandOptions,
  withBaseline: boolean,
): Promise<CheckResult> {
  const runOptions: RunCheckOptions = {
    cwd: opts.cwd,
    mode: 'ci',
    noBaseline: !withBaseline,
    changedOnly: false,
    ...(opts.configPath !== undefined ? { configPath: opts.configPath } : {}),
  };
  const outcome = await runCheck(runOptions);
  return outcome.result;
}

/**
 * `baseline init` — runs a full, baseline-free check and writes every violation
 * to the baseline file. Idempotent: re-running on an unchanged project rewrites
 * the same content (records are sorted and deduplicated by the snapshot).
 */
export async function runBaselineInit(opts: BaselineCommandOptions): Promise<BaselineOutcome> {
  const config = resolveConfig(await loadConfig(opts.cwd, opts.configPath));
  const path = baselinePath(config);

  const result = await runFullCheck(opts, false);

  const file = snapshotBaseline(result.diagnostics, await generatorVersion());
  await writeBaseline(path, file);

  return {
    stdout: `Baseline written: ${file.records.length} record(s) → ${path}`,
    exitCode: 0,
  };
}

/**
 * `baseline diff` — read-only. Classifies the current run against the stored
 * baseline and reports which violations are new and which baseline records are
 * resolved. Writes nothing.
 */
export async function runBaselineDiff(opts: BaselineCommandOptions): Promise<BaselineOutcome> {
  const config = resolveConfig(await loadConfig(opts.cwd, opts.configPath));
  const path = baselinePath(config);

  const baseline = await resolveBaseline(config, { noBaseline: false });
  const result = await runFullCheck(opts, true);

  const diff = diffBaseline(baseline, result.diagnostics);
  const lines = [
    `Baseline diff (${path}):`,
    `  new:      ${diff.added.length}`,
    `  resolved: ${diff.resolved.length}`,
    ...diff.added.map((record) => `  + ${record.ruleId}  ${record.entity}`),
    ...diff.resolved.map((record) => `  - ${record.ruleId}  ${record.entity}`),
  ];

  return { stdout: lines.join('\n'), exitCode: 0 };
}

/**
 * `baseline prune` — runs a full, unfiltered check and drops baseline records
 * with no matching violation. Requires an existing baseline file. Unless `yes`
 * is set, asks `confirm()` before writing; a declined or no-op prune writes
 * nothing.
 */
export async function runBaselinePrune(opts: BaselinePruneOptions): Promise<BaselineOutcome> {
  const config = resolveConfig(await loadConfig(opts.cwd, opts.configPath));
  const path = baselinePath(config);

  const baseline = await resolveBaseline(config, { noBaseline: false });
  if (baseline === null) {
    throw new ConfigError('baseline prune requires an existing baseline file');
  }

  const result = await runFullCheck(opts, true);

  const pruned: BaselineFile = pruneBaseline(
    baseline,
    result.diagnostics,
    await generatorVersion(),
  );
  const removed = baseline.records.length - pruned.records.length;

  if (removed === 0) {
    return { stdout: 'Baseline is already clean — nothing to prune.', exitCode: 0 };
  }

  if (!opts.yes && !(await opts.confirm())) {
    return { stdout: 'Prune cancelled.', exitCode: 0 };
  }

  await writeBaseline(path, pruned);
  return { stdout: `Pruned ${removed} resolved record(s) → ${path}`, exitCode: 0 };
}
