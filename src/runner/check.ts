/**
 * @fileoverview The `check` operation — builds the graph, runs the rule
 * engine, applies baseline classification and renders the report. Exposes
 * the pure engine wrapper `check`, the baseline resolver `resolveBaseline`
 * and the I/O orchestrator `runCheck` consumed by the CLI router.
 */
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import type { Project } from 'ts-morph';
import { parseBaselineFile } from '../baseline/index.js';
import type { BaselineFile } from '../baseline/types.js';
import { loadConfig, resolveConfig } from '../config/index.js';
import type { ResolvedConfig } from '../config/types.js';
import { ArchLintError, ConfigError, GraphBuildError, IOError } from '../errors/index.js';
import { loadSourceFiles, type SourceFileSet } from '../graph/discover-source-files.js';
import { buildGraphFromSources, graphEntityResolver } from '../graph/index.js';
import type { ConsumerGraph } from '../graph/types.js';
import { formatReport } from '../report/index.js';
import { runEngine } from '../rules/engine.js';
import type { CheckResult } from '../rules/types.js';
import { buildSuppressIndex } from '../suppress/suppress-index.js';
import type { SuppressIndex } from '../suppress/types.js';
import type { Diagnostic } from '../types.js';
import { affectedEntities, filterToAffected, getChangedFiles } from './changed-files.js';

/** True if `err` is a Node filesystem error whose `code` field is `ENOENT`. */
function isMissingFile(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'ENOENT';
}

/**
 * The resolved environment a `check` run operates on: the dependency graph,
 * the resolved config, the suppress index and the shared ts-morph Project.
 * The graph and the Project must originate from the same source build so the
 * engine can rely on them being consistent.
 */
export interface CheckInputs {
  /** The frozen dependency graph the rule engine runs over. */
  readonly graph: ConsumerGraph;
  /** The fully resolved configuration governing the run. */
  readonly config: ResolvedConfig;
  /** Suppression directives indexed for the engine. */
  readonly suppress: SuppressIndex;
  /** The ts-morph Project the graph was built from. */
  readonly project: Project;
}

/**
 * Pure engine wrapper — a synchronous passthrough to runEngine, free of any
 * file I/O. Every input is supplied by the caller; the runner's I/O
 * orchestration (loading config, building the graph, resolving the baseline)
 * lives in `runCheck`.
 */
export function check(
  inputs: CheckInputs,
  ruleFilter?: readonly string[],
  baseline?: BaselineFile | null,
): CheckResult {
  return runEngine(inputs, { ruleFilter, baseline });
}

/** Options that steer baseline resolution. */
export interface ResolveBaselineOptions {
  /** When true, skip the baseline entirely and classify every diagnostic as new. */
  readonly noBaseline: boolean;
}

/**
 * Resolves and loads the baseline file the engine classifies against. With
 * `noBaseline` the result is `null` (all diagnostics are new). Otherwise the
 * configured `baseline.file` is resolved against the project cwd and read: a
 * missing file is `null` or a ConfigError depending on `baseline.missingBehavior`,
 * a malformed file is always a ConfigError, and any other read failure is an
 * IOError. The file is read once — existence is never pre-checked separately.
 */
export async function resolveBaseline(
  config: ResolvedConfig,
  opts: ResolveBaselineOptions,
): Promise<BaselineFile | null> {
  if (opts.noBaseline) return null;
  const file = config.baseline.file;
  const path = isAbsolute(file) ? file : resolve(config.project.cwd, file);

  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    if (isMissingFile(err)) {
      if (config.baseline.missingBehavior === 'error') {
        throw new ConfigError(`baseline file not found: ${file}`);
      }
      return null;
    }
    throw new IOError(`failed to read baseline file: ${file}`, { cause: err });
  }

  try {
    return parseBaselineFile(text);
  } catch (err) {
    throw new ConfigError(`baseline file is invalid: ${file}`, { cause: err });
  }
}

