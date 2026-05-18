/**
 * @fileoverview App — cluster root tying the Left and Right subtrees together.
 */
import { Left } from './Left/Left.js';
import { Right } from './Right/Right.js';

export function App(): number {
  return Left + Right;
}
