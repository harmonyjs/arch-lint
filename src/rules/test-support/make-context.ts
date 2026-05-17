/**
 * @fileoverview Factories that build mock RuleContext and SuppressIndex instances for
 * rule tests — every context carries an in-memory ts-morph Project (decision D9).
 */
import { Project } from 'ts-morph';
import type { ManifestBundle, ManifestRuleContext, SyntacticRuleContext } from '#rules/types.js';
import type { ParsedSuppress, SuppressIndex } from '#suppress/types.js';
import type { ActiveSeverity, Diagnostic } from '#types.js';

interface SuppressIndexSpec {
  readonly suppressed?: readonly string[];
  readonly expired?: readonly ParsedSuppress[];
}

/** Builds a mock SuppressIndex: suppresses listed entities, reports listed expirations. */
export function makeSuppressIndex(spec: SuppressIndexSpec = {}): SuppressIndex {
  const suppressed = new Set(spec.suppressed ?? []);
  return {
    isSuppressed: (d: Diagnostic): boolean => suppressed.has(d.entity),
    findExpired: (): readonly ParsedSuppress[] => spec.expired ?? [],
  };
}

interface ContextSpec<TOptions> {
  readonly severity?: ActiveSeverity;
  readonly options?: TOptions;
  readonly suppress?: SuppressIndex;
  /** Parsed source project rules read AST from (D9); empty in-memory project by default. */
  readonly project?: Project;
}

/** Builds a mock SyntacticRuleContext for `ruleId`, applying any severity/options/project overrides. */
export function makeContext<TOptions = Record<string, unknown>>(
  ruleId: string,
  spec: ContextSpec<TOptions> = {},
): SyntacticRuleContext<TOptions> {
  return {
    ruleId,
    severity: spec.severity ?? 'warning',
    options: spec.options ?? ({} as TOptions),
    suppress: spec.suppress ?? makeSuppressIndex(),
    project: spec.project ?? new Project({ useInMemoryFileSystem: true }),
  };
}

interface ManifestContextSpec<TOptions> {
  readonly severity?: ActiveSeverity;
  readonly options?: TOptions;
  readonly manifests?: ManifestBundle;
  readonly cwd?: string;
}

/** An all-null ManifestBundle — the default when a manifest test supplies none. */
const EMPTY_BUNDLE: ManifestBundle = { packageJson: null, npmrc: null, tsconfig: null };

/** Builds a mock ManifestRuleContext for `ruleId`, applying any severity/options/manifests/cwd overrides. */
export function makeManifestContext<TOptions = Record<string, unknown>>(
  ruleId: string,
  spec: ManifestContextSpec<TOptions> = {},
): ManifestRuleContext<TOptions> {
  return {
    ruleId,
    severity: spec.severity ?? 'error',
    options: (spec.options ?? {}) as TOptions,
    manifests: spec.manifests ?? EMPTY_BUNDLE,
    cwd: spec.cwd ?? process.cwd(),
  };
}
