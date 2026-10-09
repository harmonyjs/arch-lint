/**
 * @fileoverview End-to-end smoke test for the shipped CLI. It builds the
 * project to `dist/`, then spawns the real `bin/arch-lint.js` as a child
 * process to confirm the bin shim, the compiled CLI, and command dispatch all
 * work together against compiled output — not just the vitest-transpiled src.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { packageRoot } from '#runner/paths.js';

const root = packageRoot();
const binPath = join(root, 'bin', 'arch-lint.js');

beforeAll(() => {
  // The bin shim imports from dist/, so the project must be compiled first.
  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
}, 120_000);

describe('shipped CLI', () => {
  it('emits the compiled CLI entry point', () => {
    expect(existsSync(join(root, 'dist', 'runner', 'index.js'))).toBe(true);
  });

  it('runs `explain` for a known rule', () => {
    const result = spawnSync('node', [binPath, 'explain', 'lca-placement'], { encoding: 'utf8' });
    // 0 when the rule doc is present, 2 when docs/rules/ is absent — both are
    // valid for a known rule id; the run must not crash.
    expect([0, 2]).toContain(result.status);
    expect(`${result.stdout}${result.stderr}`.length).toBeGreaterThan(0);
  });

  it('rejects an unknown rule id with exit code 2', () => {
    const result = spawnSync('node', [binPath, 'explain', 'definitely-not-a-rule'], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toContain('Unknown rule');
  });

  it('accepts a --config path relative to the working directory', () => {
    const fixture = join(root, 'src', 'fixtures', 'sample-project');
    const result = spawnSync('node', [binPath, 'check', '--config', 'arch-lint.config.mjs'], {
      cwd: fixture,
      encoding: 'utf8',
    });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No architecture violations found.');
  });

  it('exits 2 when the --config path does not exist', () => {
    const fixture = join(root, 'src', 'fixtures', 'sample-project');
    const result = spawnSync('node', [binPath, 'check', '--config', 'missing.config.mjs'], {
      cwd: fixture,
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('not found');
  });

  it('prints help that lists every command', () => {
    const result = spawnSync('node', [binPath, '--help'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('check');
    expect(result.stdout).toContain('watch');
    expect(result.stdout).toContain('baseline');
    expect(result.stdout).toContain('explain');
  });
});
