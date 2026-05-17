/**
 * @fileoverview Builds a graph for a resolver fixture project and normalizes its
 * edges and unresolved imports for comparison against the fixture's expected.json.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ResolvedConfig } from '../../config/types.js';
import { buildGraph } from '../build.js';

interface NormalizedEdge {
  readonly consumer: string;
  readonly producer: string;
  readonly symbol: string;
  readonly typeOnly: boolean;
}
interface NormalizedUnresolved {
  readonly file: string;
  readonly specifier: string;
  readonly symbol: string;
  readonly reason: string;
}
export interface FixtureExpectation {
  readonly edges: readonly NormalizedEdge[];
  readonly unresolved: readonly NormalizedUnresolved[];
}

const sortEdges = (a: NormalizedEdge, b: NormalizedEdge): number =>
  a.consumer.localeCompare(b.consumer) ||
  a.producer.localeCompare(b.producer) ||
  a.symbol.localeCompare(b.symbol);

const sortUnresolved = (a: NormalizedUnresolved, b: NormalizedUnresolved): number =>
  a.file.localeCompare(b.file) ||
  a.specifier.localeCompare(b.specifier) ||
  a.symbol.localeCompare(b.symbol);

/** Builds a ResolvedConfig pointing at a fixture's `project/` directory. */
function fixtureConfig(projectDir: string): ResolvedConfig {
  return {
    project: {
      tsconfig: './tsconfig.json',
      sourceRoot: 'src',
      cwd: projectDir,
      includeOutOfRoot: false,
    },
    conventions: {
      privateSegment: 'slots',
      sharedSegment: 'items',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    },
    view: { region: 'auto' },
    packs: ['layers'],
    explicitPlacement: [],
    resolve: {
      treatTypeOnlyAsEdge: true,
      maxResolveDepth: 32,
      cacheSize: Infinity,
      extensions: ['.ts', '.tsx'],
    },
    layers: {},
    rules: {},
    perFileRules: {},
    ignore: [],
    baseline: {
      file: '.arch-lint-baseline.json',
      sortRecords: 'alphabetical',
      missingBehavior: 'ignore',
    },
    suppress: {
      marker: '@arch-decision',
      minReasonLength: 12,
      expirySupport: true,
      scanLocations: ['leading-comment'],
      maxDistanceLines: 5,
    },
    report: {
      cli: {
        color: 'never',
        showSuggestions: true,
        showConsumers: true,
        hyperlinks: 'never',
        foldLongLists: true,
      },
    },
    runMode: {
      watch: { rules: 'all', debounceMs: 200, clearOnRerun: true },
      preCommit: { rules: 'all', maxDurationMs: 5000, failOnViolations: true },
      ci: { failOnViolations: true },
    },
    plugins: [],
  };
}

/** Runs the named fixture and returns normalized actual vs expected results. */
export async function runFixture(
  name: string,
): Promise<{ actual: FixtureExpectation; expected: FixtureExpectation }> {
  const caseDir = join(import.meta.dirname, name);
  const graph = await buildGraph(fixtureConfig(join(caseDir, 'project')));
  const actual: FixtureExpectation = {
    edges: graph.edges
      .map((e) => ({
        consumer: e.consumer,
        producer: e.producer,
        symbol: e.symbol,
        typeOnly: e.typeOnly,
      }))
      .sort(sortEdges),
    unresolved: graph.unresolved
      .map((u) => ({ file: u.file, specifier: u.specifier, symbol: u.symbol, reason: u.reason }))
      .sort(sortUnresolved),
  };
  const raw = JSON.parse(
    readFileSync(join(caseDir, 'expected.json'), 'utf8'),
  ) as FixtureExpectation;
  const expected: FixtureExpectation = {
    edges: [...raw.edges].sort(sortEdges),
    unresolved: [...raw.unresolved].sort(sortUnresolved),
  };
  return { actual, expected };
}
