/**
 * @fileoverview Golden tests for OSC8 terminal hyperlink rendering.
 */
import { describe, expect, it } from 'vitest';
import { osc8 } from '#report/format.js';

const ESC = '\x1b';
const BEL = '\x07';

describe('osc8', () => {
  it('wraps text in an OSC8 escape sequence when enabled', () => {
    expect(osc8('App.tsx', 'file:///src/App.tsx', true)).toBe(
      `${ESC}]8;;file:///src/App.tsx${BEL}App.tsx${ESC}]8;;${BEL}`,
    );
  });

  it('returns plain text when disabled', () => {
    expect(osc8('App.tsx', 'file:///src/App.tsx', false)).toBe('App.tsx');
  });
});
