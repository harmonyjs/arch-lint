/**
 * @fileoverview CLI reporter — the single arch-lint output format. Renders
 * diagnostics grouped by ruleId, with colour, OSC8 hyperlinks and long
 * consumer lists folded. Pure: takes a CheckResult and config, returns a string.
 */
import type { ConsumerInfo, Diagnostic } from '../types.js';

/** Total visual width of a group-header divider line. */
const HEADER_WIDTH = 61;

/** Renders the divider line that opens a rule group: `─── id (severity) ───`. */
export function groupHeader(ruleId: string, severity: string): string {
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
