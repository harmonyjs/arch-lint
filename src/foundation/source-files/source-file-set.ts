/**
 * @fileoverview The SourceFileSet — the ts-morph Project plus its discovered
 * file registry and census — the shared vocabulary of source discovery, graph
 * construction and the runner; and fileIdOf, the absolute-path → file-id
 * conversion over it.
 */
import { relative } from 'node:path';
import type { Project, SourceFile } from 'ts-morph';

export interface SourceFileSet {
  readonly project: Project;
  readonly files: ReadonlyMap<string, SourceFile>;
  /**
   * The FileCensus — every file under `sourceRoot` matching `resolve.extensions`,
   * filtered only by the `ignore` globs. Unlike `files`, the census includes test
   * files: they are excluded from the import graph structurally, not from existence.
   */
  readonly census: readonly string[];
  readonly rootDir: string;
  readonly cwd: string;
}

/** Converts an absolute file path to its POSIX file id relative to the set's cwd. */
export function fileIdOf(absolutePath: string, set: SourceFileSet): string {
  return relative(set.cwd, absolutePath).split('\\').join('/');
}
