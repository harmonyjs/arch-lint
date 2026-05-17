/**
 * @fileoverview Tests for runCheck() orchestration and the deriveSuppressEntities
 * helper. Every I/O seam runCheck touches is mocked; changed-file detection is
 * mocked at getChangedFiles while its pure filtering helpers stay real.
 */
import type { Project } from 'ts-morph';
import { Project as TsProject } from 'ts-morph';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GraphBuildError } from '../errors.js';
import { makeGraph } from '../rules/test-support/make-graph.js';
import type { ResolvedConfig } from '../config/types.js';
import type { ConsumerGraph } from '../graph/types.js';
import type { CheckResult } from '../rules/types.js';
import type { Diagnostic } from '../types.js';
// ── Mocked seams ─────────────────────────────────────────────────────────────

const loadConfigMock = vi.fn();
vi.mock('../config/load.js', () => ({
  loadConfig: (...args: unknown[]): unknown => loadConfigMock(...args),
}));

const resolveConfigMock = vi.fn();
vi.mock('../config/resolve-defaults.js', () => ({
  resolveConfig: (...args: unknown[]): unknown => resolveConfigMock(...args),
}));

const buildGraphFromSourcesMock = vi.fn();
vi.mock('../graph/build.js', () => ({
  buildGraphFromSources: (...args: unknown[]): unknown => buildGraphFromSourcesMock(...args),
}));

const loadSourceFilesMock = vi.fn();
vi.mock('../graph/source-files.js', () => ({
  loadSourceFiles: (...args: unknown[]): unknown => loadSourceFilesMock(...args),
}));

const buildSuppressIndexMock = vi.fn();
vi.mock('../suppress/suppress-index.js', () => ({
  buildSuppressIndex: (...args: unknown[]): unknown => buildSuppressIndexMock(...args),
}));

const runEngineMock = vi.fn();
vi.mock('../rules/engine.js', () => ({
  runEngine: (...args: unknown[]): unknown => runEngineMock(...args),
}));

const formatReportMock = vi.fn();
vi.mock('../report/cli.js', () => ({
  formatReport: (...args: unknown[]): unknown => formatReportMock(...args),
}));

const getChangedFilesMock = vi.fn();
vi.mock('./changed-files.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./changed-files.js')>();
  return {
    ...actual,
    getChangedFiles: (...args: unknown[]): unknown => getChangedFilesMock(...args),
  };
});

const { deriveSuppressEntities, runCheck } = await import('./index.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function resolvedConfig(over: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    project: { cwd: '/repo', tsconfig: './tsconfig.json', sourceRoot: 'src' },
    baseline: {
      file: '.arch-lint-baseline.json',
      sortRecords: 'alphabetical',
      missingBehavior: 'ignore',
    },
    suppress: {
      marker: '@arch-decision',
      minReasonLength: 12,
      expirySupport: true,
      scanLocations: ['leading-comment', 'jsdoc'],
      maxDistanceLines: 5,
    },
    runMode: {
      watch: { rules: 'all', debounceMs: 200, clearOnRerun: true },
      preCommit: { rules: 'all', maxDurationMs: 5000, failOnViolations: true },
      ci: { failOnViolations: true },
    },
    report: { cli: {} },
    ...over,
  } as ResolvedConfig;
}

function diagnostic(over: Partial<Diagnostic> = {}): Diagnostic {
  return {
    ruleId: 'layer-boundary',
    severity: 'error',
    entity: 'src/a.ts',
    status: 'new',
    message: 'm',
    actual: 'a',
    reason: 'r',
    suggestions: [],
    location: { file: 'src/a.ts', line: 1, column: 1 },
    ...over,
  };
}

function checkResult(diagnostics: readonly Diagnostic[]): CheckResult {
  return {
    diagnostics,
    summary: {
      total: diagnostics.length,
      bySeverity: { info: 0, warning: 0, error: diagnostics.length },
      new: diagnostics.filter((d) => d.status === 'new').length,
      inBaseline: diagnostics.filter((d) => d.status === 'inBaseline').length,
    },
    exitCode: 0,
  };
}

/** Wires the happy-path mocks; per-test overrides follow. */
function arrange(opts: {
  readonly config?: ResolvedConfig;
  readonly graph?: ConsumerGraph;
  readonly result: CheckResult;
}): void {
  loadConfigMock.mockResolvedValue({ project: { tsconfig: './tsconfig.json' } });
  resolveConfigMock.mockReturnValue(opts.config ?? resolvedConfig());
  buildGraphFromSourcesMock.mockReturnValue(opts.graph ?? makeGraph({}));
  loadSourceFilesMock.mockResolvedValue({
    project: new TsProject({ useInMemoryFileSystem: true }),
    files: new Map(),
    rootDir: '/repo/src',
    cwd: '/repo',
  });
  buildSuppressIndexMock.mockReturnValue({
    isSuppressed: () => false,
    findExpired: () => [],
  });
  runEngineMock.mockReturnValue(opts.result);
  formatReportMock.mockReturnValue('report-text');
}

afterEach(() => {
  vi.clearAllMocks();
});

// ── deriveSuppressEntities ───────────────────────────────────────────────────

