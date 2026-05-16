/**
 * @fileoverview Runner — the orchestration layer between the CLI and the rule
 * engine. `check` is the pure, I/O-free engine wrapper; the rest of this module
 * adds the I/O around it (config, graph, sources, suppress, baseline).
 */
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import type { Project } from 'ts-morph';
import { parseBaselineFile } from '../baseline/index.js';
import { ConfigError, IOError } from '../errors.js';
import { runEngine } from '../rules/engine.js';
import type {
  BaselineFile,
  CheckResult,
  ConsumerGraph,
  ResolvedConfig,
  SuppressIndex,
} from '../types.js';

/** True if `err` is a Node filesystem error whose `code` field is `ENOENT`. */
function isMissingFile(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'ENOENT'
  );
}

/**
 * Pure engine wrapper — a synchronous passthrough to runEngine, free of any
 * file I/O. Every argument is supplied by the caller; the runner's I/O
 * orchestration (loading config, building the graph, resolving the baseline)
 * lives in `runCheck`.
 */
export function check(
  graph: ConsumerGraph,
  config: ResolvedConfig,
  suppress: SuppressIndex,
  project: Project,
  ruleFilter?: readonly string[],
  baseline?: BaselineFile | null,
): CheckResult {
  return runEngine(graph, config, suppress, project, ruleFilter, baseline);
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
