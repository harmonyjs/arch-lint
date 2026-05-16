/**
 * @fileoverview App entry that illegally imports a Card internal past its barrel.
 */
import { cardHelper } from './Card/internal.js';

export const main = (): string => cardHelper();
