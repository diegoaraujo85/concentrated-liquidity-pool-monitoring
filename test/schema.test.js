import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateSchema, validateWallets, SCHEMA } from '../js/schema.js';

describe('schema validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns defaults for empty input', () => {
    const result = validateSchema({}, SCHEMA);
    expect(result.theme).toBe('dark');
    expect(result.monitor.refreshInterval).toBe('60s');
    expect(result.tracker.wallets).toEqual([]);
  });

  it('loads valid state correctly', () => {
    const raw = {
      theme: 'light',
      monitor: {
        refreshInterval: '30s',
        profile: 'aggressive',
        viewPreset: 'aggressive',
        visibleColumns: ['protocol', 'pair', 'tvl'],
        filters: { networks: ['ethereum'], pairType: 'stable', tvlMin: 1000 }
      },
      tracker: {
        wallets: [{ address: '0x1234567890123456789012345678901234567890', network: 'ethereum', label: 'My Wallet' }],
        refreshInterval: '60s',
        viewPreset: 'conservative',
        visibleColumns: ['protocol', 'pair', 'valueCurrent'],
        filters: { status: 'in_range', assets: ['ETH'] }
      }
    };
    const result = validateSchema(raw, SCHEMA);
    expect(result.theme).toBe('light');
    expect(result.monitor.profile).toBe('aggressive');
    expect(result.tracker.wallets[0].address).toBe('0x1234567890123456789012345678901234567890');
  });

  it('rejects invalid theme value', () => {
    const result = validateSchema({ theme: 'javascript:alert(1)' }, SCHEMA);
    expect(result.theme).toBe('dark');
  });

  it('rejects injected properties (prototype pollution)', () => {
    const raw = {
      theme: 'dark',
      monitor: { __proto__: { polluted: true }, injectedFn: 'alert(1)', refreshInterval: '60s' },
      tracker: {}
    };
    const result = validateSchema(raw, SCHEMA);
    expect(result.monitor.polluted).toBeUndefined();
    expect(result.monitor.injectedFn).toBeUndefined();
    expect(result.monitor.refreshInterval).toBe('60s');
  });

  it('validates wallets — accepts valid address', () => {
    const result = validateWallets([{ address: '0x1234567890123456789012345678901234567890', network: 'ethereum', label: 'OK' }]);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe('0x1234567890123456789012345678901234567890');
  });

  it('validates wallets — rejects javascript: address', () => {
    const result = validateWallets([{ address: 'javascript:alert(1)', network: 'ethereum', label: 'XSS' }]);
    expect(result).toHaveLength(0);
  });

  it('validates wallets — rejects non-ethereum address format', () => {
    const result = validateWallets([{ address: 'not-an-address', network: 'ethereum', label: 'Bad' }]);
    expect(result).toHaveLength(0);
  });

  it('validateWallets handles non-array input', () => {
    expect(validateWallets(null)).toEqual([]);
    expect(validateWallets(undefined)).toEqual([]);
    expect(validateWallets('not array')).toEqual([]);
  });
});
