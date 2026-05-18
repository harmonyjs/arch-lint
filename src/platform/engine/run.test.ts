/**
 * @fileoverview Tests for runEngine — the §8.1 rule pipeline.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { EngineError } from '#foundation/errors/index.js';
import { NullLogger, NullTelemetry, RecordingTelemetry } from '#foundation/logger/index.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { Rule } from '#platform/engine/types.js';
import { getActiveRules } from '#rules/index.js';
import { makeSuppressIndex } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { type EngineInputs, runEngine } from './run.js';

function cfg(over: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    project: { tsconfig: 't', sourceRoot: 'src', cwd: '/nonexistent', includeOutOfRoot: false },
    conventions: {
      privateSegment: 'slots',
      sharedSegment: 'items',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    },
    packs: ['placement', 'layers', 'meta'],
    layers: {},
    rules: { 'lca-placement': { severity: 'warning', promotionThreshold: 2 } },
    plugins: [],
    ...over,
  } as ResolvedConfig;
}

const emptyProject = new Project({ useInMemoryFileSystem: true });

const strayGraph = makeGraph({
  nodes: {
    'src/App': { kind: 'folder', isEntity: true },
    'src/App/Deep': { kind: 'folder', isEntity: true },
    'src/App/Deep/A': { kind: 'folder', isEntity: true },
    'src/App/Deep/B': { kind: 'folder', isEntity: true },
    'src/App/Stray': { kind: 'folder', isEntity: true },
  },
  entityConsumers: { 'src/App/Stray': ['src/App/Deep/A', 'src/App/Deep/B'] },
});

/** Resolve the active rule set from config, then run the engine — the runner's two-step. */
function run(inputs: EngineInputs, ruleFilter?: readonly string[]): readonly Diagnostic[] {
  return runEngine(inputs, getActiveRules(inputs.config, ruleFilter));
}

describe('runEngine pipeline steps 1-2', () => {
  it('collects diagnostics from active rules', () => {
    const result = run({
      graph: strayGraph,
      config: cfg(),
      suppress: makeSuppressIndex(),
      project: emptyProject,
      census: [],
      logger: new NullLogger(),
      telemetry: new NullTelemetry(),
    });
    expect(result.some((d) => d.ruleId === 'lca-placement')).toBe(true);
  });

  it('drops diagnostics suppressed by the suppress index', () => {
    const suppress = makeSuppressIndex({ suppressed: ['src/App/Stray'] });
    const result = run({
      graph: strayGraph,
      config: cfg(),
      suppress,
      project: emptyProject,
      census: [],
      logger: new NullLogger(),
      telemetry: new NullTelemetry(),
    });
    expect(result.some((d) => d.entity === 'src/App/Stray')).toBe(false);
  });

  it('runs nothing for an empty graph', () => {
    const result = run({
      graph: makeGraph({}),
      config: cfg(),
      suppress: makeSuppressIndex(),
      project: emptyProject,
      census: [],
      logger: new NullLogger(),
      telemetry: new NullTelemetry(),
    });
    expect(result).toEqual([]);
  });

  it('dispatches a manifest rule with only its manifest context', () => {
    let sawContext = false;
    const manifestProbe: Rule = {
      id: 'manifest-probe',
      pack: 'hygiene',
      engine: 'manifest',
      defaultSeverity: 'error',
      check: (context) => {
        sawContext = context.manifests !== undefined && typeof context.cwd === 'string';
        return [];
      },
    };
    run({
      graph: makeGraph({}),
      config: cfg({ packs: ['hygiene'], plugins: [manifestProbe] }),
      suppress: makeSuppressIndex(),
      project: emptyProject,
      census: [],
      logger: new NullLogger(),
      telemetry: new NullTelemetry(),
    });
    expect(sawContext).toBe(true);
  });

  it('dispatches a census rule with only its census context', () => {
    let seenCensus: readonly string[] | null = null;
    const censusProbe: Rule = {
      id: 'orphan-test',
      pack: 'structure',
      engine: 'census',
      defaultSeverity: 'warning',
      check: (context) => {
        seenCensus = context.census;
        return [];
      },
    };
    run({
      graph: makeGraph({}),
      config: cfg({ packs: ['structure'], plugins: [censusProbe] }),
      suppress: makeSuppressIndex(),
      project: emptyProject,
      census: ['src/a.ts', 'src/a.test.ts'],
      logger: new NullLogger(),
      telemetry: new NullTelemetry(),
    });
    expect(seenCensus).toEqual(['src/a.ts', 'src/a.test.ts']);
  });

  it('throws when a syntactic rule runs against a graph/project inconsistency', () => {
    const syntacticProbe: Rule = {
      id: 'lib-purity',
      pack: 'layers',
      engine: 'syntactic',
      defaultSeverity: 'error',
      check: () => [],
    };
    const graph = makeGraph({ nodes: { 'src/missing.ts': { kind: 'file' } } });
    expect(() =>
      run({
        graph,
        config: cfg({ packs: ['layers'], plugins: [syntacticProbe] }),
        suppress: makeSuppressIndex(),
        project: emptyProject,
        census: [],
        logger: new NullLogger(),
        telemetry: new NullTelemetry(),
      }),
    ).toThrow(/src\/missing\.ts/);
  });

  it('does not assert graph/project consistency when no syntactic rule is active', () => {
    const graph = makeGraph({ nodes: { 'src/missing.ts': { kind: 'file' } } });
    expect(() =>
      run({
        graph,
        config: cfg({ packs: ['placement'] }),
        suppress: makeSuppressIndex(),
        project: emptyProject,
        census: [],
        logger: new NullLogger(),
        telemetry: new NullTelemetry(),
      }),
    ).not.toThrow();
  });

  it('threads the supplied project into rule contexts (D9)', () => {
    let seen: Project | null = null;
    const probe: Rule = {
      id: 'lib-purity',
      pack: 'layers',
      engine: 'syntactic',
      defaultSeverity: 'error',
      check: (_g, _c, context) => {
        seen = context.project;
        return [];
      },
    };
    const project = new Project({ useInMemoryFileSystem: true });
    run({
      graph: makeGraph({}),
      config: cfg({ packs: ['layers'], plugins: [probe] }),
      suppress: makeSuppressIndex(),
      project,
      census: [],
      logger: new NullLogger(),
      telemetry: new NullTelemetry(),
    });
    expect(seen).toBe(project);
  });
});

