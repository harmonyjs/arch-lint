/**
 * @fileoverview Tests for the cognitive-complexity engine (D4) — the normative roadmap
 * increment table, one dedicated test group per increment kind.
 */
import { describe, it, expect } from 'vitest';
import { Project, Node } from 'ts-morph';
import { cognitiveComplexity } from './complexity-metric.js';

/** Scores the first function-like declaration of a snippet. */
function score(code: string): number {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile('m.ts', code);
  const fn = sf.forEachDescendant((node) =>
    Node.isFunctionDeclaration(node) || Node.isArrowFunction(node) ? node : undefined,
  );
  if (!fn) throw new Error('no function in snippet');
  return cognitiveComplexity(fn);
}

describe('cognitiveComplexity — structural increments', () => {
  it('scores an empty function as 0', () => {
    expect(score('function f() {}')).toBe(0);
  });

  it('adds +1 for a top-level if', () => {
    expect(score('function f(x: number) { if (x) return 1; }')).toBe(1);
  });

  it('adds +1 for each of two sibling ifs', () => {
    expect(score('function f(x: number) { if (x) {} if (x) {} }')).toBe(2);
  });

  it('adds +1 nesting for an if inside an if (1 + 2)', () => {
    expect(score('function f(x: number) { if (x) { if (x) {} } }')).toBe(3);
  });

  it('adds +2 nesting for an if nested two levels deep (1 + 2 + 3)', () => {
    expect(
      score('function f(x: number) { if (x) { if (x) { if (x) {} } } }'),
    ).toBe(6);
  });
});

describe('cognitiveComplexity — else / else if', () => {
  it('adds +1 flat for a plain else (if + else = 2)', () => {
    expect(score('function f(x: number) { if (x) {} else {} }')).toBe(2);
  });

  it('adds +1 flat for else-if without nesting penalty (if + else-if + else = 3)', () => {
    expect(
      score('function f(x: number) { if (x) {} else if (x) {} else {} }'),
    ).toBe(3);
  });
});

describe('cognitiveComplexity — ternary, switch, loops', () => {
  it('adds +1 for a ternary', () => {
    expect(score('function f(x: number) { return x ? 1 : 2; }')).toBe(1);
  });

  it('adds +1 nesting for a ternary inside an if (1 + 2)', () => {
    expect(score('function f(x: number) { if (x) { return x ? 1 : 2; } }')).toBe(3);
  });

  it('adds +1 for a switch', () => {
    expect(score('function f(x: number) { switch (x) { case 1: break; } }')).toBe(1);
  });

  it('adds +1 for a for loop', () => {
    expect(score('function f() { for (let i = 0; i < 1; i++) {} }')).toBe(1);
  });

  it('adds +1 for a for-in loop', () => {
    expect(score('function f(o: object) { for (const k in o) {} }')).toBe(1);
  });

  it('adds +1 for a for-of loop', () => {
    expect(score('function f(a: number[]) { for (const v of a) {} }')).toBe(1);
  });

  it('adds +1 for a while loop', () => {
    expect(score('function f(x: number) { while (x) { break; } }')).toBe(1);
  });

  it('adds +1 for a do-while loop', () => {
    expect(score('function f(x: number) { do {} while (x); }')).toBe(1);
  });

  it('adds +1 nesting for a for inside a while (1 + 2)', () => {
    expect(
      score('function f() { while (true) { for (let i = 0; i < 1; i++) {} } }'),
    ).toBe(3);
  });
});

describe('cognitiveComplexity — catch', () => {
  it('adds +1 for a catch clause', () => {
    expect(score('function f() { try {} catch (e) {} }')).toBe(1);
  });

  it('does not count try or finally', () => {
    expect(score('function f() { try {} finally {} }')).toBe(0);
  });

  it('adds +1 nesting for a catch inside an if (1 + 2)', () => {
    expect(
      score('function f(x: number) { if (x) { try {} catch (e) {} } }'),
    ).toBe(3);
  });

  it('counts an if inside catch with catch nesting (catch 1 + if 1+1)', () => {
    expect(
      score('function f(x: number) { try {} catch (e) { if (x) {} } }'),
    ).toBe(3);
  });
});

describe('cognitiveComplexity — boolean operator sequences', () => {
  it('adds +1 for a single && chain (a && b && c)', () => {
    expect(score('function f(a: boolean, b: boolean, c: boolean) { return a && b && c; }')).toBe(1);
  });

  it('adds +1 for a single || chain', () => {
    expect(score('function f(a: boolean, b: boolean) { return a || b; }')).toBe(1);
  });

  it('adds +2 for mixed && and || (a && b || c)', () => {
    expect(score('function f(a: boolean, b: boolean, c: boolean) { return a && b || c; }')).toBe(2);
  });

  it('does not count nullish coalescing', () => {
    expect(score('function f(a: unknown, b: unknown) { return a ?? b; }')).toBe(0);
  });
});

describe('cognitiveComplexity — recursion', () => {
  it('adds +1 for a direct recursive call', () => {
    expect(score('function f(n: number): number { return f(n - 1); }')).toBe(1);
  });

  it('adds +1 per recursive call site (two calls = 2)', () => {
    expect(
      score('function f(n: number): number { return f(n - 1) + f(n - 2); }'),
    ).toBe(2);
  });

  it('does not count a call to another function', () => {
    expect(score('function f(): number { return g(); }')).toBe(0);
  });
});

describe('cognitiveComplexity — labeled jumps', () => {
  it('adds +1 for a labeled break', () => {
    const code =
      'function f() { outer: for (let i = 0; i < 1; i++) { break outer; } }';
    expect(score(code)).toBe(2);
  });

  it('adds +1 for a labeled continue', () => {
    const code =
      'function f() { outer: for (let i = 0; i < 1; i++) { continue outer; } }';
    expect(score(code)).toBe(2);
  });

  it('does not count an unlabeled break', () => {
    expect(score('function f() { while (true) { break; } }')).toBe(1);
  });

  it('does not count an unlabeled continue', () => {
    expect(
      score('function f() { for (let i = 0; i < 1; i++) { continue; } }'),
    ).toBe(1);
  });
});

describe('cognitiveComplexity — nested function nesting', () => {
  it('adds nesting from an enclosing function to a nested if', () => {
    const code = 'function f() { function g() { if (true) {} } }';
    // f body: g declaration adds no increment; inside g the if is at nesting 1 → 1 + 1
    expect(score(code)).toBe(2);
  });
});

describe('cognitiveComplexity — combined', () => {
  it('sums increments across a mixed function', () => {
    const code = `
      function process(items: number[], flag: boolean): number {
        let acc = 0;
        for (const item of items) {            // for: +1
          if (item > 0 && flag) {              // if: +1+1 nesting; &&: +1
            acc += item;
          } else {                             // else: +1
            acc -= item;
          }
        }
        return acc;
      }
    `;
    // for +1; if inside for: +1 structural +1 nesting; && +1; else +1 flat = 5
    expect(score(code)).toBe(5);
  });
});
