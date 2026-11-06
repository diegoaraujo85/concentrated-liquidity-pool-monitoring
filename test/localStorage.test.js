import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CONFIG } from '../js/config.js';
import { State } from '../js/state.js';

window.CONFIG = CONFIG;
window.State = State;

function setupLocalStorage(savedState) {
  localStorage.clear();
  if (savedState !== undefined) {
    localStorage.setItem('clp_monitor_state', JSON.stringify(savedState));
  } else {
    localStorage.removeItem('clp_monitor_state');
  }
}

describe('State.loadFromLocalStorage — schema validation', () => {
  beforeEach(() => {
    setupLocalStorage();
  });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads valid saved state without error', () => {
    const validState = {
      theme: 'dark',
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
    setupLocalStorage(validState);

    expect(() => State.loadFromLocalStorage()).not.toThrow();
    const state = State.get();
    expect(state.theme).toBe('dark');
    expect(state.monitor.profile).toBe('aggressive');
    expect(state.tracker.wallets[0].address).toBe('0x1234567890123456789012345678901234567890');
  });

  it('rejects injected properties (prototype pollution)', () => {
    const maliciousState = {
      theme: 'dark',
      monitor: {
        refreshInterval: '60s',
        profile: 'conservative',
        viewPreset: 'conservative',
        visibleColumns: ['protocol'],
        filters: {},
        polluted: 'injected',
        __proto__: { polluted: true }
      },
      tracker: {
        wallets: [],
        refreshInterval: '60s',
        viewPreset: 'conservative',
        visibleColumns: [],
        filters: {}
      }
    };
    setupLocalStorage(maliciousState);

    expect(() => State.loadFromLocalStorage()).not.toThrow();
    const state = State.get();
    expect(state.monitor.polluted).toBeUndefined();
  });

  it('rejects invalid wallet addresses', () => {
    const stateWithBadWallet = {
      theme: 'dark',
      monitor: {
        refreshInterval: '60s', profile: 'conservative', viewPreset: 'conservative',
        visibleColumns: ['protocol'], filters: {}
      },
      tracker: {
        wallets: [
          { address: '0x1234567890123456789012345678901234567890', network: 'ethereum', label: 'Valid' },
          { address: 'javascript:alert(1)', network: 'ethereum', label: 'XSS' },
          { address: 'not-an-address', network: 'ethereum', label: 'Invalid' }
        ],
        refreshInterval: '60s', viewPreset: 'conservative', visibleColumns: [], filters: {}
      }
    };
    setupLocalStorage(stateWithBadWallet);

    expect(() => State.loadFromLocalStorage()).not.toThrow();
    const state = State.get();
    expect(state.tracker.wallets).toHaveLength(1);
    expect(state.tracker.wallets[0].address).toBe('0x1234567890123456789012345678901234567890');
  });

  it('handles empty/missing localStorage gracefully', () => {
    setupLocalStorage(undefined);
    expect(() => State.loadFromLocalStorage()).not.toThrow();
  });

  it('handles malformed JSON gracefully', () => {
    localStorage.setItem('clp_monitor_state', '{not valid json}');
    expect(() => State.loadFromLocalStorage()).not.toThrow();
  });

  it('applies defaults for invalid fields', () => {
    const invalidState = {
      theme: 'javascript:alert(1)',
      monitor: {
        refreshInterval: 'invalid',
        profile: 'invalid',
        viewPreset: 'invalid',
        visibleColumns: 'not-array',
        filters: 'not-object'
      },
      tracker: {
        wallets: 'not-array',
        refreshInterval: 'invalid',
        viewPreset: 'invalid',
        visibleColumns: 'not-array',
        filters: 'not-object'
      }
    };
    setupLocalStorage(invalidState);

    expect(() => State.loadFromLocalStorage()).not.toThrow();
    const state = State.get();
    expect(state.theme).toBe('dark');
    expect(state.monitor.refreshInterval).toBe('60s');
    expect(state.monitor.profile).toBe('conservative');
    expect(state.tracker.wallets).toEqual([]);
  });
});
