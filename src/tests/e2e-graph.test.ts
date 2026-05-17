/**
 * @fileoverview End-to-end test: runGraphCommand over the sample fixture
 * project produces a valid layered Mermaid document.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runGraphCommand } from '#runner/graph.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, '..', 'fixtures', 'sample-project');

describe('graph command end to end', () => {
  it('renders a layered Mermaid document for the sample project', async () => {
    const outcome = await runGraphCommand({
      cwd: fixture,
      configPath: join(fixture, 'arch-lint.config.mjs'),
    });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain('# Project dependency graph');
    expect(outcome.stdout).toContain('## Legend');
    expect(outcome.stdout).toContain('```mermaid');
    expect(outcome.stdout).toContain('## Overview');
  }, 30_000);

  it('graphs the sample project — its subsystems and files surface', async () => {
    const outcome = await runGraphCommand({
      cwd: fixture,
      configPath: join(fixture, 'arch-lint.config.mjs'),
    });
    // `App` is a top-level folder under the fixture's src/ — it owns a section.
    // arch-lint's own src/ has no such folder, proving the right project graphed.
    expect(outcome.stdout).toContain('## App');
    expect(outcome.stdout).toContain('util.ts');
  }, 30_000);
});
