/**
 * @fileoverview CLI reporter — the single arch-lint output format. Renders
 * diagnostics grouped by ruleId, with colour, OSC8 hyperlinks and long
 * consumer lists folded. Pure: takes a CheckResult and config, returns a string.
 */

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
