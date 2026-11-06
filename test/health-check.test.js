import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkApiHealth, checkAllApis, HealthResult, HealthStatus } from '../js/health-check.js';

describe('HealthStatus', () => {
  it('creates healthy status', () => {
    const h = new HealthResult('ok', 150);
    expect(h.status).toBe('ok');
    expect(h.responseTime).toBe(150);
    expect(h.error).toBeNull();
    expect(h.checkedAt).toBeDefined();
  });

  it('creates error status', () => {
    const h = new HealthResult('error', null, 'Timeout');
    expect(h.status).toBe('error');
    expect(h.responseTime).toBeNull();
    expect(h.error).toBe('Timeout');
  });
});

describe('checkApiHealth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns ok when fetch succeeds', async () => {
    const start = Date.now();
    vi.setSystemTime(start);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const result = await checkApiHealth('https://api.example.com/health', 5000);

    expect(result.status).toBe('ok');
    expect(result.error).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns error when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await checkApiHealth('https://api.example.com/health', 5000);

    expect(result.status).toBe('error');
    expect(result.error).toBe('Network error');
    expect(result.responseTime).toBeNull();
  });

  it('returns error on HTTP non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await checkApiHealth('https://api.example.com/health', 5000);

    expect(result.status).toBe('error');
    expect(result.error).toContain('500');
  });

  it('respects timeout', async () => {
    let abortHandler;
    global.fetch = vi.fn().mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
          abortHandler = options.signal;
        }
      });
    });

    const promise = checkApiHealth('https://api.example.com/health', 100);
    vi.advanceTimersByTime(101);

    const result = await promise;
    expect(result.status).toBe('error');
    expect(result.error).toContain('timeout');
  });
});

describe('checkAllApis', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns status for all APIs', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })  // defillama
      .mockResolvedValueOnce({ ok: true, status: 200 })  // geckoterminal
      .mockResolvedValueOnce({ ok: true, status: 200 }); // rpc

    const apis = [
      { name: 'defillama', url: 'https://yields.llama.fi/pools', type: 'api' },
      { name: 'geckoterminal', url: 'https://api.geckoterminal.com/api/v2', type: 'api' },
      { name: 'rpc-ethereum', url: 'https://eth.llamarpc.com', type: 'rpc' },
    ];

    const results = await checkAllApis(apis);

    expect(results.defillama.status).toBe('ok');
    expect(results.geckoterminal.status).toBe('ok');
    expect(results['rpc-ethereum'].status).toBe('ok');
  });

  it('mixes ok and error statuses', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockRejectedValueOnce(new Error('down'));

    const apis = [
      { name: 'defillama', url: 'https://yields.llama.fi/pools', type: 'api' },
      { name: 'broken-api', url: 'https://broken.example.com', type: 'api' },
    ];

    const results = await checkAllApis(apis);

    expect(results.defillama.status).toBe('ok');
    expect(results['broken-api'].status).toBe('error');
  });
});
