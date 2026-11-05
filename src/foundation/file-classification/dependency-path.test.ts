/**
 * @fileoverview Tests for the dependency-path predicate.
 */
import { describe, expect, it } from 'vitest';
import { isDependencyPath } from './dependency-path.js';

describe('isDependencyPath', () => {
  it('is true for a path inside node_modules at any depth', () => {
    expect(isDependencyPath('node_modules/hono/index.d.ts')).toBe(true);
    expect(isDependencyPath('/repo/apps/web/node_modules/x/a.ts')).toBe(true);
    expect(isDependencyPath('C:\\repo\\node_modules\\x\\a.ts')).toBe(true);
  });

  it('is false for a project path that only mentions the name', () => {
    expect(isDependencyPath('/repo/packages/zero/src/index.ts')).toBe(false);
    expect(isDependencyPath('src/node_modules_docs/a.ts')).toBe(false);
  });
});
