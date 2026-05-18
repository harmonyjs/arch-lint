/**
 * @fileoverview Tests for the `check` command adapter — it translates CLI
 * flags into a `RunCheckOptions`, runs the check, and projects the outcome
 * onto a process-pure shape. The I/O seams `runCheck` reaches are mocked so
 * the adapter's flag translation is observed at the engine boundary.
 */
import type { Project } from 'ts-morph';
import { Project as TsProject } from 'ts-morph';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { ConsumerGraph } from '#platform/graph/types.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';

// ── Mocked seams ─────────────────────────────────────────────────────────────

const loadConfigMock = vi.fn();
const resolveConfigMock = vi.fn();
vi.mock('#foundation/config/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#foundation/config/index.js')>();
  return {
    ...actual,
    loadConfig: (...args: unknown[]): unknown => loadConfigMock(...args),
    resolveConfig: (...args: unknown[]): unknown => resolveConfigMock(...args),
  };
});

const buildGraphFromSourcesMock = vi.fn();
vi.mock('#platform/graph/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#platform/graph/index.js')>();
  return {
    ...actual,
    buildGraphFromSources: (...args: unknown[]): unknown => buildGraphFromSourcesMock(...args),
  };
});

const loadSourceFilesMock = vi.fn();
vi.mock('#platform/graph/discover-source-files.js', () => ({
  loadSourceFiles: (...args: unknown[]): unknown => loadSourceFilesMock(...args),
}));

const buildSuppressIndexMock = vi.fn();
vi.mock('#foundation/suppress/suppress-index.js', () => ({
  buildSuppressIndex: (...args: unknown[]): unknown => buildSuppressIndexMock(...args),
}));

const runEngineMock = vi.fn();
vi.mock('#platform/engine/index.js', () => ({
  runEngine: (...args: unknown[]): unknown => runEngineMock(...args),
}));

const formatReportMock = vi.fn();
vi.mock('#report/index.js', () => ({
  formatReport: (...args: unknown[]): unknown => formatReportMock(...args),
}));

const getChangedFilesMock = vi.fn();
vi.mock('#runner/changed-files.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#runner/changed-files.js')>();
  return {
    ...actual,
    getChangedFiles: (...args: unknown[]): unknown => getChangedFilesMock(...args),
  };
});

const { runCheckCommand } = await import('#runner/check.js');

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
      preCommit: { rules: 'all', maxDurationMs: 5000, failOnViolations: false },
      ci: { failOnViolations: true },
    },
    report: { cli: {} },
    packs: [],
    units: {},
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
    project: new TsProject({ useInMemoryFileSystem: true }) as Project,
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

describe('runCheckCommand', () => {
  it('runs a plain check as a ci verdict with changed-only off', async () => {
    arrange({ diagnostics: [] });

    const outcome = await runCheckCommand({
      cwd: '/repo',
      changedOnly: false,
      telemetry: false,
      noBaseline: false,
    });

    // No config path forwarded — loadConfig is called with cwd and no override.
    expect(loadConfigMock.mock.calls[0]?.slice(0, 2)).toEqual(['/repo', undefined]);
    // changed-only off — the git base is never consulted.
    expect(getChangedFilesMock).not.toHaveBeenCalled();
    // No rule filter — runEngine receives undefined as its rule-filter argument.
    expect(only(runEngineMock.mock.calls)[1]).toBeUndefined();
    expect(outcome).toEqual({ stdout: 'report-text', stderr: [], exitCode: 0 });
  });

  it('runs --changed-only as a preCommit verdict and forwards warnings + exit code', async () => {
    arrange({ diagnostics: [diagnostic({ status: 'new' })] });
    getChangedFilesMock.mockResolvedValueOnce(null);

    const outcome = await runCheckCommand({
      cwd: '/repo',
      configPath: '/repo/arch-lint.config.ts',
      changedOnly: true,
      telemetry: false,
      noBaseline: true,
      base: 'origin/main',
      ruleFilter: ['layer-boundary'],
    });

    // The config path is forwarded to config loading.
    expect(loadConfigMock.mock.calls[0]?.slice(0, 2)).toEqual([
      '/repo',
      '/repo/arch-lint.config.ts',
    ]);
    // changed-only on — the git base is consulted with the supplied ref.
    expect(getChangedFilesMock).toHaveBeenCalledWith('/repo', 'origin/main');
    // The rule filter reaches the engine.
    expect(only(runEngineMock.mock.calls)[1]).toEqual(['layer-boundary']);
    // preCommit verdict does not fail on violations, so a new violation is exit 0.
    expect(outcome.stdout).toBe('report-text');
    expect(outcome.stderr).toEqual([
      'changed-only: could not determine the git base — reporting all violations',
    ]);
    expect(outcome.exitCode).toBe(0);
  });
});
