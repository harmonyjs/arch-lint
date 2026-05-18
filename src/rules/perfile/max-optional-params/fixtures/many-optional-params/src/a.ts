export function f(a?: number, b?: number, c?: number, d?: number): number {
  return (a ?? 0) + (b ?? 0) + (c ?? 0) + (d ?? 0);
}
