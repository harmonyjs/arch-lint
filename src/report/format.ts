/**
 * @fileoverview Report formatter — the single arch-lint output format. Renders
 * diagnostics grouped by ruleId, with colour, OSC8 hyperlinks and long
 * consumer lists folded. Pure: takes a CheckResult and config, returns a string.
 */
import pc from 'picocolors';
import type { ResolvedConfig } from '#foundation/config/types.js';
import type {
  ActiveSeverity,
  ConsumerInfo,
  CouplingFacetsAnalysis,
  Diagnostic,
  DiagnosticAnalysis,
  Suggestion,
} from '#foundation/types/index.js';
import type { CheckResult } from '#platform/engine/types.js';

/** Total visual width of a group-header divider line. */
const HEADER_WIDTH = 61;

/** Renders the divider line that opens a rule group: `─── id (severity) ───`. */
export function groupHeader(ruleId: string, severity: ActiveSeverity): string {
  const label = `─── ${ruleId} (${severity}) `;
  const fill = Math.max(0, HEADER_WIDTH - label.length);
  return label + '─'.repeat(fill);
}

const OSC = '\x1b]8;;';
const BEL = '\x07';

/**
 * Wraps `text` in an OSC8 terminal hyperlink pointing at `href`. When
 * `enabled` is false (terminal lacks support, or hyperlinks are disabled) the
 * plain text is returned unchanged.
 */
export function osc8(text: string, href: string, enabled: boolean): string {
  if (!enabled) return text;
  return `${OSC}${href}${BEL}${text}${OSC}${BEL}`;
}

/** Maximum consumer-list entries shown before folding kicks in. */
const FOLD_LIMIT = 5;

/**
 * Folds a long consumer list: when `fold` is on and the list exceeds
 * FOLD_LIMIT entries, keeps the first FOLD_LIMIT and appends a summary line.
 */
export function foldConsumers(lines: readonly string[], fold: boolean): readonly string[] {
  if (!fold || lines.length <= FOLD_LIMIT) return lines;
  const shown = lines.slice(0, FOLD_LIMIT);
  return [...shown, `… and ${lines.length - FOLD_LIMIT} more`];
}

/** Rendering options derived from report.cli config and terminal capability. */
export interface RenderOptions {
  readonly showConsumers: boolean;
  readonly showSuggestions: boolean;
  readonly foldLongLists: boolean;
  readonly hyperlinks: boolean;
  readonly explain: boolean;
}

function consumerLine(c: ConsumerInfo, index: number): string {
  return `      ${index + 1}. ${c.file} (line ${c.location.line})`;
}

/** Default-mode one-line remedy summary for one suggestion. */
function remedyLine(s: Suggestion): string {
  if (s.candidates !== undefined && s.candidates.length > 0) {
    const best = s.candidates.find((c) => c.best) ?? s.candidates[0];
    return `    Remedy:   ${s.rationale} → suggested home ${best?.target ?? '(none)'}`;
  }
  const target = s.target === undefined ? '' : ` → ${s.target}`;
  return `    Remedy:   ${s.rationale}${target}`;
}

/** Explain-mode remedy: the rationale plus the ranked candidate list. */
function remedyLinesExplain(s: Suggestion): readonly string[] {
  if (s.candidates === undefined || s.candidates.length === 0) return [remedyLine(s)];
  const lines = [`    Remedy:   ${s.rationale}`];
  s.candidates.forEach((c, i) => {
    const letter = String.fromCharCode(97 + i);
    const note = c.note === undefined ? '' : `  (${c.note})`;
    const star = c.best ? '  ★' : '';
    lines.push(`      [${letter}] ${c.target}${note}${star}`);
  });
  return lines;
}

/** Formats a coupling-facets analysis block. */
function couplingFacetsLines(a: CouplingFacetsAnalysis): readonly string[] {
  const lines = [`    Analysis: ${a.facets.length} facet(s) by consumed symbol`];
  for (const f of a.facets) {
    lines.push(`                ${f.symbol} → ${f.units.join(', ')}  (${f.units.length})`);
  }
  if (a.facets.length > 1) {
    lines.push(
      a.disjoint
        ? '              disjoint ⇒ the unit carries separable responsibilities'
        : '              facets overlap ⇒ no clean split seam',
    );
  }
  return lines;
}

