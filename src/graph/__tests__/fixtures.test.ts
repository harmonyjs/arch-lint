/**
 * @fileoverview Drives every resolver fixture project against its expected.json.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runFixture } from './fixture-runner.js';

const fixturesDir = join(import.meta.dirname, 'fixtures');

describe('resolver fixtures', () => {
  const cases = existsSync(fixturesDir)
    ? readdirSync(fixturesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];
  it('discovers at least one fixture', () => {
    expect(cases.length).toBeGreaterThan(0);
  });
  for (const name of cases) {
    it(`fixture: ${name}`, async () => {
      const { actual, expected } = await runFixture(name);
      expect(actual).toEqual(expected);
    });
  }
});
