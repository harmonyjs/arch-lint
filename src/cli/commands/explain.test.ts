/**
 * @fileoverview Tests for the `explain <rule-id>` command.
 */
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runExplain } from './explain.js';

vi.mock('../../rules/index.js', () => ({
  allRules: [{ id: 'lca-placement' }, { id: 'layer-boundary' }],
}));

vi.mock('../../paths.js', () => ({
  ruleDocPath: (ruleId: string) => `/docs/rules/${ruleId}.md`,
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const readFileMock = vi.mocked(readFile);

afterEach(() => {
  vi.clearAllMocks();
});

describe('runExplain', () => {
  it('returns the doc text with exit code 0 for a known rule', async () => {
    readFileMock.mockResolvedValue('# lca-placement\n\nKeep modules at their LCA.');

    const outcome = await runExplain('lca-placement');

    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain('Keep modules at their LCA.');
    expect(readFileMock).toHaveBeenCalledWith('/docs/rules/lca-placement.md', 'utf8');
  });

  it('returns exit code 2 and lists the known rules for an unknown rule id', async () => {
    const outcome = await runExplain('does-not-exist');

    expect(outcome.exitCode).toBe(2);
    expect(outcome.stdout).toContain('Unknown rule: does-not-exist');
    expect(outcome.stdout).toContain('lca-placement');
    expect(outcome.stdout).toContain('layer-boundary');
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('returns exit code 2 when the doc file read rejects', async () => {
    readFileMock.mockRejectedValue(new Error('ENOENT'));

    const outcome = await runExplain('layer-boundary');

    expect(outcome.exitCode).toBe(2);
    expect(outcome.stdout).toContain('not available');
    expect(outcome.stdout).toContain('layer-boundary');
  });
});
