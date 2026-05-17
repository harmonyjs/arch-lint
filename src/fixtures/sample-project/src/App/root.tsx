/**
 * @fileoverview Root application component, the public entity of the App feature folder.
 */
import type { User } from '../model/types.js';
import { greet } from '../lib/util.js';

export function App(user: User): string {
  return greet(user.name);
}
