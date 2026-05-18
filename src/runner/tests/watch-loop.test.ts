/**
 * @fileoverview Tests for runWatch — the watch loop. A fake EventEmitter
 * watcher and fake timers isolate the loop (debounce + rebuild + render) from
 * the engine internals, which are mocked at their seams.
 */
import { EventEmitter } from 'node:events';
import type { FSWatcher } from 'chokidar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { InMemoryLogger } from '#foundation/logger/index.js';
import type { CheckResult } from '#platform/engine/types.js';
import type { ConsumerGraph } from '#platform/graph/types.js';

// ── Mocked seams ─────────────────────────────────────────────────────────────

const loadConfigMock = vi.fn();
vi.mock('#foundation/config/load.js', () => ({
  loadConfig: (...args: unknown[]): unknown => loadConfigMock(...args),
}));

const resolveConfigMock = vi.fn();
vi.mock('#foundation/config/resolve-defaults.js', () => ({
  resolveConfig: (...args: unknown[]): unknown => resolveConfigMock(...args),
}));

const buildGraphFromSourcesMock = vi.fn();
vi.mock('#platform/graph/build.js', () => ({
  buildGraphFromSources: (...args: unknown[]): unknown => buildGraphFromSourcesMock(...args),
}));

const loadSourceFilesMock = vi.fn();
vi.mock('#platform/graph/discover-source-files.js', () => ({
  loadSourceFiles: (...args: unknown[]): unknown => loadSourceFilesMock(...args),
}));

const buildSuppressIndexMock = vi.fn();
vi.mock('#foundation/suppress/suppress-index.js', () => ({
  buildSuppressIndex: (...args: unknown[]): unknown => buildSuppressIndexMock(...args),
}));

const formatReportMock = vi.fn();
vi.mock('#report/index.js', () => ({
  formatReport: (...args: unknown[]): unknown => formatReportMock(...args),
}));

const checkMock = vi.fn();
const resolveBaselineMock = vi.fn();
vi.mock('#runner/check.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#runner/check.js')>();
  return {
    ...actual,
    check: (...args: unknown[]): unknown => checkMock(...args),
    resolveBaseline: (...args: unknown[]): unknown => resolveBaselineMock(...args),
  };
});

const { runWatch } = await import('#runner/watch.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A fake chokidar watcher: an EventEmitter with an async close(). */
class FakeWatcher extends EventEmitter {
  readonly close = vi.fn(async (): Promise<void> => {});
}

function resolvedConfig(): ResolvedConfig {
  return {
    project: { cwd: '/repo', tsconfig: './tsconfig.json', sourceRoot: 'src' },
    runMode: {
      watch: { rules: 'all', debounceMs: 200, clearOnRerun: true },
      preCommit: { rules: 'all', maxDurationMs: 5000, failOnViolations: true },
      ci: { failOnViolations: true },
    },
    suppress: {
      marker: '@arch-decision',
      minReasonLength: 12,
      expirySupport: true,
      scanLocations: ['leading-comment', 'jsdoc'],
      maxDistanceLines: 5,
    },
    report: { cli: {} },
  } as unknown as ResolvedConfig;
}

const canned: CheckResult = {
  diagnostics: [],
  summary: { total: 0, bySeverity: { info: 0, warning: 0, error: 0 }, new: 0, inBaseline: 0 },
  exitCode: 0,
};

function arrange(): { graph: ConsumerGraph; watcher: FakeWatcher } {
  const graph = { nodes: new Map() } as unknown as ConsumerGraph;
  const watcher = new FakeWatcher();
  loadConfigMock.mockResolvedValue({ project: { tsconfig: './tsconfig.json' } });
  resolveConfigMock.mockReturnValue(resolvedConfig());
  resolveBaselineMock.mockResolvedValue(null);
  loadSourceFilesMock.mockResolvedValue({
    project: {},
    files: new Map(),
    rootDir: '/repo/src',
    cwd: '/repo',
  });
  buildGraphFromSourcesMock.mockReturnValue(graph);
  buildSuppressIndexMock.mockReturnValue({ isSuppressed: () => false, findExpired: () => [] });
  checkMock.mockReturnValue(canned);
  formatReportMock.mockReturnValue('report-text');
  return { graph, watcher };
}

describe('runWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders once on start and close() closes the watcher with no verdict exit code', async () => {
    const { watcher } = arrange();
    const print = vi.fn();
    const clearScreen = vi.fn();

    const session = await runWatch({
      cwd: '/repo',
      createWatcher: () => watcher as unknown as FSWatcher,
      print,
      clearScreen,
    });

    expect(loadSourceFilesMock).toHaveBeenCalledTimes(1);
    expect(buildGraphFromSourcesMock).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledWith('report-text');
    expect(clearScreen).toHaveBeenCalledTimes(1);
    expect(session).not.toHaveProperty('exitCode');

    await session.close();
    expect(watcher.close).toHaveBeenCalledTimes(1);
  });

  it('debounces a burst of change events into one rebuild and re-render', async () => {
    const { watcher } = arrange();
    const print = vi.fn();

    await runWatch({
      cwd: '/repo',
      createWatcher: () => watcher as unknown as FSWatcher,
      print,
      clearScreen: vi.fn(),
    });
    expect(loadSourceFilesMock).toHaveBeenCalledTimes(1);

    watcher.emit('change', '/repo/src/a.ts');
    watcher.emit('change', '/repo/src/b.ts');
    watcher.emit('add', '/repo/src/c.ts');
    expect(loadSourceFilesMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(200);

    // One extra rebuild for the whole burst: the initial build plus this one.
    expect(loadSourceFilesMock).toHaveBeenCalledTimes(2);
    expect(buildGraphFromSourcesMock).toHaveBeenCalledTimes(2);
    expect(print).toHaveBeenCalledTimes(2);
    expect(print).toHaveBeenLastCalledWith('report-text');
  });

  it('reports a rebuild failure and keeps the session alive for the next event', async () => {
    const { watcher } = arrange();
    const print = vi.fn();
    const logger = new InMemoryLogger();

    await runWatch({
      cwd: '/repo',
      createWatcher: () => watcher as unknown as FSWatcher,
      print,
      clearScreen: vi.fn(),
      logger,
    });

    // A transient parse error on the next rebuild — the loop must not die.
    loadSourceFilesMock.mockRejectedValueOnce(new Error('parse blew up'));
    watcher.emit('change', '/repo/src/a.ts');
    await vi.advanceTimersByTimeAsync(200);

    // The failure is a diagnostic — it lands on the logger's error channel,
    // not the report sink, so `print` is untouched by the failed rebuild.
    expect(print).toHaveBeenCalledTimes(1);
    expect(logger.entries).toContainEqual({
      level: 'error',
      message: 'Watch rebuild failed: parse blew up',
    });

    // A subsequent event still triggers a rebuild + render: the session lives.
    watcher.emit('change', '/repo/src/b.ts');
    await vi.advanceTimersByTimeAsync(200);

    expect(print).toHaveBeenCalledTimes(2);
    expect(print).toHaveBeenLastCalledWith('report-text');
  });
});
