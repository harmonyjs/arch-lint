/**
 * @fileoverview Tarjan strongly-connected-components over a directed graph —
 * the cycle detector behind the graph document's cycle highlighting.
 */

/** Computes the strongly-connected components of a directed adjacency map. */
export function stronglyConnectedComponents(
  adjacency: ReadonlyMap<string, readonly string[]>,
): readonly (readonly string[])[] {
  let counter = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const out: string[][] = [];

  const connect = (v: string): void => {
    index.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of adjacency.get(v) ?? []) {
      if (!index.has(w)) {
        connect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      out.push(component);
    }
  };

  for (const v of adjacency.keys()) {
    if (!index.has(v)) connect(v);
  }
  return out;
}

/**
 * The set of nodes that participate in a cycle: members of an SCC larger than
 * one node, plus any node with a self-loop.
 */
export function cyclicNodes(
  adjacency: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const cyclic = new Set<string>();
  for (const component of stronglyConnectedComponents(adjacency)) {
    if (component.length > 1) {
      for (const node of component) cyclic.add(node);
    }
  }
  for (const [node, targets] of adjacency) {
    if (targets.includes(node)) cyclic.add(node);
  }
  return cyclic;
}
