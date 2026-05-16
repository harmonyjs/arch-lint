/**
 * @fileoverview Determines the changed-file set for `--changed-only` runs by
 * diffing against a git base. `--changed-only` is a reporting filter, never a
 * gate — on a shallow clone with no common ancestor the report is not narrowed.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ConsumerGraph, Diagnostic } from '../types.js';

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

/**
 * Computes the affected entity set for `--changed-only` reporting: the changed
 * files, the files they import (producers), and the files importing them
 * (consumers). Verdicts are still computed on the full graph.
 */
export function affectedEntities(
  changedFiles: readonly string[],
  graph: ConsumerGraph,
): ReadonlySet<string> {
  const set = new Set<string>(changedFiles);
  for (const file of changedFiles) {
    for (const e of graph.edges) {
      if (e.consumer === file) set.add(e.producer);
      if (e.producer === file) set.add(e.consumer);
    }
  }
  return set;
}

/**
 * Narrows diagnostics to those whose `entity` is in the affected set.
 * A `null` filter (no changed-only run, or safe degradation) keeps all.
 */
export function filterToAffected(
  diagnostics: readonly Diagnostic[],
  affected: ReadonlySet<string> | null,
): readonly Diagnostic[] {
  if (affected === null) return diagnostics;
  return diagnostics.filter((d) => affected.has(d.entity));
}
