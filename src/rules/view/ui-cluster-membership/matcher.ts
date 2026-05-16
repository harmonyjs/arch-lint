/**
 * @fileoverview Matches an import specifier against triggerPackages via picomatch —
 * no hardcoded React naming; the view pack is parametrized by config.
 */
import picomatch from 'picomatch';

/**
 * Compiles a list of package glob patterns into a predicate over an import
 * specifier. The view pack is parametrized by config: Preact or any other
 * library substitutes its own patterns — no hardcoded React package names.
 */
export function triggerPackageMatcher(patterns: readonly string[]): (specifier: string) => boolean {
  if (patterns.length === 0) return () => false;
  const isMatch = picomatch([...patterns]);
  return (specifier: string): boolean => isMatch(specifier);
}
