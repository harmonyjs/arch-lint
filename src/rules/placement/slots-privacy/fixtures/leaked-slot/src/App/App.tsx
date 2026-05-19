/**
 * @fileoverview App — cluster root holding Header and Footer components.
 */
import { Header } from './Header/Header.js';
import { Footer } from './Footer/Footer.js';

export function App(): readonly [unknown, unknown] {
  return [Header(), Footer()];
}
