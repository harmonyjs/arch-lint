/**
 * @fileoverview Post-implementation tests for git-backed changed-file
 * detection. Each test builds a throwaway git repo in a temp dir.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getChangedFiles } from './changed-files.js';

let repo: string;
const g = (...a: string[]): void => {
  execFileSync('git', a, { cwd: repo, stdio: 'ignore' });
};

/** Reads the default branch name `git init` created (varies: master vs main). */
function defaultBranch(): string {
  return execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: repo }).toString().trim();
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'arch-lint-cf-'));
  g('init', '-q');
  g('config', 'user.email', 't@t.t');
  g('config', 'user.name', 't');
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'src', 'a.ts'), 'export const a = 1;\n');
  g('add', '.');
  g('commit', '-q', '-m', 'init');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('getChangedFiles', () => {
  it('without base reports uncommitted changes against HEAD', async () => {
    writeFileSync(join(repo, 'src', 'a.ts'), 'export const a = 2;\n');
    expect(await getChangedFiles(repo, undefined)).toEqual(['src/a.ts']);
  });

  it('with base reports what the branch added since merge-base', async () => {
    const base = defaultBranch();
    g('checkout', '-q', '-b', 'feat');
    writeFileSync(join(repo, 'src', 'b.ts'), 'export const b = 1;\n');
    g('add', '.');
    g('commit', '-q', '-m', 'add b');
    const changed = await getChangedFiles(repo, base);
    expect(changed).toContain('src/b.ts');
  });

  it('returns null when git is unavailable (non-repo dir)', async () => {
    const nonRepo = mkdtempSync(join(tmpdir(), 'arch-lint-nonrepo-'));
    expect(await getChangedFiles(nonRepo, undefined)).toBeNull();
    rmSync(nonRepo, { recursive: true, force: true });
  });
});
