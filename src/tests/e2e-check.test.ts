/**
 * @fileoverview End-to-end test: runCheck over the sample fixture project with
 * no seam mocks. A clean project must produce exit code 0.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runCheck } from '#runner/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, '..', 'fixtures', 'sample-project');

describe('e2e: runCheck on the sample project', () => {
  it('reports no violations and exits 0 for a clean project', async () => {
    const out = await runCheck({
      cwd: fixture,
      configPath: join(fixture, 'arch-lint.config.mjs'),
      mode: 'ci',
      noBaseline: true,
      changedOnly: false,
    });
    expect(out.exitCode).toBe(0);
    expect(out.result.diagnostics).toEqual([]);
    expect(out.report).toBe('No architecture violations found.');
  }, 30_000);

  it('runs in changed-only mode without crashing', async () => {
    const out = await runCheck({
      cwd: fixture,
      configPath: join(fixture, 'arch-lint.config.mjs'),
      mode: 'preCommit',
      noBaseline: true,
      changedOnly: true,
    });
    expect([0, 1]).toContain(out.exitCode);
  }, 30_000);
});
