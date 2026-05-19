/**
 * @fileoverview Integration test for cross-cutting-concern — full check() pipeline over a fixture.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/god-module', import.meta.url));

describe('cross-cutting-concern — integration', () => {
  it('flags a god module that trips every signal', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'cross-cutting-concern',
      config: {
        units: {
          god: 'god/**',
          in1: 'in1/**',
          in2: 'in2/**',
          in3: 'in3/**',
          in4: 'in4/**',
          in5: 'in5/**',
          out1: 'out1/**',
          out2: 'out2/**',
          out3: 'out3/**',
          out4: 'out4/**',
        },
      },
    });
    expect(diags.length).toBe(1);
    const [diag] = diags;
    expect(diag?.ruleId).toBe('cross-cutting-concern');
    expect(diag?.entity).toBe('god');
    expect(diag?.fingerprint).toBe('cross-cutting-concern#god');
    expect(diag?.message).toBe('unit god is a cross-cutting concern');
  });
});
