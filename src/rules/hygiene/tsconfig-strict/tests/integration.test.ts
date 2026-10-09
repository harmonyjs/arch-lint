/**
 * @fileoverview Integration test for tsconfig-strict — full check() pipeline over a fixture.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type FixtureRun, runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/loose-tsconfig', import.meta.url));

/** A project whose tsconfig leaves strict unset, with the given TypeScript installed. */
function projectCompiledBy(typescriptVersion: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'arch-lint-tsstrict-unset-'));
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'node_modules', 'typescript'), { recursive: true });
  writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{},"include":["src"]}\n');
  writeFileSync(join(dir, 'src', 'placeholder.ts'), 'export const placeholder = 1;\n');
  writeFileSync(
    join(dir, 'node_modules', 'typescript', 'package.json'),
    JSON.stringify({ name: 'typescript', version: typescriptVersion }),
  );
  return dir;
}

const recommended: FixtureRun['config'] = {
  rules: { 'tsconfig-strict': { preset: 'recommended', severity: 'error' } },
};

describe('tsconfig-strict — strict left unset', () => {
  it('is flagged when the project compiles with TypeScript 5', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot: projectCompiledBy('5.9.3'),
      ruleId: 'tsconfig-strict',
      config: recommended,
    });
    expect(diags.map((d) => d.fingerprint)).toEqual(['strict']);
    expect(diags[0]?.actual).toBe('strict is not set');
  });

  it('passes when the project compiles with TypeScript 6, which defaults strict on', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot: projectCompiledBy('6.0.3'),
      ruleId: 'tsconfig-strict',
      config: recommended,
    });
    expect(diags).toEqual([]);
  });
});

describe('tsconfig-strict — integration', () => {
  it('flags a tsconfig with strict mode off', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'tsconfig-strict',
      // `recommended` keeps the required set to `strict` alone; `severity` is set
      // explicitly because a rule-options object without it resolves to 'warning'.
      config: { rules: { 'tsconfig-strict': { preset: 'recommended', severity: 'error' } } },
    });
    expect(diags.length).toBeGreaterThanOrEqual(1);
    expect(diags.some((d) => d.entity === 'tsconfig.json')).toBe(true);

    // recommended preset requires exactly one flag — `strict` — so the loose
    // fixture (`strict: false`) yields a single diagnostic fingerprinted on it.
    expect(diags).toHaveLength(1);
    const diag = diags[0];
    expect(diag?.ruleId).toBe('tsconfig-strict');
    expect(diag?.severity).toBe('error');
    expect(diag?.entity).toBe('tsconfig.json');
    expect(diag?.fingerprint).toBe('strict');
    expect(diag?.message).toBe('compilerOptions.strict must be enabled');
  });
});
