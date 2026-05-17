/**
 * @fileoverview Drives every resolver fixture project against its expected.json.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runFixture } from './fixture-runner.js';

const fixturesDir = import.meta.dirname;

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
