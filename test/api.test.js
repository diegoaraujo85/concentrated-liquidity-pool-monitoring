import { describe, it, expect, vi } from 'vitest';
import { safeUrl } from '../js/url-utils.js';

describe('safeUrl — URL validation', () => {
  it('returns https URLs unchanged', () => {
    expect(safeUrl('https://defillama.com/yields/pool/abc')).toBe('https://defillama.com/yields/pool/abc');
  });

  it('returns http URLs unchanged', () => {
    expect(safeUrl('http://example.com')).toBe('http://example.com');
  });

  it('returns # for javascript: URIs', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#');
  });

  it('returns # for data: URIs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  it('returns # for empty string', () => {
    expect(safeUrl('')).toBe('#');
  });

  it('returns # for null/undefined', () => {
    expect(safeUrl(null)).toBe('#');
    expect(safeUrl(undefined)).toBe('#');
  });

  it('returns # for malformed URLs', () => {
    expect(safeUrl('not-a-url')).toBe('#');
  });
});

describe('fetchVolatilityFromOHLCV — real volatility from CoinGecko OHLCV', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns volatility from OHLCV close prices', async () => {
    // ohlcv_list: [timestamp, open, high, low, close, volume]
    const mockData = {
      data: {
        attributes: {
          ohlcv_list: [
            [1700000000, 100, 105, 95, 102, 1000],
            [1700086400, 102, 108, 100, 107, 1200],
            [1700172800, 107, 112, 104, 110, 1100],
            [1700259200, 110, 115, 108, 113, 1300],
            [1700345600, 113, 118, 110, 116, 1400],
          ],
        },
      },
    };
    global.fetch = vi.fn().mockResolvedValue(mockData);

    const { fetchVolatilityFromOHLCV } = await import('../js/api.js');
    const vol = await fetchVolatilityFromOHLCV('ethereum', '0xabc123', 'day');

    expect(vol).toBeGreaterThan(0);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/networks/ethereum/pools/0xabc123/ohlcv/day'),
      expect.anything()
    );
  });

  it('returns null when OHLCV list is empty', async () => {
    const mockData = {
      data: { attributes: { ohlcv_list: [] } },
    };
    global.fetch = vi.fn().mockResolvedValue(mockData);

    const { fetchVolatilityFromOHLCV } = await import('../js/api.js');
    const vol = await fetchVolatilityFromOHLCV('ethereum', '0xabc123', 'day');

    expect(vol).toBeNull();
  });

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { fetchVolatilityFromOHLCV } = await import('../js/api.js');
    const vol = await fetchVolatilityFromOHLCV('ethereum', '0xabc123', 'day');

    expect(vol).toBeNull();
  });
});
