/**
 * @fileoverview Integration test for runGraphCommand — confirms the topology
 * observations section is present in the rendered document.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { runGraphCommand } from './graph.js';

describe('runGraphCommand — shape integration', () => {
  let outcome: Awaited<ReturnType<typeof runGraphCommand>>;

  beforeAll(async () => {
    outcome = await runGraphCommand({ cwd: process.cwd() });
  });

  it('includes the topology observations section in the rendered document', () => {
    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain('## Topology observations');
  });

  it('positions the topology observations section between Legend and the first section', () => {
    const legendIdx = outcome.stdout.indexOf('## Legend');
    const topologyIdx = outcome.stdout.indexOf('## Topology observations');
    const overviewIdx = outcome.stdout.indexOf('## Overview');
    expect(legendIdx).toBeLessThan(topologyIdx);
    expect(topologyIdx).toBeLessThan(overviewIdx);
  });
});
