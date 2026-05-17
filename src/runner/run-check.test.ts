/**
 * @fileoverview Tests for runCheck() orchestration. Every I/O seam runCheck
 * touches is mocked; changed-file detection is mocked at getChangedFiles while
 * its pure filtering helpers stay real.
 */
import { Project as TsProject } from 'ts-morph';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from '#config/types.js';
import { GraphBuildError } from '#errors/index.js';
import type { ConsumerGraph } from '#graph/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import type { Diagnostic } from '#types.js';

// ── Mocked seams ─────────────────────────────────────────────────────────────

const loadConfigMock = vi.fn();
vi.mock('#config/load.js', () => ({
  loadConfig: (...args: unknown[]): unknown => loadConfigMock(...args),
}));

const resolveConfigMock = vi.fn();
vi.mock('#config/resolve-defaults.js', () => ({
  resolveConfig: (...args: unknown[]): unknown => resolveConfigMock(...args),
}));

const buildGraphFromSourcesMock = vi.fn();
vi.mock('#graph/build.js', () => ({
  buildGraphFromSources: (...args: unknown[]): unknown => buildGraphFromSourcesMock(...args),
}));

const loadSourceFilesMock = vi.fn();
vi.mock('#graph/discover-source-files.js', () => ({
  loadSourceFiles: (...args: unknown[]): unknown => loadSourceFilesMock(...args),
}));

const buildSuppressIndexMock = vi.fn();
vi.mock('#suppress/suppress-index.js', () => ({
  buildSuppressIndex: (...args: unknown[]): unknown => buildSuppressIndexMock(...args),
}));

const runEngineMock = vi.fn();
vi.mock('#rules/engine.js', () => ({
  runEngine: (...args: unknown[]): unknown => runEngineMock(...args),
}));

// Classification is exercised in check.test.ts and classify.test.ts — here it is an
// identity pass so a test's diagnostics keep the status it set, isolating runCheck.
vi.mock('#baseline/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#baseline/index.js')>()),
  classifyDiagnostics: (diagnostics: readonly Diagnostic[]): readonly Diagnostic[] => diagnostics,
}));

const formatReportMock = vi.fn();
vi.mock('#report/index.js', () => ({
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

const { runCheck } = await import('./check.js');

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

/** Wires the happy-path mocks; per-test overrides follow. */
function arrange(opts: {
  readonly config?: ResolvedConfig;
  readonly graph?: ConsumerGraph;
  readonly diagnostics: readonly Diagnostic[];
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
  runEngineMock.mockReturnValue(opts.diagnostics);
  formatReportMock.mockReturnValue('report-text');
}

afterEach(() => {
  vi.clearAllMocks();
});

// ── runCheck ─────────────────────────────────────────────────────────────────

describe('runCheck', () => {
  it('returns exit 0 when there is no new violation', async () => {
    arrange({ diagnostics: [diagnostic({ status: 'inBaseline' })] });
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
    arrange({ diagnostics: [diagnostic({ status: 'new' })] });
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
    arrange({ config, diagnostics: [diagnostic({ status: 'new' })] });
    const outcome = await runCheck({
      cwd: '/repo',
      mode: 'preCommit',
      noBaseline: false,
      changedOnly: false,
    });
    expect(outcome.exitCode).toBe(0);
  });

  it('wraps a graph-build failure in a GraphBuildError', async () => {
    arrange({ diagnostics: [] });
    buildGraphFromSourcesMock.mockImplementationOnce(() => {
      throw new Error('parse blew up');
    });
    await expect(
      runCheck({ cwd: '/repo', mode: 'ci', noBaseline: false, changedOnly: false }),
    ).rejects.toBeInstanceOf(GraphBuildError);
  });

  it('rethrows an ArchLintError from the graph build without rewrapping', async () => {
    arrange({ diagnostics: [] });
    const original = new GraphBuildError('already typed');
    buildGraphFromSourcesMock.mockImplementationOnce(() => {
      throw original;
    });
    await expect(
      runCheck({ cwd: '/repo', mode: 'ci', noBaseline: false, changedOnly: false }),
    ).rejects.toBe(original);
  });

  it('emits a warning and still reports when changed-only cannot find a git base', async () => {
    arrange({ diagnostics: [diagnostic({ status: 'new' })] });
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
      diagnostics: [
        diagnostic({ entity: 'src/a.ts', status: 'new' }),
        diagnostic({ entity: 'src/b.ts', status: 'new', fingerprint: 'b' }),
      ],
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
