import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { retryAsync, FailureCache, retryWithCache } from '../js/retry-cache.js';

describe('retryAsync', () => {
  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryAsync(fn, 2, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await retryAsync(fn, 2, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(retryAsync(fn, 2, 1)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

describe('FailureCache', () => {
  let originalNow;

  beforeEach(() => {
    originalNow = Date.now;
    let mockTime = 0;
    Date.now = () => mockTime;
    window.__mockTime = () => mockTime;
    window.__setMockTime = (t) => { mockTime = t; };
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  it('returns null for missing key', () => {
    const cache = new FailureCache();
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('stores and retrieves failure within TTL', () => {
    const cache = new FailureCache(10000);
    cache.set('key1');
    const entry = cache.get('key1');
    expect(entry).toBeDefined();
    expect(entry.failureTime).toBeDefined();
  });

  it('expires after TTL — allows retry', () => {
    const cache = new FailureCache(100);
    cache.set('key1');
    expect(cache.has('key1')).toBe(true);

    window.__setMockTime(window.__mockTime() + 150);
    expect(cache.has('key1')).toBe(false);
    expect(cache.get('key1')).toBeNull();
  });

  it('delete removes entry', () => {
    const cache = new FailureCache();
    cache.set('key1');
    expect(cache.has('key1')).toBe(true);
    cache.delete('key1');
    expect(cache.has('key1')).toBe(false);
  });

  it('clear removes all entries', () => {
    const cache = new FailureCache();
    cache.set('key1');
    cache.set('key2');
    cache.clear();
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
  });

  it('custom TTL per entry', () => {
    const cache = new FailureCache(10000);
    cache.set('key1', 50);
    expect(cache.has('key1')).toBe(true);
    window.__setMockTime(window.__mockTime() + 100);
    expect(cache.has('key1')).toBe(false);
  });
});

describe('retryWithCache', () => {
  let originalNow;

  beforeEach(() => {
    originalNow = Date.now;
    let mockTime = 0;
    Date.now = () => mockTime;
    window.__mockTime = () => mockTime;
    window.__setMockTime = (t) => { mockTime = t; };
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  it('returns fresh value on success', async () => {
    const cache = new FailureCache();
    const fn = vi.fn().mockResolvedValue('fresh-value');
    const result = await retryWithCache(fn, 'key1', cache);
    expect(result).toEqual({ cached: false, value: 'fresh-value' });
    expect(cache.has('key1')).toBe(false);
  });

  it('caches failure and returns cached on subsequent calls within TTL', async () => {
    const cache = new FailureCache(10000);
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    const result1 = await retryWithCache(fn, 'key1', cache);
    expect(result1.cached).toBe(true);
    expect(result1.value).toBeNull();
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries

    // Second call within TTL — should return cached failure without calling fn
    const result2 = await retryWithCache(fn, 'key1', cache);
    expect(result2.cached).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3); // no additional calls
  });

  it('allows retry after TTL expires', async () => {
    const cache = new FailureCache(100);
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    const result1 = await retryWithCache(fn, 'key1', cache);
    expect(result1.cached).toBe(true);

    window.__setMockTime(window.__mockTime() + 150); // expire TTL

    const fn2 = vi.fn().mockResolvedValue('retry-success');
    // Replace cache fn - we need a new fn that succeeds
    const result2 = await retryWithCache(fn2, 'key1', cache);
    expect(result2.cached).toBe(false);
    expect(result2.value).toBe('retry-success');
  });
});
