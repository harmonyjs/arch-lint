/**
 * @fileoverview Tests for createDebouncer — accumulates events and flushes them
 * once after a quiet period, with every new event restarting the timer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebouncer } from './watch.js';

describe('createDebouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires once after the quiet period with every accumulated event', () => {
    const flush = vi.fn();
    const debouncer = createDebouncer<string>(100, flush);

    debouncer.push('a');
    debouncer.push('b');
    debouncer.push('c');
    expect(flush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('restarts the timer on every new event', () => {
    const flush = vi.fn();
    const debouncer = createDebouncer<string>(100, flush);

    debouncer.push('a');
    vi.advanceTimersByTime(80);
    debouncer.push('b');
    vi.advanceTimersByTime(80);
    expect(flush).not.toHaveBeenCalled();

    debouncer.push('c');
    vi.advanceTimersByTime(80);
    expect(flush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('clears the accumulator after firing so a second burst flushes only its own batch', () => {
    const flush = vi.fn();
    const debouncer = createDebouncer<string>(100, flush);

    debouncer.push('a');
    debouncer.push('b');
    vi.advanceTimersByTime(100);
    expect(flush).toHaveBeenNthCalledWith(1, ['a', 'b']);

    debouncer.push('c');
    debouncer.push('d');
    vi.advanceTimersByTime(100);
    expect(flush).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenNthCalledWith(2, ['c', 'd']);
  });

  it('cancel() prevents a pending flush from firing and discards accumulated events', () => {
    const flush = vi.fn();
    const debouncer = createDebouncer<string>(100, flush);

    debouncer.push('a');
    debouncer.push('b');
    debouncer.cancel();

    vi.advanceTimersByTime(100);
    expect(flush).not.toHaveBeenCalled();

    debouncer.push('c');
    vi.advanceTimersByTime(100);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(['c']);
  });
});
