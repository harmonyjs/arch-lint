/**
 * @fileoverview Determines the changed-file set for `--changed-only` runs by
 * diffing against a git base. `--changed-only` is a reporting filter, never a
 * gate — on a shallow clone with no common ancestor the report is not narrowed.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * Builds `git diff` arguments. Without a base ref the diff is against HEAD
 * (staged + unstaged changes). With a base ref the third argument is a
 * placeholder that the caller replaces with the resolved merge-base commit.
 */
export function gitDiffArgs(base: string | undefined): readonly string[] {
  return ['diff', '--name-only', base === undefined ? 'HEAD' : '<merge-base>'];
}

/** Parses `git diff --name-only` stdout into a list of repo-relative paths. */
export function parseDiffOutput(stdout: string): readonly string[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Result of changed-file detection. `null` = could not narrow -> report all. */
export type ChangedFilesResult = readonly string[] | null;

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const { stdout } = await run('git', [...args], { cwd, maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

/**
 * Returns the changed-file set relative to a git base, or `null` when it
 * cannot be determined (no common ancestor on a shallow clone, or git fails) —
 * the caller then reports every diagnostic plus a warning.
 */
export async function getChangedFiles(
  cwd: string,
  base: string | undefined,
): Promise<ChangedFilesResult> {
  try {
    let diffArgs = gitDiffArgs(base);
    if (base !== undefined) {
      const mergeBase = (await git(cwd, ['merge-base', 'HEAD', base])).trim();
      if (mergeBase.length === 0) return null;
      diffArgs = diffArgs.map((a) => (a === '<merge-base>' ? mergeBase : a));
    }
    return parseDiffOutput(await git(cwd, diffArgs));
  } catch {
    return null;
  }
}
