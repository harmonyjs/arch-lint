/**
 * @fileoverview Widget that couples to a trigger package while living outside the UI cluster.
 */
// @ts-expect-error fixture: trigger package is not installed
import { useButton } from '@react-aria/button';

export const Widget = (): unknown => useButton();
