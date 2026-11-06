// Retry + failure cache utilities for API calls
// Prevents permanent caching of transient RPC errors

// Retry an async function with exponential backoff
export async function retryAsync(fn, maxRetries = 2, baseDelayMs = 800) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i === maxRetries) break;
      await new Promise(r => setTimeout(r, baseDelayMs * (i + 1)));
    }
  }
  throw lastError;
}

// Failure cache — stores failed keys with TTL, allows retry after expiry
export class FailureCache {
  constructor(ttlMs = 300000) { // 5 minutes default
    this.cache = new Map(); // key -> { failureTime, ttl }
    this.ttlMs = ttlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.failureTime > entry.ttl) {
      this.cache.delete(key);
      return null; // expired — allow retry
    }
    return entry; // still within TTL — treat as failed
  }

  set(key, ttlMs = this.ttlMs) {
    this.cache.set(key, { failureTime: Date.now(), ttl: ttlMs });
  }

  delete(key) {
    this.cache.delete(key);
  }

  has(key) {
    const entry = this.get(key);
    return entry !== null;
  }

  clear() {
    this.cache.clear();
  }
}

// Combined: retry with failure cache
export async function retryWithCache(fn, cacheKey, failureCache, maxRetries = 2, baseDelayMs = 800) {
  // If cached failure within TTL, skip retry and return cached fallback signal
  if (failureCache.has(cacheKey)) {
    return { cached: true, value: null };
  }

  try {
    const value = await retryAsync(fn, maxRetries, baseDelayMs);
    return { cached: false, value };
  } catch (e) {
    failureCache.set(cacheKey);
    return { cached: true, value: null, error: e };
  }
}
