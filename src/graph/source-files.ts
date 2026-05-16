/**
 * @fileoverview Discovers project source files and builds the ts-morph Project that
 * backs syntactic graph analysis — without type-checker program resolution.
 */
import { join, relative, resolve } from 'node:path';
import picomatch from 'picomatch';
import { glob } from 'tinyglobby';
import { Project, type SourceFile } from 'ts-morph';
import type { ResolvedConfig } from '../types.js';
import type { ModuleResolutionContext } from './module-resolution.js';

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
  });
  const isIgnored = picomatch(options.ignore as string[], { dot: true });
  return found
    .map((p) => p.split('\\').join('/'))
    .filter((p) => options.ignore.length === 0 || !isIgnored(p))
    .sort();
}

export interface SourceFileSet {
  readonly project: Project;
  readonly files: ReadonlyMap<string, SourceFile>;
  readonly rootDir: string;
  readonly cwd: string;
}

/**
 * Discovers source files and parses them into a ts-morph Project created without
 * program/type resolution (`skipFileDependencyResolution`). The returned registry
 * maps POSIX file ids (relative to cwd) to their parsed SourceFile.
 */
export async function loadSourceFiles(config: ResolvedConfig): Promise<SourceFileSet> {
  const cwd = resolve(config.project.cwd);
  const tsConfigFilePath = resolve(cwd, config.project.tsconfig);
  const project = new Project({
    tsConfigFilePath,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
  });
  const paths = await discoverSourceFilePaths({
    cwd,
    sourceRoot: config.project.sourceRoot,
    extensions: config.resolve.extensions,
    ignore: config.ignore,
  });
  const files = new Map<string, SourceFile>();
  for (const id of paths) {
    files.set(id, project.addSourceFileAtPath(resolve(cwd, id)));
  }
  return { project, files, rootDir: join(cwd, config.project.sourceRoot), cwd };
}

/** Converts an absolute file path to its POSIX file id relative to the set's cwd. */
export function fileIdOf(absolutePath: string, set: SourceFileSet): string {
  return relative(set.cwd, absolutePath).split('\\').join('/');
}

/** Builds a ModuleResolutionContext backed by the ts-morph Project's compiler state. */
export function moduleResolutionContextOf(set: SourceFileSet): ModuleResolutionContext {
  const program = set.project.getProgram().compilerObject;
  return {
    compilerOptions: program.getCompilerOptions(),
    moduleResolutionHost: set.project.getModuleResolutionHost(),
  };
}
