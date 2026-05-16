/**
 * @fileoverview Determines the changed-file set for `--changed-only` runs by
 * diffing against a git base. `--changed-only` is a reporting filter, never a
 * gate — on a shallow clone with no common ancestor the report is not narrowed.
 */

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
