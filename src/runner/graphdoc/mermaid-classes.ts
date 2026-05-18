/**
 * @fileoverview classDef and `class` emission for the Mermaid renderer — the
 * per-role style map, the three instability bands, and node class assignment.
 */
import type { CouplingBadge, Diagram, NodeRole, RenderNode } from './types.js';

/** Per-role classDef style — visual weight tracks architectural significance. */
const ROLE_STYLE: Readonly<Record<NodeRole, string>> = {
  'entity-file': 'fill:#cfe0ff,stroke:#2b5fb3,stroke-width:2px',
  'component-folder': 'fill:#d3eccd,stroke:#3a7d2c,stroke-width:2px',
  barrel: 'fill:#f2f2f2,stroke:#bbbbbb',
  'role-folder': 'fill:#f2f2f2,stroke:#bbbbbb,stroke-dasharray:4 2',
  'plain-file': 'fill:#eef0f4,stroke:#8893a5',
  unresolved: 'fill:#fee,stroke:#c33,stroke-dasharray:4 2',
};

/** Instability band classDef styles, keyed by band name. */
const BAND_STYLE: Readonly<Record<string, string>> = {
  stable: 'fill:#d6ecd6,stroke:#4a9a4a',
  neutral: 'fill:#fff3cc,stroke:#caa53d',
  unstable: 'fill:#fcdcc0,stroke:#c8702f',
};

/** Stable class name for a node role. */
export function roleClass(role: NodeRole): string {
  return `role-${role}`;
}

/** The instability band a coupling badge falls into. */
function bandOf(instability: number): string {
  if (instability <= 0.3) return 'stable';
  if (instability >= 0.7) return 'unstable';
  return 'neutral';
}

/** classDef statements for every role plus cycle and instability bands. */
export function classDefs(roles: ReadonlySet<NodeRole>, hasInstability: boolean): string[] {
  const defs: string[] = [];
  for (const role of roles) {
    defs.push(`  classDef ${roleClass(role)} ${ROLE_STYLE[role]};`);
  }
  defs.push('  classDef cycle fill:#fee,stroke:#c33,stroke-width:2px;');
  defs.push('  classDef unresolved fill:#fee,stroke:#c33,stroke-dasharray:4 2;');
  if (hasInstability) {
    for (const [band, style] of Object.entries(BAND_STYLE)) {
      defs.push(`  classDef ${band} ${style};`);
    }
  }
  return defs;
}

/** Picks the class applied to a node: cycle/unresolved override the role class. */
function classFor(node: RenderNode): string {
  if (node.inCycle) return 'cycle';
  if (node.role === 'unresolved') return 'unresolved';
  return roleClass(node.role);
}

/** `class` assignment lines for every node, plus instability-band tagging. */
export function classAssignments(diagram: Diagram): string[] {
  const lines: string[] = [];
  for (const node of diagram.nodes) {
    lines.push(`  class ${node.id} ${classFor(node)};`);
    const badge = diagram.coupling.get(node.id);
    if (badge !== undefined) {
      lines.push(`  class ${node.id} ${bandOf(badge.instability)};`);
    }
  }
  return lines;
}

/** The label part carrying a subsystem's afferent/efferent coupling and instability. */
export function couplingLabel(badge: CouplingBadge): string {
  return `Ca ${badge.ca} · Ce ${badge.ce} · I ${badge.instability.toFixed(2)}`;
}
