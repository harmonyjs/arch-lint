/**
 * @fileoverview Tests for the file-description-required rule of the perfile pack.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { perfileTestGraph } from '../../test-support/perfile-test-graph.js';
import { only } from '../../test-support/only.js';
import { fileDescriptionRequired } from './index.js';

const CONFIG = {} as ResolvedConfig;

function run(files: Record<string, string>, options: Record<string, unknown> = {}) {
  const graph = perfileTestGraph(files);
  const ctx = makeContext('file-description-required', { project: graph.project, options });
  return fileDescriptionRequired.check(graph, CONFIG, ctx);
}

describe('file-description-required', () => {
  it('passes a file with a leading multiline @fileoverview block', () => {
    const ds = run({
      'src/a.ts':
        '/**\n * @fileoverview Loads the user profile data layer.\n */\nexport const a = 1;\n',
    });
    expect(ds).toEqual([]);
  });

  it('passes an import-first file with a leading multiline @fileoverview block', () => {
    const ds = run({
      'src/a.ts':
        '/**\n * @fileoverview Loads the user profile data layer.\n */\nimport { join } from "node:path";\nexport const a = join("x");\n',
    });
    expect(ds).toEqual([]);
  });

  it('flags a file with no leading JSDoc', () => {
    const ds = run({ 'src/a.ts': 'export const a = 1;\n' });
    const d = only(ds);
    expect(d.ruleId).toBe('file-description-required');
    expect(d.fingerprint).toBe('src/a.ts');
  });

  it('flags a single-line @fileoverview comment', () => {
    const ds = run({ 'src/a.ts': '/** @fileoverview Loads data. */\nexport const a = 1;\n' });
    expect(ds).toHaveLength(1);
  });

  it('flags a leading block missing the tag', () => {
    const ds = run({ 'src/a.ts': '/**\n * Some description here.\n */\nexport const a = 1;\n' });
    expect(ds).toHaveLength(1);
  });

  it('flags a description shorter than minLength', () => {
    const ds = run({ 'src/a.ts': '/**\n * @fileoverview short\n */\nexport const a = 1;\n' });
    expect(ds).toHaveLength(1);
  });

  it('allows a shebang above the JSDoc block', () => {
    const ds = run({
      'src/cli.ts':
        '#!/usr/bin/env node\n/**\n * @fileoverview CLI entry point bootstrap.\n */\nexport const x = 1;\n',
    });
    expect(ds).toEqual([]);
  });

  it('honours a custom tag and a zero minLength', () => {
    const ds = run(
      { 'src/a.ts': '/**\n * @file ok\n */\nexport const a = 1;\n' },
      { tag: '@file', minLength: 0 },
    );
    expect(ds).toEqual([]);
  });

  it('skips a node whose source file is absent from the project', () => {
    const graph = makeGraph({ nodes: { 'src/ghost.ts': { kind: 'file' } }, files: {} });
    const ctx = makeContext('file-description-required', { project: graph.project });
    expect(fileDescriptionRequired.check(graph, CONFIG, ctx)).toEqual([]);
  });
});
