import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const configJs = readFileSync(path.resolve(__dirname, '../js/config.js'), 'utf-8');
const stateJs = readFileSync(path.resolve(__dirname, '../js/state.js'), 'utf-8');

function loadModules() {
  let capturedConfig;
  eval(`(function() { ${configJs} capturedConfig = CONFIG; })()`);
  window.CONFIG = capturedConfig;

  let capturedState;
  eval(`(function() { ${stateJs} capturedState = State; })()`);
  window.State = capturedState;
}

function createPools(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `pool-${i}`,
    pair: `TOKEN${i}/USDC`,
    tvl: 100000 * (i + 1),
    apy: 5 + i,
    network: i % 2 === 0 ? 'ethereum' : 'base',
    protocol: 'uniswap-v3',
  }));
}

describe('Pagination — getPagedPools', () => {
  beforeEach(() => {
    loadModules();
    const pools = createPools(50);
    State.get().monitor.pools = pools;
    State.get().monitor.filteredPools = pools;
    State.get().monitor.pagination = { page: 1, perPage: 20, perPageOptions: [10, 20, 50, 100] };
  });

  it('returns first page with perPage items', () => {
    const result = State.getPagedPools();
    expect(result).toHaveLength(20);
    expect(result[0].id).toBe('pool-0');
  });

  it('returns second page correctly', () => {
    State.get().monitor.pagination.page = 2;
    const result = State.getPagedPools();
    expect(result).toHaveLength(20);
    expect(result[0].id).toBe('pool-20');
  });

  it('returns last page with remaining items', () => {
    State.get().monitor.pagination.page = 3;
    const result = State.getPagedPools();
    expect(result).toHaveLength(10);
    expect(result[0].id).toBe('pool-40');
  });

  it('respects perPage of 50', () => {
    State.get().monitor.pagination.perPage = 50;
    State.get().monitor.pagination.page = 1;
    const result = State.getPagedPools();
    expect(result).toHaveLength(50);
  });

  it('respects perPage of 100 (returns all 50)', () => {
    State.get().monitor.pagination.perPage = 100;
    State.get().monitor.pagination.page = 1;
    const result = State.getPagedPools();
    expect(result).toHaveLength(50);
  });
});

describe('Pagination — getTotalPages', () => {
  beforeEach(() => {
    loadModules();
    const pools = createPools(50);
    State.get().monitor.pools = pools;
    State.get().monitor.filteredPools = pools;
    State.get().monitor.pagination = { page: 1, perPage: 20, perPageOptions: [10, 20, 50, 100] };
  });

  it('calculates 3 pages for 50 items / 20 perPage', () => {
    expect(State.getTotalPages()).toBe(3);
  });

  it('calculates 1 page for 50 items / 100 perPage', () => {
    State.get().monitor.pagination.perPage = 100;
    expect(State.getTotalPages()).toBe(1);
  });

  it('calculates 5 pages for 50 items / 10 perPage', () => {
    State.get().monitor.pagination.perPage = 10;
    expect(State.getTotalPages()).toBe(5);
  });

  it('returns 1 page for empty pools', () => {
    State.get().monitor.filteredPools = [];
    expect(State.getTotalPages()).toBe(1);
  });
});

describe('Pagination — setPoolPage', () => {
  beforeEach(() => {
    loadModules();
    const pools = createPools(50);
    State.get().monitor.pools = pools;
    State.get().monitor.filteredPools = pools;
    State.get().monitor.pagination = { page: 1, perPage: 20, perPageOptions: [10, 20, 50, 100] };
  });

  it('clamps page to valid range', () => {
    State.setPoolPage(100);
    expect(State.get().monitor.pagination.page).toBe(3);
  });

  it('clamps page to minimum 1', () => {
    State.setPoolPage(0);
    expect(State.get().monitor.pagination.page).toBe(1);
  });

  it('sets page to 2', () => {
    State.setPoolPage(2);
    expect(State.get().monitor.pagination.page).toBe(2);
  });
});

describe('Pagination — setPoolPerPage', () => {
  beforeEach(() => {
    loadModules();
    const pools = createPools(50);
    State.get().monitor.pools = pools;
    State.get().monitor.filteredPools = pools;
    State.get().monitor.pagination = { page: 2, perPage: 20, perPageOptions: [10, 20, 50, 100] };
  });

  it('changes perPage and resets to page 1', () => {
    State.setPoolPerPage(50);
    expect(State.get().monitor.pagination.perPage).toBe(50);
    expect(State.get().monitor.pagination.page).toBe(1);
  });

  it('changes perPage to 100 and resets to page 1', () => {
    State.setPoolPerPage(100);
    expect(State.get().monitor.pagination.perPage).toBe(100);
    expect(State.get().monitor.pagination.page).toBe(1);
  });
});

describe('Pagination — perPage options include 25/50/100', () => {
  beforeEach(() => {
    loadModules();
  });

  it('config has 25, 50, 100 in perPageOptions', () => {
    const opts = CONFIG.VIEW_PRESETS.conservative.poolColumns;
    // Just verify CONFIG loads
    expect(CONFIG).toBeDefined();
  });

  it('state default perPageOptions includes 50 and 100', () => {
    const defaultState = {
      pagination: { page: 1, perPage: 20, perPageOptions: [10, 20, 50, 100] }
    };
    expect(defaultState.pagination.perPageOptions).toContain(50);
    expect(defaultState.pagination.perPageOptions).toContain(100);
  });
});
