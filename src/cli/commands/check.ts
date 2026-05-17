/**
 * @fileoverview The `check` command adapter — the thin seam between the
 * commander program and the runner. It translates CLI flags into a
 * `RunCheckOptions`, runs the check, and projects the outcome onto a
 * process-pure shape (`stdout`, `stderr`, `exitCode`). It performs no I/O of
 * its own beyond delegating to `runCheck`.
 */
import { type RunCheckOptions, runCheck } from '../../runner/index.js';

/** CLI flags that steer a `check` run, already parsed by the commander program. */
export interface CheckCommandFlags {
  /** Directory the run is rooted at — config discovery and git both start here. */
  readonly cwd: string;
  /** Explicit config path from `--config`, bypassing autodiscovery. */
  readonly configPath?: string;
  /** Narrow the run to files changed against a git base (`--changed-only`). */
  readonly changedOnly: boolean;
  /** Skip the baseline entirely — every diagnostic counts as new. */
  readonly noBaseline: boolean;
  /** Git base ref for `changedOnly`; absent means diff against HEAD. */
  readonly base?: string;
  /** Restrict the run to these rule ids; absent runs every active rule. */
  readonly ruleFilter?: readonly string[];
}

/**
 * The process-pure result of a `check` run: the report to print, the warnings
 * to surface on stderr, and the verdict exit code. The exit code is `0 | 1` —
 * `runCheck` only ever returns a verdict code; the non-verdict codes 2..5 are
 * produced by `runCli`'s error catch, never here.
 */
export interface CheckCommandOutcome {
  /** The rendered CLI report to write to stdout. */
  readonly stdout: string;
  /** Non-fatal notices to write to stderr, one line each. */
  readonly stderr: readonly string[];
  /** The verdict exit code: `1` only when a blocking new violation is reported. */
  readonly exitCode: 0 | 1;
}

/**
 * Runs a `check` for the given flags. The run mode is derived from
 * `changedOnly` — a changed-only run is a `preCommit` verdict, an unfiltered
 * run is a `ci` verdict. Optional fields are spread only when present so they
 * never land as an explicit `undefined` under `exactOptionalPropertyTypes`.
 */
export async function runCheckCommand(flags: CheckCommandFlags): Promise<CheckCommandOutcome> {
  const options: RunCheckOptions = {
    cwd: flags.cwd,
    mode: flags.changedOnly ? 'preCommit' : 'ci',
    noBaseline: flags.noBaseline,
    changedOnly: flags.changedOnly,
    ...(flags.configPath !== undefined ? { configPath: flags.configPath } : {}),
    ...(flags.base !== undefined ? { base: flags.base } : {}),
    ...(flags.ruleFilter !== undefined ? { ruleFilter: flags.ruleFilter } : {}),
  };

  const outcome = await runCheck(options);
  return {
    stdout: outcome.report,
    stderr: outcome.warnings,
    exitCode: outcome.exitCode,
  };
}
