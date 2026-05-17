/**
 * @fileoverview End-to-end test: runGraphCommand over the sample-app example
 * project produces a valid layered Mermaid document.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runGraphCommand } from './runner/graph.js';

const here = dirname(fileURLToPath(import.meta.url));
const sampleApp = join(here, '..', 'examples', 'sample-app');

describe('graph command end to end', () => {
  it('renders a document for the sample-app example', async () => {
    const outcome = await runGraphCommand({ cwd: sampleApp });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain('# Project dependency graph');
    expect(outcome.stdout).toContain('## Legend');
    expect(outcome.stdout).toContain('```mermaid');
    expect(outcome.stdout).toContain('## Overview');
  });

  it('graphs the sample-app subsystems, not the arch-lint repo', async () => {
    const outcome = await runGraphCommand({ cwd: sampleApp });
    // The top-level folders under examples/sample-app/src/ surface as their
    // own document sections — proof the document reflects the example project
    // rather than arch-lint's own src/.
    expect(outcome.stdout).toContain('## app');
    expect(outcome.stdout).toContain('## domain');
    expect(outcome.stdout).toContain('## support');
    // Files unique to sample-app — arch-lint's own src/ has none of these.
    expect(outcome.stdout).toContain('greeting-service.ts');
    expect(outcome.stdout).toContain('clock-display.ts');
  });
});
