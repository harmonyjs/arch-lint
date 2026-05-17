/**
 * @fileoverview Watch mode — a long-lived process that builds the dependency
 * graph once, then on debounced file-change events rebuilds it incrementally,
 * re-runs the check and redraws the report. Watch never emits a verdict exit
 * code: it is a feedback loop, not a gate.
 */
import { relative } from 'node:path';
import type { FSWatcher } from 'chokidar';
import { loadConfig } from '../config/load.js';
import { resolveConfig } from '../config/resolve-defaults.js';
import { buildGraph } from '../graph/build.js';
import { buildIncremental, type GraphChanges } from '../graph/incremental.js';
import { loadSourceFiles } from '../graph/source-files.js';
import { formatReport } from '../report/cli.js';
import { buildSuppressIndex } from '../suppress/suppress-index.js';
import type { BaselineFile, ConsumerGraph, ResolvedConfig } from '../types.js';
import { check, deriveSuppressEntities, resolveBaseline } from './index.js';

/** Accumulates events and flushes them once after a quiet period. */
export interface Debouncer<T> {
  /** Records an event and (re)starts the quiet-period timer. */
  push(event: T): void;
}

/**
 * Creates a debouncer: every `push` records its event and restarts an `ms`
 * timer. Once `ms` elapses with no further `push`, `flush` runs exactly once
 * with every event accumulated since the previous flush, and the accumulator
 * is cleared. The next `push` starts a fresh batch.
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
}

/** A running watch session — no verdict exit code, only a teardown hook. */
export interface WatchSession {
  /** Stops watching and releases the file-system watcher. */
  close(): Promise<void>;
}

/**
 * Starts a watch session. The graph is built once, the report rendered
 * immediately, then a file-system watcher feeds add/unlink/change events into a
 * debouncer. Each debounced flush rebuilds the graph incrementally and redraws.
 */
export async function runWatch(opts: WatchOptions): Promise<WatchSession> {
  const config = resolveConfig(await loadConfig(opts.cwd, opts.configPath));
  const baseline = await resolveBaseline(config, { noBaseline: false });

  let graph = await buildGraph(config);
  await render(graph, config, baseline, opts);

  const debouncer = createDebouncer<ClassifiedChange>(config.runMode.watch.debounceMs, (events) => {
    void (async () => {
      graph = await buildIncremental(graph, collectChanges(events), config);
      await render(graph, config, baseline, opts);
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
      await watcher.close();
    },
  };
}

/** A single watcher event classified by its effect on the graph's node set. */
interface ClassifiedChange {
  readonly kind: 'added' | 'removed' | 'modified';
  readonly path: string;
}

/** Folds a batch of classified events into the GraphChanges incremental build expects. */
function collectChanges(events: readonly ClassifiedChange[]): GraphChanges {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  for (const event of events) {
    if (event.kind === 'added') added.push(event.path);
    else if (event.kind === 'removed') removed.push(event.path);
    else modified.push(event.path);
  }
  return { added, removed, modified };
}

/**
 * Produces a CheckResult for the current graph and prints its report. Sources
 * and the suppress index are rebuilt per render so the engine sees a Project
 * consistent with the just-built graph; the optional screen clear runs first.
 */
async function render(
  graph: ConsumerGraph,
  config: ResolvedConfig,
  baseline: BaselineFile | null,
  opts: WatchOptions,
): Promise<void> {
  const sources = await loadSourceFiles(config);
  const suppress = buildSuppressIndex(
    sources.project,
    config.suppress,
    deriveSuppressEntities(graph, sources),
  );
  const result = check(graph, config, suppress, sources.project, undefined, baseline);
  if (config.runMode.watch.clearOnRerun) opts.clearScreen();
  opts.print(formatReport(result, config));
}
