/**
 * @fileoverview Footer — a foreign component that reaches into Header's private
 * slot, the import that leaks the slot.
 */
import { Leaked } from '../Header/slots/Leaked/Leaked.js';

export function Footer(): unknown {
  return Leaked();
}
