/**
 * @fileoverview App — JSX anchor that establishes the view region; consumes the misplaced hook.
 */
import { useToggle } from './use-toggle.js';

export const App = (): unknown => {
  const on = useToggle();
  return <div>{on ? 'on' : 'off'}</div>;
};
