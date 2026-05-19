/**
 * @fileoverview Watch mode — a long-lived process that builds the dependency
 * graph once, then on debounced file-change events rebuilds it and re-runs the
 * check, redrawing the report. Watch never emits a verdict exit code: it is a
 * feedback loop, not a gate.
 */
import { relative } from 'node:path';
import type { FSWatcher } from 'chokidar';
import { loadConfig, resolveConfig } from '#foundation/config/index.js';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Logger } from '#foundation/logger/index.js';
import { ConsoleLogger, NullTelemetry } from '#foundation/logger/index.js';
import type { SourceFileSet } from '#foundation/source-files/index.js';
import { buildSuppressIndex } from '#foundation/suppress/suppress-index.js';
import { loadSourceFiles } from '#platform/graph/discover-source-files.js';
import { buildGraphFromSources, graphEntityResolver } from '#platform/graph/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';
import { formatReport } from '#report/index.js';
import type { BaselineFile } from '#runner/baseline/types.js';
import { check, resolveBaseline } from './check.js';

/** Accumulates events and flushes them once after a quiet period. */
export interface Debouncer<T> {
  /** Records an event and (re)starts the quiet-period timer. */
  push(event: T): void;
  /** Clears any pending timer and discards events accumulated so far. */
  cancel(): void;
}

/**
 * Creates a debouncer: every `push` records its event and restarts an `ms`
 * timer. Once `ms` elapses with no further `push`, `flush` runs exactly once
 * with every event accumulated since the previous flush, and the accumulator
 * is cleared. The next `push` starts a fresh batch. `cancel` drops a pending
 * timer and its events so no flush fires after teardown.
 */
export function createDebouncer<T>(
  ms: number,
  flush: (events: readonly T[]) => void,
): Debouncer<T> {
  let pending: T[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    push(event: T): void {
      pending.push(event);
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        const batch = pending;
        pending = [];
        timer = undefined;
        flush(batch);
      }, ms);
    },
    cancel(): void {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      pending = [];
    },
  };
}

/** Configuration for a watch session — every I/O seam is injected for tests. */
export interface WatchOptions {
  /** Directory the run is rooted at — config discovery starts here. */
  readonly cwd: string;
  /** Explicit config path, bypassing autodiscovery. */
  readonly configPath?: string;
  /** Builds the file-system watcher for a source root; injected so tests fake it. */
  readonly createWatcher: (sourceRoot: string) => FSWatcher;
  /** Output sink for the rendered report. */
  readonly print: (text: string) => void;
  /** Clears the terminal before a redraw; a no-op in tests. */
  readonly clearScreen: () => void;
  /** Diagnostic-output sink; absent falls back to a fresh ConsoleLogger. */
  readonly logger?: Logger;
}

/** A running watch session — no verdict exit code, only a teardown hook. */
export interface WatchSession {
  /** Stops watching and releases the file-system watcher. */
  close(): Promise<void>;
}

/**
 * Starts a watch session. The graph is built once, the report rendered
 * immediately, then a file-system watcher feeds add/unlink/change events into a
 * debouncer. Each debounced flush rebuilds the graph and redraws; a rebuild or
 * render failure is reported and the session keeps watching.
 */
export async function runWatch(opts: WatchOptions): Promise<WatchSession> {
  const logger = opts.logger ?? new ConsoleLogger();
  const config = resolveConfig(await loadConfig(opts.cwd, opts.configPath, logger));
  const baseline = await resolveBaseline(config, { noBaseline: false });
  const renderContext: RenderContext = { config, baseline, opts, logger };

  const initial = await rebuild(config);
  render(initial, renderContext);

  const debouncer = createDebouncer<ClassifiedChange>(config.runMode.watch.debounceMs, () => {
    void (async () => {
      try {
        const next = await rebuild(config);
        render(next, renderContext);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Watch rebuild failed: ${message}`);
      }
    })();
  });

  const watcher = opts.createWatcher(config.project.sourceRoot);
  const feed = (kind: ClassifiedChange['kind']) => (path: string) => {
    debouncer.push({ kind, path: relative(opts.cwd, path) });
  };
  watcher.on('add', feed('added'));
  watcher.on('unlink', feed('removed'));
  watcher.on('change', feed('modified'));

  return {
    async close(): Promise<void> {
      debouncer.cancel();
      await watcher.close();
    },
  };
}

/** A single watcher event classified by its effect on the graph's node set. */
interface ClassifiedChange {
  readonly kind: 'added' | 'removed' | 'modified';
  readonly path: string;
}

/** The dependency graph and the ts-morph sources it was built from. */
interface RebuildResult {
  /** The frozen dependency graph for the current source tree. */
  readonly graph: ConsumerGraph;
  /** The source files the graph was built from; the graph shares its Project. */
  readonly sources: SourceFileSet;
}

/**
 * Parses the source tree once and builds the graph from that single
 * SourceFileSet, so the graph and the engine share one ts-morph Project.
 */
async function rebuild(config: ResolvedConfig): Promise<RebuildResult> {
  const sources = await loadSourceFiles(config);
  return { graph: buildGraphFromSources(config, sources), sources };
}

/** The session-invariant context a `render` reuses across every rebuild. */
interface RenderContext {
  /** The fully resolved configuration governing the run. */
  readonly config: ResolvedConfig;
  /** The baseline diagnostics are classified against; null skips classification. */
  readonly baseline: BaselineFile | null;
  /** The watch session's injected I/O seams. */
  readonly opts: WatchOptions;
  /** The diagnostic-output sink threaded into the check. */
  readonly logger: Logger;
}

/**
 * Produces a CheckResult for the current graph and prints its report. The
 * suppress index is built per render from the shared sources; the optional
 * screen clear runs first.
 */
function render(rebuilt: RebuildResult, ctx: RenderContext): void {
  const { config, baseline, opts, logger } = ctx;
  const { graph, sources } = rebuilt;
  const suppress = buildSuppressIndex(config.suppress, graphEntityResolver(graph, sources.project));
  const result = check(
    {
      graph,
      config,
      suppress,
      project: sources.project,
      census: sources.census,
      logger,
      telemetry: new NullTelemetry(),
    },
    undefined,
    baseline,
  );
  if (config.runMode.watch.clearOnRerun) opts.clearScreen();
  opts.print(formatReport(result, config));
}
