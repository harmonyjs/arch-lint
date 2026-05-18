/**
 * @fileoverview Tests for the graph command adapter.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GraphBuildError, IOError } from '#foundation/errors/index.js';
import { runGraphCommand } from '#runner/graph.js';

let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'arch-lint-graph-'));
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2023',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        rootDir: 'src',
      },
      include: ['src'],
    }),
  );
  await writeFile(
    join(dir, 'arch-lint.config.mjs'),
    `export default { project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: ${JSON.stringify(dir)} }, baseline: { missingBehavior: 'ignore' } };`,
  );
  await writeFile(join(dir, 'src', 'a.ts'), '/** @fileoverview A. */\nexport const a = 1;\n');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('runGraphCommand', () => {
  it('returns a Markdown document and exit code 0 for a project', async () => {
    const outcome = await runGraphCommand({ cwd: dir });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain('# Project dependency graph');
  });

  it('writes to the --out file and leaves stdout empty when out is set', async () => {
    const outPath = join(dir, 'graph.md');
    const outcome = await runGraphCommand({ cwd: dir, out: outPath });
    expect(outcome.stdout).toBe('');
    expect(await readFile(outPath, 'utf8')).toContain('# Project dependency graph');
  });

  it('limits the document to a single subsystem when --subsystem is set', async () => {
    const outcome = await runGraphCommand({ cwd: dir, subsystem: 'src' });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain('# Project dependency graph');
  });

  it('wraps a graph-build failure in a GraphBuildError', async () => {
    // Point the config at a tsconfig that does not exist — ts-morph throws a
    // plain Error during project construction, which the command must wrap.
    await writeFile(
      join(dir, 'arch-lint.config.mjs'),
      `export default { project: { tsconfig: './missing-tsconfig.json', sourceRoot: 'src', cwd: ${JSON.stringify(dir)} }, baseline: { missingBehavior: 'ignore' } };`,
    );
    await expect(runGraphCommand({ cwd: dir })).rejects.toBeInstanceOf(GraphBuildError);
  });

  it('raises an IOError when the --out destination cannot be written', async () => {
    // A path nested under a non-existent directory makes writeFile fail ENOENT.
    const unwritable = join(dir, 'no-such-dir', 'graph.md');
    await expect(runGraphCommand({ cwd: dir, out: unwritable })).rejects.toBeInstanceOf(IOError);
  });
});
