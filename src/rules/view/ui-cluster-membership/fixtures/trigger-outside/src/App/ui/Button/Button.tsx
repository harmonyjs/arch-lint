/**
 * @fileoverview Button primitive correctly placed inside the UI cluster.
 */
// @ts-expect-error fixture: trigger package is not installed
import { useButton } from '@react-aria/button';

export const Button = (): unknown => useButton();
