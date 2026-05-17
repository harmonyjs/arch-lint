/**
 * @fileoverview Assembles the full layered Markdown document — a title, a
 * Legend, then one section per DocSection wrapping a renderDiagram block.
 * A pure string builder: depends only on ./types.js and ./mermaid.js.
 */
import { renderDiagram } from './mermaid.js';
import type { DocSection, GraphDoc, RenderNode } from './types.js';

/** Legend rows mapping each NodeRole to its diagram shape and meaning. */
const ROLE_LEGEND: ReadonlyArray<readonly [string, string, string]> = [
  ['entity-file', '`["..."]`', 'A file declaring a domain entity.'],
  ['component-folder', '`[["..."]]`', 'A folder grouped as one component.'],
  ['barrel', '`(["..."])`', 'A re-export barrel (index module).'],
  ['role-folder', '`{{"..."}}`', 'A folder named after an architectural role.'],
  ['plain-file', '`["..."]`', 'An ordinary source file.'],
  ['unresolved', '`["..."]` dashed red', 'An import target that could not be resolved.'],
];

/** Legend rows describing each edge style emitted by renderDiagram. */
const EDGE_LEGEND: ReadonlyArray<readonly [string, string]> = [
  ['solid arrow `-->`', 'A runtime import dependency.'],
  ['dashed arrow `-. .->`', 'A type-only import dependency.'],
  ['`back` label', 'The minority-weight back-edge of an import cycle.'],
];

/** Renders one Markdown table row from its cells. */
function tableRow(cells: readonly string[]): string {
  return `| ${cells.join(' | ')} |`;
}

/** Builds the Legend section — a static table of shapes and edge styles. */
function renderLegend(): string {
  const lines: string[] = ['## Legend', ''];
  lines.push(tableRow(['Role', 'Shape', 'Meaning']));
  lines.push(tableRow(['---', '---', '---']));
  for (const [role, shape, meaning] of ROLE_LEGEND) {
    lines.push(tableRow([role, shape, meaning]));
  }
  lines.push('', tableRow(['Edge style', 'Meaning']));
  lines.push(tableRow(['---', '---']));
  for (const [style, meaning] of EDGE_LEGEND) {
    lines.push(tableRow([style, meaning]));
  }
  return lines.join('\n');
}

/** Whether a node should produce a Markdown drill-down link line. */
function isGroupLink(node: RenderNode): node is RenderNode & { linkSlug: string } {
  return node.kind === 'group' && node.linkSlug !== null;
}

/** Renders the drill-down link lines for a section's group nodes. */
function renderGroupLinks(section: DocSection): string[] {
  const lines: string[] = [];
  for (const node of section.diagram.nodes) {
    if (isGroupLink(node)) {
      lines.push(`- [${node.name}](#${node.linkSlug})`);
    }
  }
  return lines;
}

/** Renders one DocSection — anchor, heading, optional note, diagram, links. */
function renderSection(section: DocSection): string {
  const lines: string[] = [`<a id="${section.slug}"></a>`, `## ${section.title}`, ''];
  if (section.note !== null) {
    lines.push(`> ${section.note}`, '');
  }
  lines.push('```mermaid', renderDiagram(section), '```');
  const links = renderGroupLinks(section);
  if (links.length > 0) {
    lines.push('', ...links);
  }
  return lines.join('\n');
}

/** Renders the full Markdown document for a GraphDoc render model. */
export function renderDocument(doc: GraphDoc): string {
  const blocks: string[] = ['# Project dependency graph', renderLegend()];
  for (const section of doc.sections) {
    blocks.push(renderSection(section));
  }
  return `${blocks.join('\n\n')}\n`;
}
