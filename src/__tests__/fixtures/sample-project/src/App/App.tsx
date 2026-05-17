/**
 * @fileoverview Root application component of the sample fixture project.
 */
import type { User } from '../model/types.js';
import { greet } from '../lib/util.js';

export function App(user: User): string {
  return greet(user.name);
}
