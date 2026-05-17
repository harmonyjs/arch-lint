/**
 * @fileoverview Tests for the published `bin/arch-lint.js` shim — it must carry
 * the node shebang and delegate to the compiled CLI, passing argv through.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { packageRoot } from '../paths.js';

describe('bin/arch-lint.js', () => {
  it('is a node shebang shim that delegates to the compiled CLI', async () => {
    const shim = await readFile(join(packageRoot(), 'bin', 'arch-lint.js'), 'utf8');

    expect(shim.startsWith('#!/usr/bin/env node\n')).toBe(true);
    expect(shim).toContain('../dist/runner/index.js');
    expect(shim).toContain('runCli(process.argv)');
  });
});
