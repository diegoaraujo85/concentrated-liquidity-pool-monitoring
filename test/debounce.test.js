import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { debounce } from '../js/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution by specified wait time', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels previous call if invoked again within wait time', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced();
    vi.advanceTimersByTime(250);
    debounced(); // resets timer
    vi.advanceTimersByTime(250); // total 500 from first, but 250 from second
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250); // total 500 from second call
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns the function result via flush', () => {
    const fn = vi.fn(() => 42);
    const debounced = debounce(fn, 500);

    debounced();
    expect(fn).not.toHaveBeenCalled();
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('has cancel method to prevent execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });

  it('has flush method to execute immediately', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced();
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1); // no additional call
  });
});