describe('deriveSuppressEntities', () => {
  const sources = {
    project: new TsProject({ useInMemoryFileSystem: true }) as Project,
    files: new Map([
      ['src/Widget/Widget.tsx', {} as never],
      ['src/Panel/Panel.ts', {} as never],
    ]) as ReadonlyMap<string, never>,
    rootDir: '/repo/src',
    cwd: '/repo',
  };

  it('skips nodes that are not entities', () => {
    const graph = makeGraph({
      nodes: { 'src/a.ts': { kind: 'file', isEntity: false } },
    });
    expect(deriveSuppressEntities(graph, sources)).toEqual([]);
  });

  it('maps a file entity: id is the entry file, name drops the extension', () => {
    const graph = makeGraph({
      nodes: { 'src/util.ts': { kind: 'file', isEntity: true } },
    });
    expect(deriveSuppressEntities(graph, sources)).toEqual([
      { id: 'src/util.ts', name: 'util', entryFilePath: 'src/util.ts' },
    ]);
  });

  it('drops a .tsx extension from a file entity name', () => {
    const graph = makeGraph({
      nodes: { 'src/Icon.tsx': { kind: 'file', isEntity: true } },
    });
    expect(deriveSuppressEntities(graph, sources)[0]).toEqual({
      id: 'src/Icon.tsx',
      name: 'Icon',
      entryFilePath: 'src/Icon.tsx',
    });
  });

  it('maps a folder entity to its .tsx entry file when one exists', () => {
    const graph = makeGraph({
      nodes: { 'src/Widget': { kind: 'folder', isEntity: true } },
    });
    expect(deriveSuppressEntities(graph, sources)).toEqual([
      { id: 'src/Widget', name: 'Widget', entryFilePath: 'src/Widget/Widget.tsx' },
    ]);
  });

  it('falls back to the .ts entry file for a folder with no .tsx', () => {
    const graph = makeGraph({
      nodes: { 'src/Panel': { kind: 'folder', isEntity: true } },
    });
    expect(deriveSuppressEntities(graph, sources)).toEqual([
      { id: 'src/Panel', name: 'Panel', entryFilePath: 'src/Panel/Panel.ts' },
    ]);
  });
});

// ── runCheck ─────────────────────────────────────────────────────────────────

describe('runCheck', () => {
  it('returns exit 0 when there is no new violation', async () => {
    arrange({ result: checkResult([diagnostic({ status: 'inBaseline' })]) });
    const outcome = await runCheck({
      cwd: '/repo',
      mode: 'ci',
      noBaseline: false,
      changedOnly: false,
    });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.result.exitCode).toBe(0);
    expect(outcome.report).toBe('report-text');
    expect(outcome.warnings).toEqual([]);
    // Sources are parsed exactly once per run — the graph and engine share it.
    expect(loadSourceFilesMock).toHaveBeenCalledTimes(1);
  });

  it('returns exit 1 when a new violation exists and the mode fails on violations', async () => {
    arrange({ result: checkResult([diagnostic({ status: 'new' })]) });
    const outcome = await runCheck({
      cwd: '/repo',
      mode: 'ci',
      noBaseline: false,
      changedOnly: false,
    });
    expect(outcome.exitCode).toBe(1);
    expect(outcome.result.exitCode).toBe(1);
  });

  it('keeps exit 0 on a new violation when the mode does not fail on violations', async () => {
    const config = resolvedConfig({
      runMode: {
        watch: { rules: 'all', debounceMs: 200, clearOnRerun: true },
        preCommit: { rules: 'all', maxDurationMs: 5000, failOnViolations: false },
        ci: { failOnViolations: true },
      },
    });
    arrange({ config, result: checkResult([diagnostic({ status: 'new' })]) });
    const outcome = await runCheck({
      cwd: '/repo',
      mode: 'preCommit',
      noBaseline: false,
      changedOnly: false,
    });
    expect(outcome.exitCode).toBe(0);
  });

  it('wraps a graph-build failure in a GraphBuildError', async () => {
    arrange({ result: checkResult([]) });
    buildGraphFromSourcesMock.mockImplementationOnce(() => {
      throw new Error('parse blew up');
    });
    await expect(
      runCheck({ cwd: '/repo', mode: 'ci', noBaseline: false, changedOnly: false }),
    ).rejects.toBeInstanceOf(GraphBuildError);
  });

  it('rethrows an ArchLintError from the graph build without rewrapping', async () => {
    arrange({ result: checkResult([]) });
    const original = new GraphBuildError('already typed');
    buildGraphFromSourcesMock.mockImplementationOnce(() => {
      throw original;
    });
    await expect(
      runCheck({ cwd: '/repo', mode: 'ci', noBaseline: false, changedOnly: false }),
    ).rejects.toBe(original);
  });

  it('emits a warning and still reports when changed-only cannot find a git base', async () => {
    arrange({ result: checkResult([diagnostic({ status: 'new' })]) });
    getChangedFilesMock.mockResolvedValueOnce(null);
    const outcome = await runCheck({
      cwd: '/repo',
      mode: 'ci',
      noBaseline: false,
      changedOnly: true,
    });
    expect(outcome.warnings).toHaveLength(1);
    expect(outcome.warnings[0]).toContain('changed-only');
    expect(outcome.result.diagnostics).toHaveLength(1);
    expect(outcome.exitCode).toBe(1);
  });

  it('narrows diagnostics to the affected set under changed-only', async () => {
    const graph = makeGraph({
      nodes: {
        'src/a.ts': { kind: 'file', isEntity: true },
        'src/b.ts': { kind: 'file', isEntity: true },
      },
    });
    arrange({
      graph,
      result: checkResult([
        diagnostic({ entity: 'src/a.ts', status: 'new' }),
        diagnostic({ entity: 'src/b.ts', status: 'new', fingerprint: 'b' }),
      ]),
    });
    getChangedFilesMock.mockResolvedValueOnce(['src/a.ts']);
    const outcome = await runCheck({
      cwd: '/repo',
      mode: 'ci',
      noBaseline: false,
      changedOnly: true,
    });
    expect(outcome.result.diagnostics.map((d) => d.entity)).toEqual(['src/a.ts']);
    // Summary stays from the full run — only the diagnostics list is narrowed.
    expect(outcome.result.summary.total).toBe(2);
  });
});
