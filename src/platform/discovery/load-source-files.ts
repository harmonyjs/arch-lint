/**
 * @fileoverview Source-file discovery — walks the project source root, builds
 * the ts-morph Project that backs syntactic graph analysis (without
 * type-checker program resolution), and returns it as a SourceFileSet.
 */
import { realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import picomatch from 'picomatch';
import { glob } from 'tinyglobby';
import { Project, type SourceFile } from 'ts-morph';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { baseNameOf } from '#foundation/entity-id/index.js';
import { DEPENDENCY_DIR, isTestFile } from '#foundation/file-classification/index.js';
import type { SourceFileSet } from '#foundation/source-files/index.js';

export interface DiscoverOptions {
  readonly cwd: string;
  readonly sourceRoot: string;
  readonly extensions: readonly string[];
  readonly ignore: readonly string[];
}

/**
 * Walks `sourceRoot` under `cwd`, keeps files matching `extensions`, drops paths
 * matched by any `ignore` glob. Returns POSIX file ids relative to `cwd`, sorted.
 */
export async function discoverSourceFilePaths(options: DiscoverOptions): Promise<string[]> {
  const extGlob = options.extensions.map((e) => e.replace(/^\./, '')).join(',');
  const patterns = [`${options.sourceRoot}/**/*.{${extGlob}}`];
  const found = await glob(patterns, {
    cwd: options.cwd,
    absolute: false,
    onlyFiles: true,
    dot: false,
    ignore: [`**/${DEPENDENCY_DIR}/**`],
  });
  const isIgnored = picomatch(options.ignore as string[], { dot: true });
  return found
    .map((p) => p.split('\\').join('/'))
    .filter((p) => options.ignore.length === 0 || !isIgnored(p))
    .sort();
}

/**
 * Discovers source files and parses them into a ts-morph Project created without
 * program/type resolution (`skipFileDependencyResolution`). The returned registry
 * maps POSIX file ids (relative to cwd) to their parsed SourceFile.
 */
export async function loadSourceFiles(config: ResolvedConfig): Promise<SourceFileSet> {
  // The resolver hands back real paths; ids taken against a symlinked cwd would never match them.
  const cwd = realpathSync(resolve(config.project.cwd));
  const tsConfigFilePath = resolve(cwd, config.project.tsconfig);
  const project = new Project({
    tsConfigFilePath,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
  });
  const census = await discoverSourceFilePaths({
    cwd,
    sourceRoot: config.project.sourceRoot,
    extensions: config.resolve.extensions,
    ignore: config.ignore,
  });
  const files = new Map<string, SourceFile>();
  for (const id of census) {
    if (isTestFile(baseNameOf(id))) continue;
    files.set(id, project.addSourceFileAtPath(resolve(cwd, id)));
  }
  return { project, files, census, rootDir: join(cwd, config.project.sourceRoot), cwd };
}
