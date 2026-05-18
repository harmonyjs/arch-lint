export function f(n: number): number {
  if (n > 0) {
    if (n > 1) {
      if (n > 2) {
        if (n > 3) {
          return 4;
        }
        return 3;
      }
      return 2;
    }
    return 1;
  }
  return 0;
}