describe('runEngine pipeline steps 3-4', () => {
  it('throws EngineError when a rule emits a colliding (ruleId, entity, fingerprint)', () => {
    const collidingRule: Rule = {
      id: 'lib-purity',
      pack: 'layers',
      engine: 'syntactic',
      defaultSeverity: 'error',
      check: () => [
        {
          ruleId: 'lib-purity',
          severity: 'error',
          entity: 'src/x.ts',
          fingerprint: 'dup',
          message: 'm',
          actual: 'a',
          reason: 'r',
          suggestions: [],
          location: { file: 'src/x.ts', line: 1, column: 1 },
        },
        {
          ruleId: 'lib-purity',
          severity: 'error',
          entity: 'src/x.ts',
          fingerprint: 'dup',
          message: 'm',
          actual: 'a',
          reason: 'r',
          suggestions: [],
          location: { file: 'src/x.ts', line: 2, column: 1 },
        },
      ],
    };
    const config = cfg({ packs: ['layers'], plugins: [collidingRule] });
    expect(() =>
      run({
        graph: makeGraph({}),
        config,
        suppress: makeSuppressIndex(),
        project: emptyProject,
        census: [],
        logger: new NullLogger(),
        telemetry: new NullTelemetry(),
      }),
    ).toThrow(EngineError);
  });

  it('does not throw for well-formed unique diagnostics', () => {
    expect(() =>
      run({
        graph: strayGraph,
        config: cfg(),
        suppress: makeSuppressIndex(),
        project: emptyProject,
        census: [],
        logger: new NullLogger(),
        telemetry: new NullTelemetry(),
      }),
    ).not.toThrow();
  });
});

describe('runEngine — rule filter', () => {
  it('honors the ruleFilter argument', () => {
    const result = run(
      {
        graph: strayGraph,
        config: cfg(),
        suppress: makeSuppressIndex(),
        project: emptyProject,
        census: [],
        logger: new NullLogger(),
        telemetry: new NullTelemetry(),
      },
      ['layer-boundary'],
    );
    expect(result).toEqual([]);
  });

  it('runs every active rule when no ruleFilter is given', () => {
    const result = run({
      graph: strayGraph,
      config: cfg(),
      suppress: makeSuppressIndex(),
      project: emptyProject,
      census: [],
      logger: new NullLogger(),
      telemetry: new NullTelemetry(),
    });
    expect(result.some((d) => d.ruleId === 'lca-placement')).toBe(true);
  });
});

describe('runEngine — explicit rule set', () => {
  it('runs exactly the rules it is given, ignoring config packs', () => {
    let ran = false;
    const probe: Rule = {
      id: 'probe',
      pack: 'meta',
      engine: 'graph',
      defaultSeverity: 'error',
      check: () => {
        ran = true;
        return [];
      },
    };
    runEngine(
      {
        graph: makeGraph({}),
        config: cfg({ packs: [] }),
        suppress: makeSuppressIndex(),
        project: emptyProject,
        census: [],
        logger: new NullLogger(),
        telemetry: new NullTelemetry(),
      },
      [probe],
    );
    expect(ran).toBe(true);
  });
});

describe('runEngine — telemetry', () => {
  it('wraps each rule in a telemetry span keyed by rule id', () => {
    const telemetry = new RecordingTelemetry();
    run(
      {
        graph: strayGraph,
        config: cfg(),
        suppress: makeSuppressIndex(),
        project: emptyProject,
        census: [],
        logger: new NullLogger(),
        telemetry,
      },
      ['lca-placement'],
    );
    expect(telemetry.timings.has('lca-placement')).toBe(true);
  });
});
