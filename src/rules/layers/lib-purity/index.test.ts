/**
 * @fileoverview Tests for the lib-purity rule.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { libPurityRule } from './index.js';

function cfg(): ResolvedConfig {
  return {
    conventions: {
      privateSegment: 'slots',
      sharedSegment: 'items',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    },
  } as unknown as ResolvedConfig;
}

/** Builds an in-memory project seeded with file id → source text. */
function project(files: Readonly<Record<string, string>>): Project {
  const p = new Project({ useInMemoryFileSystem: true });
  for (const [id, text] of Object.entries(files)) {
    p.createSourceFile(id, text);
  }
  return p;
}

describe('libPurityRule', () => {
  it('has the canonical metadata', () => {
    expect(libPurityRule.id).toBe('lib-purity');
    expect(libPurityRule.pack).toBe('layers');
    expect(libPurityRule.engine).toBe('syntactic');
    expect(libPurityRule.defaultSeverity).toBe('error');
  });

  it('is a no-op when forbiddenImports is empty', () => {
    const g = makeGraph({ nodes: { 'src/lib/util.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      options: { forbiddenImports: [] },
      project: project({ 'src/lib/util.ts': "import { useState } from 'react';" }),
    });
    expect(libPurityRule.check(g, cfg(), ctx)).toEqual([]);
  });

  it('flags a forbidden exact-package import', () => {
    const g = makeGraph({ nodes: { 'src/lib/util.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'] },
      project: project({ 'src/lib/util.ts': "import { useState } from 'react';" }),
    });
    const out = libPurityRule.check(g, cfg(), ctx);
    const d = only(out);
    expect(d.ruleId).toBe('lib-purity');
    expect(d.actual).toBe('react');
  });

  it('flags a forbidden glob-package import via picomatch', () => {
    const g = makeGraph({ nodes: { 'src/lib/util.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['@react-aria/*'] },
      project: project({ 'src/lib/util.ts': "import { useButton } from '@react-aria/button';" }),
    });
    expect(libPurityRule.check(g, cfg(), ctx)).toHaveLength(1);
  });

  it('ignores relative imports — only external packages count', () => {
    const g = makeGraph({ nodes: { 'src/lib/util.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'] },
      project: project({ 'src/lib/util.ts': "import { x } from './react';" }),
    });
    expect(libPurityRule.check(g, cfg(), ctx)).toEqual([]);
  });

  it('flags an export-from re-export of a forbidden package', () => {
    const g = makeGraph({ nodes: { 'src/lib/util.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'] },
      project: project({ 'src/lib/util.ts': "export { useState } from 'react';" }),
    });
    expect(libPurityRule.check(g, cfg(), ctx)).toHaveLength(1);
  });
});

describe('libPurityRule enforceForSegments', () => {
  it('only flags files under the listed segments', () => {
    const g = makeGraph({
      nodes: { 'src/lib/util.ts': { kind: 'file' }, 'src/App/widget.ts': { kind: 'file' } },
    });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'], enforceForSegments: ['lib'] },
      project: project({
        'src/lib/util.ts': "import { a } from 'react';",
        'src/App/widget.ts': "import { b } from 'react';",
      }),
    });
    const out = libPurityRule.check(g, cfg(), ctx);
    expect(only(out).entity).toBe('src/lib/util.ts');
  });

  it("flags every file when enforceForSegments is 'all'", () => {
    const g = makeGraph({
      nodes: { 'src/lib/util.ts': { kind: 'file' }, 'src/App/widget.ts': { kind: 'file' } },
    });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'], enforceForSegments: 'all' },
      project: project({
        'src/lib/util.ts': "import { a } from 'react';",
        'src/App/widget.ts': "import { b } from 'react';",
      }),
    });
    expect(libPurityRule.check(g, cfg(), ctx)).toHaveLength(2);
  });
});

describe('libPurityRule import forms', () => {
  function single(src: string) {
    const g = makeGraph({ nodes: { 'src/lib/util.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'] },
      project: project({ 'src/lib/util.ts': src }),
    });
    return libPurityRule.check(g, cfg(), ctx);
  }

  it("flags a forbidden default import with the 'default' symbol", () => {
    const out = single("import React from 'react';");
    expect(only(out).fingerprint).toBe('src/lib/util.ts#react#default');
  });

  it('flags a forbidden namespace import with the binding symbol', () => {
    const out = single("import * as React from 'react';");
    expect(only(out).fingerprint).toBe('src/lib/util.ts#react#React');
  });

  it('flags a forbidden side-effect-only import with an empty symbol', () => {
    const out = single("import 'react';");
    expect(only(out).fingerprint).toBe('src/lib/util.ts#react#');
  });

  it('flags a forbidden wildcard re-export with an empty symbol', () => {
    const out = single("export * from 'react';");
    expect(only(out).fingerprint).toBe('src/lib/util.ts#react#');
  });

  it('ignores a local export with no module specifier', () => {
    const out = single('const x = 1;\nexport { x };');
    expect(out).toEqual([]);
  });

  it('skips a file absent from the parsed project', () => {
    const g = makeGraph({ nodes: { 'src/lib/missing.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'] },
      project: project({}),
    });
    expect(libPurityRule.check(g, cfg(), ctx)).toEqual([]);
  });
});

describe('libPurityRule fingerprint', () => {
  it('sets a file#specifier#symbol fingerprint', () => {
    const g = makeGraph({ nodes: { 'src/lib/util.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'] },
      project: project({ 'src/lib/util.ts': "import { useState } from 'react';" }),
    });
    const out = libPurityRule.check(g, cfg(), ctx);
    expect(only(out).fingerprint).toBe('src/lib/util.ts#react#useState');
  });

  it('deduplicates two identical forbidden imports', () => {
    const g = makeGraph({ nodes: { 'src/lib/util.ts': { kind: 'file' } } });
    const ctx = makeContext('lib-purity', {
      severity: 'error',
      options: { forbiddenImports: ['react'] },
      project: project({
        'src/lib/util.ts':
          "import { useState } from 'react';\nimport { useState as u } from 'react';",
      }),
    });
    // Two declarations both import the binding `useState` (the alias source) from react.
    const out = libPurityRule.check(g, cfg(), ctx);
    expect(out.filter((d) => d.fingerprint === 'src/lib/util.ts#react#useState')).toHaveLength(1);
  });
});
