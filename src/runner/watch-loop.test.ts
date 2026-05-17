/**
 * @fileoverview Tests for runWatch — the watch loop. A fake EventEmitter
 * watcher and fake timers isolate the loop (debounce + incremental rebuild +
 * render) from the engine internals, which are mocked at their seams.
 */
import { EventEmitter } from 'node:events';
import type { FSWatcher } from 'chokidar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckResult, ConsumerGraph, ResolvedConfig } from '../types.js';

// ── Mocked seams ─────────────────────────────────────────────────────────────

const loadConfigMock = vi.fn();
vi.mock('../config/load.js', () => ({
  loadConfig: (...args: unknown[]): unknown => loadConfigMock(...args),
}));

const resolveConfigMock = vi.fn();
vi.mock('../config/resolve-defaults.js', () => ({
  resolveConfig: (...args: unknown[]): unknown => resolveConfigMock(...args),
}));

const buildGraphMock = vi.fn();
vi.mock('../graph/build.js', () => ({
  buildGraph: (...args: unknown[]): unknown => buildGraphMock(...args),
}));

const buildIncrementalMock = vi.fn();
vi.mock('../graph/incremental.js', () => ({
  buildIncremental: (...args: unknown[]): unknown => buildIncrementalMock(...args),
}));

const loadSourceFilesMock = vi.fn();
vi.mock('../graph/source-files.js', () => ({
  loadSourceFiles: (...args: unknown[]): unknown => loadSourceFilesMock(...args),
}));

const buildSuppressIndexMock = vi.fn();
vi.mock('../suppress/suppress-index.js', () => ({
  buildSuppressIndex: (...args: unknown[]): unknown => buildSuppressIndexMock(...args),
}));

const formatReportMock = vi.fn();
vi.mock('../report/cli.js', () => ({
  formatReport: (...args: unknown[]): unknown => formatReportMock(...args),
}));

const checkMock = vi.fn();
const resolveBaselineMock = vi.fn();
vi.mock('./index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./index.js')>();
  return {
    ...actual,
    check: (...args: unknown[]): unknown => checkMock(...args),
    resolveBaseline: (...args: unknown[]): unknown => resolveBaselineMock(...args),
  };
});

const { runWatch } = await import('./watch.js');

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
  buildGraphMock.mockResolvedValue(graph);
  buildIncrementalMock.mockResolvedValue(graph);
  loadSourceFilesMock.mockResolvedValue({
    project: {},
    files: new Map(),
    rootDir: '/repo/src',
    cwd: '/repo',
  });
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

    expect(buildGraphMock).toHaveBeenCalledTimes(1);
    expect(buildIncrementalMock).not.toHaveBeenCalled();
    expect(print).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledWith('report-text');
    expect(clearScreen).toHaveBeenCalledTimes(1);
    expect(session).not.toHaveProperty('exitCode');

    await session.close();
    expect(watcher.close).toHaveBeenCalledTimes(1);
  });

  it('debounces a burst of change events into one incremental rebuild with relative paths', async () => {
    const { watcher } = arrange();
    const print = vi.fn();

    await runWatch({
      cwd: '/repo',
      createWatcher: () => watcher as unknown as FSWatcher,
      print,
      clearScreen: vi.fn(),
    });

    watcher.emit('change', '/repo/src/a.ts');
    watcher.emit('change', '/repo/src/b.ts');
    watcher.emit('add', '/repo/src/c.ts');
    expect(buildIncrementalMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);

    expect(buildIncrementalMock).toHaveBeenCalledTimes(1);
    const changes = buildIncrementalMock.mock.calls[0]?.[1];
    expect(changes).toEqual({
      added: ['src/c.ts'],
      removed: [],
      modified: ['src/a.ts', 'src/b.ts'],
    });
    expect(print).toHaveBeenCalledTimes(2);
  });
});
