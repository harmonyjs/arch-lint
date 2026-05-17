/**
 * @fileoverview The `watch` command adapter — wires the runner's watch loop to
 * its real I/O seams. It supplies a chokidar file-system watcher, a stdout
 * print sink, and a terminal-clear hook, then delegates to `runWatch`. Watch
 * never emits a verdict exit code: it is a feedback loop, not a gate.
 */
import chokidar from 'chokidar';
import { runWatch, type WatchSession } from '../../runner/watch.js';

/** CLI flags that steer a `watch` run, already parsed by the commander program. */
export interface WatchCommandFlags {
  /** Directory the run is rooted at — config discovery starts here. */
  readonly cwd: string;
  /** Explicit config path from `--config`, bypassing autodiscovery. */
  readonly configPath?: string;
}

/** ANSI escape sequence that clears the screen, its scrollback, and homes the cursor. */
const CLEAR_SCREEN = '\x1B[2J\x1B[3J\x1B[H';

/**
 * Starts a `watch` session bound to the live process: a chokidar watcher over
 * the source root (initial scan suppressed so the first render is the only
 * startup output), stdout as the report sink, and a real terminal clear. The
 * returned session's `close()` tears the watcher down.
 */
export async function runWatchCommand(flags: WatchCommandFlags): Promise<WatchSession> {
  return runWatch({
    cwd: flags.cwd,
    ...(flags.configPath !== undefined ? { configPath: flags.configPath } : {}),
    createWatcher: (sourceRoot) => chokidar.watch(sourceRoot, { ignoreInitial: true }),
    print: (text) => {
      process.stdout.write(`${text}\n`);
    },
    clearScreen: () => {
      process.stdout.write(CLEAR_SCREEN);
    },
  });
}
