/**
 * @fileoverview Tests for `runCli` dispatch — verifies argv routes to the right
 * command adapter, the argument is forwarded, the verdict exit code is applied,
 * and a thrown error maps onto the correct process exit code. The four command
 * adapters are mocked at their module seams.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphBuildError } from '../errors/index.js';

const runCheckCommandMock = vi.fn();
vi.mock('./check.js', () => ({
  runCheckCommand: (...args: unknown[]): unknown => runCheckCommandMock(...args),
}));

const runWatchMock = vi.fn();
vi.mock('./watch.js', () => ({
  runWatch: (...args: unknown[]): unknown => runWatchMock(...args),
}));

const runExplainMock = vi.fn();
vi.mock('./explain.js', () => ({
  runExplain: (...args: unknown[]): unknown => runExplainMock(...args),
}));

const runBaselineInitMock = vi.fn();
const runBaselineDiffMock = vi.fn();
const runBaselinePruneMock = vi.fn();
vi.mock('./baseline.js', () => ({
  runBaselineInit: (...args: unknown[]): unknown => runBaselineInitMock(...args),
  runBaselineDiff: (...args: unknown[]): unknown => runBaselineDiffMock(...args),
  runBaselinePrune: (...args: unknown[]): unknown => runBaselinePruneMock(...args),
}));

const { runCli } = await import('./cli.js');

/** A node-style argv with the two leading `[node, script]` placeholders. */
function argv(...args: string[]): readonly string[] {
  return ['node', 'arch-lint', ...args];
}

beforeEach(() => {
  process.exitCode = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
  process.exitCode = undefined;
});

describe('runCli', () => {
  it('dispatches `check` and applies its verdict exit code', async () => {
    runCheckCommandMock.mockResolvedValue({ stdout: 'report', stderr: [], exitCode: 1 });

    await runCli(argv('check'));

    expect(runCheckCommandMock).toHaveBeenCalledTimes(1);
    expect(runCheckCommandMock.mock.calls[0]![0]).toMatchObject({ changedOnly: false });
    expect(process.exitCode).toBe(1);
  });

  it('passes --changed-only through to the check adapter', async () => {
    runCheckCommandMock.mockResolvedValue({ stdout: '', stderr: [], exitCode: 0 });

    await runCli(argv('check', '--changed-only'));

    expect(runCheckCommandMock.mock.calls[0]![0]).toMatchObject({ changedOnly: true });
    expect(process.exitCode).toBe(0);
  });

  it('forwards the rule id argument to `explain`', async () => {
    runExplainMock.mockResolvedValue({ stdout: 'docs', exitCode: 0 });

    await runCli(argv('explain', 'lca-placement'));

    expect(runExplainMock).toHaveBeenCalledWith('lca-placement');
    expect(process.exitCode).toBe(0);
  });

  it('maps a thrown GraphBuildError onto exit code 3', async () => {
    runCheckCommandMock.mockRejectedValue(new GraphBuildError('graph blew up'));

    await runCli(argv('check'));

    expect(process.exitCode).toBe(3);
  });

  it('maps an unexpected Error onto exit code 5', async () => {
    runCheckCommandMock.mockRejectedValue(new Error('something unexpected'));

    await runCli(argv('check'));

    expect(process.exitCode).toBe(5);
  });

  it('rejects `--rules ... baseline prune` with exit code 2 and never runs prune', async () => {
    await runCli(argv('--rules', 'layer-boundary', 'baseline', 'prune'));

    expect(runBaselinePruneMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(2);
  });

  it('closes the watch session when SIGINT is received', async () => {
    let resolveClose: (() => void) | undefined;
    const close = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClose = resolve;
        }),
    );
    runWatchMock.mockResolvedValue({ close });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await runCli(argv('watch'));

      expect(runWatchMock).toHaveBeenCalledTimes(1);
      expect(close).not.toHaveBeenCalled();

      process.emit('SIGINT');

      expect(close).toHaveBeenCalledTimes(1);

      resolveClose?.();
      await Promise.resolve();

      expect(exitSpy).toHaveBeenCalledWith(0);
    } finally {
      exitSpy.mockRestore();
    }
  });
});