/**
 * Renders an analysis block. `DiagnosticAnalysis` has one kind today; when it
 * gains more, `couplingFacetsLines`'s parameter type forces a dispatch here.
 */
function analysisLines(a: DiagnosticAnalysis): readonly string[] {
  return couplingFacetsLines(a);
}

/** Renders the body of one diagnostic (everything below its group header). */
export function renderDiagnostic(d: Diagnostic, opts: RenderOptions): string {
  const lines: string[] = [`  ${d.entity}`];
  if (d.expected !== undefined) lines.push(`    Expected: ${d.expected}`);
  lines.push(`    Actual:   ${d.actual}`);
  lines.push(`    Reason:   ${d.reason}`);
  if (opts.showConsumers && d.consumers !== undefined && d.consumers.length > 0) {
    lines.push('    Consumers:');
    const rendered = d.consumers.map((c, i) => consumerLine(c, i));
    lines.push(...foldConsumers(rendered, opts.foldLongLists));
  }
  if (opts.explain && d.analysis !== undefined) {
    lines.push(...analysisLines(d.analysis));
  }
  if (opts.showSuggestions) {
    for (const s of d.suggestions) {
      lines.push(...(opts.explain ? remedyLinesExplain(s) : [remedyLine(s)]));
    }
  }
  return lines.join('\n');
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function summaryLine(result: CheckResult, explain: boolean): string {
  const s = result.summary;
  const base =
    `Summary: ${pluralize(s.bySeverity.error, 'error')}, ` +
    `${pluralize(s.bySeverity.warning, 'warning')} ` +
    `(${s.new} new, ${s.inBaseline} in baseline)`;
  if (explain) return base;
  const enriched = result.diagnostics.filter((d) => d.analysis !== undefined).length;
  return enriched === 0 ? base : `${base} · ${enriched} finding(s) carry --explain analysis`;
}

function colorEnabled(mode: ResolvedConfig['report']['cli']['color']): boolean {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return pc.isColorSupported;
}

/** Order of severities within a rule group (highest first). */
const SEVERITY_ORDER: readonly ActiveSeverity[] = ['error', 'warning', 'info'];

/**
 * Renders the full CLI report: diagnostics grouped by ruleId, sorted by
 * severity within a group, closed by a summary line. Pure — colour is decided
 * from report.cli.color, never from ambient process state directly.
 */
export function formatReport(result: CheckResult, config: ResolvedConfig, explain = false): string {
  const cli = config.report.cli;
  if (result.diagnostics.length === 0) return 'No architecture violations found.';

  const useColor = colorEnabled(cli.color);
  const opts: RenderOptions = {
    showConsumers: cli.showConsumers,
    showSuggestions: cli.showSuggestions,
    foldLongLists: cli.foldLongLists,
    hyperlinks: cli.hyperlinks === 'always' || (cli.hyperlinks === 'auto' && useColor),
    explain,
  };

  const byRule = new Map<string, Diagnostic[]>();
  for (const d of result.diagnostics) {
    const bucket = byRule.get(d.ruleId);
    if (bucket === undefined) byRule.set(d.ruleId, [d]);
    else bucket.push(d);
  }

  const blocks: string[] = [];
  for (const ruleId of [...byRule.keys()].sort()) {
    const bucket = byRule.get(ruleId) ?? [];
    const diags = [...bucket].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    );
    const groupSeverity = diags[0]?.severity;
    if (groupSeverity === undefined) continue;
    const header = groupHeader(ruleId, groupSeverity);
    blocks.push(useColor ? pc.bold(header) : header);
    for (const d of diags) blocks.push(renderDiagnostic(d, opts));
  }
  blocks.push(summaryLine(result, explain));
  return blocks.join('\n');
}
