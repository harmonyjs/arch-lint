/**
 * @fileoverview End-to-end test of the shipped package inside a consumer whose
 * node_modules/typescript is TypeScript 7, which exports no compiler API. The
 * consumer tree is assembled from the files the package ships plus its runtime
 * dependencies, so the test needs neither the registry nor npm.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { packageRoot } from '#runner/paths.js';

const root = packageRoot();

/** The root export of typescript@7.0.2 verbatim: a version, no compiler. */
const TS7_PACKAGE = {
  name: 'typescript',
  version: '7.0.2',
  type: 'module',
  exports: { '.': './lib/version.cjs', './package.json': './package.json' },
};
const TS7_VERSION_CJS = [
  'const { version } = require("../package.json");',
  'exports.version = version;',
  'exports.versionMajorMinor = "7.0";',
  '',
].join('\n');

interface Manifest {
  readonly files: readonly string[];
  readonly dependencies: Readonly<Record<string, string>>;
}

function write(dir: string, file: string, content: string): void {
  mkdirSync(join(dir, dirname(file)), { recursive: true });
  writeFileSync(join(dir, file), content);
}

/** Lays out <consumer>/node_modules as an install of this package next to TS 7. */
function installInto(consumer: string): string {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Manifest;
  const pkgDir = join(consumer, 'node_modules', '@avavilov', 'arch-lint');
  mkdirSync(pkgDir, { recursive: true });
  cpSync(join(root, 'package.json'), join(pkgDir, 'package.json'));
  for (const entry of manifest.files) {
    cpSync(join(root, entry), join(pkgDir, entry), { recursive: true });
  }
  for (const dep of Object.keys(manifest.dependencies)) {
    symlinkSync(join(root, 'node_modules', dep), join(consumer, 'node_modules', dep), 'dir');
  }
  write(consumer, 'node_modules/typescript/package.json', JSON.stringify(TS7_PACKAGE));
  write(consumer, 'node_modules/typescript/lib/version.cjs', TS7_VERSION_CJS);
  return pkgDir;
}

let consumer: string;
let pkgDir: string;

beforeAll(() => {
  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  consumer = mkdtempSync(join(tmpdir(), 'arch-lint-consumer-ts7-'));
  cpSync(join(root, 'src', 'fixtures', 'sample-project'), consumer, { recursive: true });
  write(
    consumer,
    'package.json',
    JSON.stringify({
      name: 'consumer',
      version: '1.0.0',
      devDependencies: { typescript: '7.0.2' },
    }),
  );
  pkgDir = installInto(consumer);
}, 120_000);

describe('shipped package next to TypeScript 7', () => {
  it('the consumer resolves a typescript that has no compiler API', () => {
    const probe =
      "import ts from 'typescript'; console.log(ts.version, typeof ts.resolveModuleName);";
    const result = spawnSync('node', ['--input-type=module', '-e', probe], {
      cwd: consumer,
      encoding: 'utf8',
    });
    expect(result.stdout.trim()).toBe('7.0.2 undefined');
  });

  it('lints the consumer cleanly', () => {
    const result = spawnSync('node', [join(pkgDir, 'bin', 'arch-lint.js'), 'check'], {
      cwd: consumer,
      encoding: 'utf8',
    });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No architecture violations found.');
  });
});
