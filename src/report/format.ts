/**
 * @fileoverview Report formatter — the single arch-lint output format. Renders
 * diagnostics grouped by ruleId, with colour, OSC8 hyperlinks and long
 * consumer lists folded. Pure: takes a CheckResult and config, returns a string.
 */
import pc from 'picocolors';
import type { ResolvedConfig } from '../config/types.js';
import type { CheckResult, ConsumerInfo } from '../rules/types.js';
import type { ActiveSeverity, Diagnostic } from '../types.js';

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
}

function consumerLine(c: ConsumerInfo, index: number): string {
  return `      ${index + 1}. ${c.file} (line ${c.location.line})`;
}

function suggestionLine(s: Diagnostic['suggestions'][number], index: number): string {
  const letter = String.fromCharCode(97 + index);
  const target = s.target === undefined ? '' : ` → ${s.target}`;
  return `      [${letter}] ${s.action}${target}`;
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
  if (opts.showSuggestions && d.suggestions.length > 0) {
    lines.push('    Suggest:');
    lines.push(...d.suggestions.map((s, i) => suggestionLine(s, i)));
  }
  return lines.join('\n');
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function summaryLine(summary: CheckResult['summary']): string {
  return (
    `Summary: ${pluralize(summary.bySeverity.error, 'error')}, ` +
    `${pluralize(summary.bySeverity.warning, 'warning')} ` +
    `(${summary.new} new, ${summary.inBaseline} in baseline)`
  );
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
export function formatReport(result: CheckResult, config: ResolvedConfig): string {
  const cli = config.report.cli;
  if (result.diagnostics.length === 0) return 'No architecture violations found.';

  const useColor = colorEnabled(cli.color);
  const opts: RenderOptions = {
    showConsumers: cli.showConsumers,
    showSuggestions: cli.showSuggestions,
    foldLongLists: cli.foldLongLists,
    hyperlinks: cli.hyperlinks === 'always' || (cli.hyperlinks === 'auto' && useColor),
  };

  const byRule = new Map<string, Diagnostic[]>();
  for (const d of result.diagnostics) {
    const bucket = byRule.get(d.ruleId);
    if (bucket === undefined) byRule.set(d.ruleId, [d]);
    else bucket.push(d);
  }

  const blocks: string[] = [];
  for (const ruleId of [...byRule.keys()].sort()) {
    const diags = [...byRule.get(ruleId)!].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    );
    const groupSeverity = diags[0]!.severity;
    const header = groupHeader(ruleId, groupSeverity);
    blocks.push(useColor ? pc.bold(header) : header);
    for (const d of diags) blocks.push(renderDiagnostic(d, opts));
  }
  blocks.push(summaryLine(result.summary));
  return blocks.join('\n');
}
