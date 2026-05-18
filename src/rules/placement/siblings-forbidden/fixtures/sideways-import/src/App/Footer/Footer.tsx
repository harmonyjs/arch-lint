/**
 * @fileoverview Sibling component that reaches sideways into Header — the offending import.
 */
import { Header } from '../Header/Header.js';

export function Footer(): string {
  return `${Header()}-footer`;
}
