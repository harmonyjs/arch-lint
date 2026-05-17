/**
 * @fileoverview The `graph` command — builds the dependency graph and renders
 * it as a layered Mermaid document. `runGraphCommand` is process-pure: it
 * returns the document text (or writes it to `--out`) and an exit code,
 * leaving stdout printing to the CLI layer. It runs no rules and emits no
 * verdict.
 */
import { writeFile } from 'node:fs/promises';
import { loadConfig, resolveConfig } from '#config/index.js';
import { ArchLintError, GraphBuildError, IOError } from '#errors/index.js';
import { loadSourceFiles } from '#graph/discover-source-files.js';
import { buildGraphFromSources } from '#graph/index.js';
import { extractFileoverviews, renderGraphDoc } from '#graphdoc/index.js';

/** CLI flags that steer a `graph` run, already parsed by the commander program. */
export interface GraphCommandFlags {
  /** Directory the run is rooted at — config discovery starts here. */
  readonly cwd: string;
  /** Explicit config path from `--config`, bypassing autodiscovery. */
  readonly configPath?: string;
  /** Destination file from `--out`; when absent the document goes to stdout. */
  readonly out?: string;
  /** Limit the document to a single subsystem (`--subsystem`). */
  readonly subsystem?: string;
}

/** The process-pure result of a `graph` run. */
export interface GraphCommandOutcome {
  /** The document to print to stdout — empty when written to `--out`. */
  readonly stdout: string;
  /** Non-fatal notices to write to stderr, one line each. */
  readonly stderr: readonly string[];
  /** Always 0 — `graph` is not a gate; failures throw typed errors. */
  readonly exitCode: 0;
}

/** Builds the graph document for `flags`, writing it to `--out` when set. */
export async function runGraphCommand(flags: GraphCommandFlags): Promise<GraphCommandOutcome> {
  const config = resolveConfig(await loadConfig(flags.cwd, flags.configPath));

  let document: string;
  try {
    const sources = await loadSourceFiles(config);
    const graph = buildGraphFromSources(config, sources);
    const fileoverviews = extractFileoverviews(sources);
    document = renderGraphDoc(
      graph,
      fileoverviews,
      config,
      flags.subsystem !== undefined ? { subsystem: flags.subsystem } : undefined,
    );
  } catch (err) {
    if (err instanceof ArchLintError) throw err;
    throw new GraphBuildError('failed to build dependency graph', { cause: err });
  }

  if (flags.out !== undefined) {
    try {
      await writeFile(flags.out, document, 'utf8');
    } catch (err) {
      throw new IOError(`failed to write graph document: ${flags.out}`, { cause: err });
    }
    return { stdout: '', stderr: [`graph document written to ${flags.out}`], exitCode: 0 };
  }
  return { stdout: document, stderr: [], exitCode: 0 };
}
