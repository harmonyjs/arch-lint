/**
 * @fileoverview renderShape — markdown emitter for the topology observations
 * section. Skips sub-headings whose detector found nothing; emits a one-line
 * empty-state when every detector is empty.
 */
import type {
  CarvedAspectFinding,
  HubFinding,
  ShapeFinding,
  SiblingAsymmetryFinding,
  TypeCircularPairFinding,
  TypeCircularTripletFinding,
} from './types.js';

const HEADING = '## Topology observations';

/** Returns the rendered topology observations section. */
export function renderShape(findings: readonly ShapeFinding[]): string {
  if (findings.length === 0) return `${HEADING}\n\nNo topology observations.`;
  const blocks: string[] = [HEADING];
  const sibling = filter<SiblingAsymmetryFinding>(findings, 'sibling-asymmetry');
  if (sibling.length > 0) blocks.push(renderSiblingAsymmetry(sibling));
  const carved = filter<CarvedAspectFinding>(findings, 'carved-aspect');
  if (carved.length > 0) blocks.push(renderCarvedAspect(carved));
  const pairs = filter<TypeCircularPairFinding>(findings, 'type-circular-pair');
  const triplets = filter<TypeCircularTripletFinding>(findings, 'type-circular-triplet');
  if (pairs.length > 0 || triplets.length > 0) blocks.push(renderTypeCircular(pairs, triplets));
  const hubs = filter<HubFinding>(findings, 'hub');
  if (hubs.length > 0) blocks.push(renderHubs(hubs));
  return blocks.join('\n\n');
}

/** Returns findings whose `kind` matches the requested discriminant, typed. */
function filter<T extends ShapeFinding>(findings: readonly ShapeFinding[], kind: T['kind']): T[] {
  return findings.filter((f): f is T => f.kind === kind);
}

/** Sibling-asymmetry block — one row per finding. */
function renderSiblingAsymmetry(findings: readonly SiblingAsymmetryFinding[]): string {
  const lines = [
    '### Sibling-asymmetry',
    '',
    '| Folder | Used by | Missing |',
    '| --- | --- | --- |',
  ];
  for (const f of findings) {
    const used = `${f.usedBy.length}/${f.total}`;
    const missing = f.missing.map((m) => `\`${m}\``).join(', ');
    lines.push(`| \`${f.folder}\` | ${used} | ${missing} |`);
  }
  return lines.join('\n');
}

/** Carved-aspect block — one row per pair. */
function renderCarvedAspect(findings: readonly CarvedAspectFinding[]): string {
  const lines = [
    '### Carved-aspect pairs',
    '',
    '| Core | Aspect | Direction | LOC |',
    '| --- | --- | --- | --- |',
  ];
  for (const f of findings) {
    lines.push(
      `| \`${f.core}\` | \`${f.aspect}\` | ${f.direction} | ${f.coreLoc} / ${f.aspectLoc} |`,
    );
  }
  return lines.join('\n');
}

/** Type-circular block — pair sub-table then triplet sub-table, each conditional. */
function renderTypeCircular(
  pairs: readonly TypeCircularPairFinding[],
  triplets: readonly TypeCircularTripletFinding[],
): string {
  const lines: string[] = ['### Type-circular'];
  if (pairs.length > 0) {
    lines.push('', '#### Pair', '', '| A | B |', '| --- | --- |');
    for (const f of pairs) lines.push(`| \`${f.a}\` | \`${f.b}\` |`);
  }
  if (triplets.length > 0) {
    lines.push('', '#### Triplet', '', '| A | B | Shared consumer |', '| --- | --- | --- |');
    for (const f of triplets) {
      lines.push(`| \`${f.a}\` | \`${f.b}\` | \`${f.consumer}\` |`);
    }
  }
  return lines.join('\n');
}

/** Hubs block — one row per file. */
function renderHubs(findings: readonly HubFinding[]): string {
  const lines = [
    '### Hubs',
    '',
    '| File | Fan-in (siblings) | Fan-out (siblings) |',
    '| --- | --- | --- |',
  ];
  for (const f of findings) lines.push(`| \`${f.file}\` | ${f.fanIn} | ${f.fanOut} |`);
  return lines.join('\n');
}