/** A run mode selects which runMode sub-config governs the pass/fail verdict. */
export type RunMode = 'ci' | 'preCommit';

/** Everything a single runCheck invocation needs from the CLI. */
export interface RunCheckOptions {
  /** Directory the run is rooted at — config discovery and git both start here. */
  readonly cwd: string;
  /** Explicit config path from `--config`, bypassing autodiscovery. */
  readonly configPath?: string;
  /** Which runMode sub-config decides the verdict. */
  readonly mode: RunMode;
  /** Skip the baseline entirely — every diagnostic counts as new. */
  readonly noBaseline: boolean;
  /** Narrow the reported diagnostics to files changed against a git base. */
  readonly changedOnly: boolean;
  /** Git base ref for `changedOnly`; absent means diff against HEAD. */
  readonly base?: string;
  /** Restrict the run to these rule ids; absent runs every active rule. */
  readonly ruleFilter?: readonly string[];
}

/** The result of a runCheck invocation — the report plus the process verdict. */
export interface RunCheckOutcome {
  /** The engine result, with diagnostics and exit code narrowed by changedOnly. */
  readonly result: CheckResult;
  /** The rendered CLI report for the (possibly narrowed) diagnostics. */
  readonly report: string;
  /** The process exit code: 1 only when a blocking new violation is reported. */
  readonly exitCode: 0 | 1;
  /** Non-fatal notices surfaced during the run, e.g. a degraded changed-only. */
  readonly warnings: readonly string[];
}

/**
 * Loads sources once and builds the dependency graph from them, returning both so
 * the engine reuses the same parsed Project. Any non-typed failure — from source
 * loading or graph assembly — maps onto a GraphBuildError; an already-typed
 * ArchLintError passes through untouched.
 */
async function buildGraphAndSources(
  config: ResolvedConfig,
): Promise<{ graph: ConsumerGraph; sources: SourceFileSet }> {
  try {
    const sources = await loadSourceFiles(config);
    const graph = buildGraphFromSources(config, sources);
    return { graph, sources };
  } catch (err) {
    if (err instanceof ArchLintError) throw err;
    throw new GraphBuildError('failed to build dependency graph', { cause: err });
  }
}

/**
 * The full I/O orchestration behind a `check` run: load and resolve config,
 * build the graph and parse sources, build the suppress index and resolve the
 * baseline, run the engine, then apply the changed-only reporting filter and
 * compute the verdict. The summary always reflects the full run; changed-only
 * narrows only the reported diagnostics and the exit code.
 */
export async function runCheck(options: RunCheckOptions): Promise<RunCheckOutcome> {
  const config = resolveConfig(await loadConfig(options.cwd, options.configPath));
  const { graph, sources } = await buildGraphAndSources(config);
  const suppress = buildSuppressIndex(sources.project, config.suppress, graphEntityResolver(graph));
  const baseline = await resolveBaseline(config, { noBaseline: options.noBaseline });
  const result = check(
    { graph, config, suppress, project: sources.project },
    options.ruleFilter,
    baseline,
  );

  const warnings: string[] = [];
  let diagnostics: readonly Diagnostic[] = result.diagnostics;
  if (options.changedOnly) {
    const changed = await getChangedFiles(options.cwd, options.base);
    if (changed === null) {
      warnings.push('changed-only: could not determine the git base — reporting all violations');
    } else {
      diagnostics = filterToAffected(diagnostics, affectedEntities(changed, graph));
    }
  }

  const failOn =
    options.mode === 'ci'
      ? config.runMode.ci.failOnViolations
      : config.runMode.preCommit.failOnViolations;
  const hasNew = diagnostics.some((d) => d.status === 'new');
  const verdictCode: 0 | 1 = failOn && hasNew ? 1 : 0;

  const filteredResult: CheckResult = { ...result, diagnostics, exitCode: verdictCode };
  return {
    result: filteredResult,
    report: formatReport(filteredResult, config),
    exitCode: verdictCode,
    warnings,
  };
}

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
