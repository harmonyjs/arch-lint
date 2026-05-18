/**
 * @fileoverview Cluster root — composes its two sibling child components.
 */
import { Footer } from './Footer/Footer.js';
import { Header } from './Header/Header.js';

export function App(): string {
  return `${Header()}-${Footer()}`;
}
