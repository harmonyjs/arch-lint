/**
 * @fileoverview Leaked — a slot meant to stay private to Header, but imported
 * by a foreign component (Footer), tripping slots-privacy.
 */
export function Leaked(): null {
  return null;
}
