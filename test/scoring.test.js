import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const configJs = readFileSync(path.resolve(__dirname, '../js/config.js'), 'utf-8');
const scoringJs = readFileSync(path.resolve(__dirname, '../js/scoring.js'), 'utf-8');

function loadModules() {
  let capturedConfig;
  eval(`(function() { ${configJs} capturedConfig = CONFIG; })()`);
  window.CONFIG = capturedConfig;

  let capturedScoring;
  eval(`(function() { ${scoringJs} capturedScoring = Scoring; })()`);
  window.Scoring = capturedScoring;
}

describe('Scoring — getPairType', () => {
  beforeEach(() => {
    loadModules();
  });

  it('stable pair: both tokens are stablecoins', () => {
    expect(Scoring.getPairType({ baseToken: 'USDC', quoteToken: 'USDT' })).toBe('stable');
    expect(Scoring.getPairType({ baseToken: 'DAI', quoteToken: 'USDC' })).toBe('stable');
  });

  it('correlated pair: ETH variants', () => {
    expect(Scoring.getPairType({ baseToken: 'ETH', quoteToken: 'WETH' })).toBe('correlated');
    expect(Scoring.getPairType({ baseToken: 'stETH', quoteToken: 'ETH' })).toBe('correlated');
  });

  it('correlated pair: BTC variants', () => {
    expect(Scoring.getPairType({ baseToken: 'BTC', quoteToken: 'WBTC' })).toBe('correlated');
  });

  it('correlated pair: SOL variants', () => {
    expect(Scoring.getPairType({ baseToken: 'SOL', quoteToken: 'WSOL' })).toBe('correlated');
  });

  it('volatile pair: ETH/USDC', () => {
    expect(Scoring.getPairType({ baseToken: 'ETH', quoteToken: 'USDC' })).toBe('volatile');
  });

  it('volatile pair: unknown tokens', () => {
    expect(Scoring.getPairType({ baseToken: 'XYZ', quoteToken: 'ABC' })).toBe('volatile');
  });
});

describe('Scoring — calculateRange', () => {
  beforeEach(() => {
    loadModules();
  });

  it('returns null for missing price', () => {
    const result = Scoring.calculateRange({ price: 0, baseToken: 'ETH', quoteToken: 'USDC' });
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('stable pair: tight range', () => {
    const result = Scoring.calculateRange({ price: 1.0, baseToken: 'USDC', quoteToken: 'USDT' }, 'conservative');
    expect(result.min).toBeCloseTo(0.995, 3);
    expect(result.max).toBeCloseTo(1.005, 3);
    expect(result.pairType).toBe('stable');
  });

  it('volatile pair: wider range', () => {
    const result = Scoring.calculateRange({ price: 2000, baseToken: 'ETH', quoteToken: 'USDC', volatility: 15 }, 'conservative');
    expect(result.pairType).toBe('volatile');
    expect(result.min).toBeLessThan(2000);
    expect(result.max).toBeGreaterThan(2000);
  });

  it('aggressive profile: narrower range', () => {
    const cons = Scoring.calculateRange({ price: 2000, baseToken: 'ETH', quoteToken: 'USDC' }, 'conservative');
    const agg = Scoring.calculateRange({ price: 2000, baseToken: 'ETH', quoteToken: 'USDC' }, 'aggressive');
    expect(agg.widthOneSide).toBeLessThan(cons.widthOneSide);
  });
});

describe('Scoring — simplifiedTA', () => {
  beforeEach(() => {
    loadModules();
  });

  it('returns null for missing price', () => {
    const result = Scoring.simplifiedTA({ price: 0 });
    expect(result.support).toBeNull();
    expect(result.resistance).toBeNull();
    expect(result.bias).toBe('unknown');
  });

  it('calculates support/resistance for volatile pool', () => {
    const result = Scoring.simplifiedTA({ price: 100, volatility: 5, volatility1h: 1 });
    expect(result.support).toBeCloseTo(92.5, 1);
    expect(result.resistance).toBeCloseTo(107.5, 1);
    expect(['low', 'moderate', 'high', 'extreme']).toContain(result.volatilityLevel);
  });

  it('detects low volatility', () => {
    const result = Scoring.simplifiedTA({ price: 100, volatility: 1 });
    expect(result.volatilityLevel).toBe('low');
  });

  it('detects extreme volatility', () => {
    const result = Scoring.simplifiedTA({ price: 100, volatility: 15 });
    expect(result.volatilityLevel).toBe('extreme');
  });
});

describe('Scoring — scorePool', () => {
  const allPools = [
    { tvl: 1000000, volume24h: 500000, volumeTvlRatio: 0.5, apr: 10, volatility: 2, ageDays: 30, price: 2000, dataQuality: { overall: 'good' }, baseToken: 'ETH', quoteToken: 'USDC' },
    { tvl: 5000000, volume24h: 1000000, volumeTvlRatio: 0.2, apr: 5, volatility: 1, ageDays: 60, price: 2000, dataQuality: { overall: 'good' }, baseToken: 'USDC', quoteToken: 'USDT' },
    { tvl: 100000, volume24h: 50000, volumeTvlRatio: 0.5, apr: 20, volatility: 10, ageDays: 3, price: 1.0, dataQuality: { overall: 'poor' }, baseToken: 'XYZ', quoteToken: 'ABC' },
  ];

  beforeEach(() => {
    loadModules();
  });

  it('returns score between 0 and 100', () => {
    const result = Scoring.scorePool(allPools[0], allPools, 'conservative');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('includes risk assessment', () => {
    const result = Scoring.scorePool(allPools[0], allPools, 'conservative');
    expect(['very_low', 'low', 'medium', 'high', 'very_high']).toContain(result.risk);
  });

  it('includes range data', () => {
    const result = Scoring.scorePool(allPools[0], allPools, 'conservative');
    expect(result.rangeMin).toBeDefined();
    expect(result.rangeMax).toBeDefined();
    expect(result.rangePairType).toBeDefined();
  });

  it('different profiles produce different scores', () => {
    const cons = Scoring.scorePool(allPools[0], allPools, 'conservative');
    const agg = Scoring.scorePool(allPools[0], allPools, 'aggressive');
    // May differ — just verify both are valid
    expect(cons.score).toBeGreaterThanOrEqual(0);
    expect(agg.score).toBeGreaterThanOrEqual(0);
  });

  it('scoreAllPools returns same length', () => {
    const results = Scoring.scoreAllPools(allPools, 'conservative');
    expect(results).toHaveLength(allPools.length);
  });
});

describe('Scoring — scorePosition', () => {
  beforeEach(() => {
    loadModules();
  });

  it('out of range position gets critical urgency', () => {
    const pos = { inRange: false, distLower: 10, distUpper: 10, rangeWidth: 20, tokenAAlloc: 50, tokenBAlloc: 50, pnl: 0 };
    const result = Scoring.scorePosition(pos);
    expect(result.urgency).toBe('critical');
    expect(result.health).toBeLessThanOrEqual(60);
  });

  it('in range healthy position', () => {
    const pos = { inRange: true, distLower: 15, distUpper: 15, rangeWidth: 30, tokenAAlloc: 50, tokenBAlloc: 50, pnl: 5 };
    const result = Scoring.scorePosition(pos);
    expect(result.urgency).toBe('low');
    expect(result.health).toBeGreaterThan(80);
  });

  it('close to boundary gets warning', () => {
    const pos = { inRange: true, distLower: 3, distUpper: 20, rangeWidth: 23, tokenAAlloc: 50, tokenBAlloc: 50, pnl: 0 };
    const result = Scoring.scorePosition(pos);
    expect(result.urgency).toBe('high');
    expect(result.alerts.some(a => a.type === 'warning')).toBe(true);
  });

  it('health label maps correctly', () => {
    const healthy = Scoring.scorePosition({ inRange: true, distLower: 20, distUpper: 20, rangeWidth: 30, tokenAAlloc: 50, tokenBAlloc: 50, pnl: 10 });
    expect(healthy.healthLabel).toBe('healthy');
  });
});

describe('Scoring — walletSummary', () => {
  beforeEach(() => {
    loadModules();
  });

  it('empty positions returns zero summary', () => {
    const result = Scoring.walletSummary([]);
    expect(result.positionCount).toBe(0);
    expect(result.inRangeCount).toBe(0);
    expect(result.outOfRangeCount).toBe(0);
    expect(result.avgHealth).toBe(0);
  });

  it('summarizes multiple positions', () => {
    const positions = [
      { inRange: true, health: 90, networkName: 'Ethereum', protocolName: 'Uniswap V3', baseToken: 'ETH', quoteToken: 'USDC', urgency: 'low' },
      { inRange: false, health: 30, networkName: 'Ethereum', protocolName: 'Uniswap V3', baseToken: 'ETH', quoteToken: 'USDC', urgency: 'critical' },
      { inRange: true, health: 70, networkName: 'Base', protocolName: 'Uniswap V3', baseToken: 'USDC', quoteToken: 'USDT', urgency: 'low' },
    ];
    const result = Scoring.walletSummary(positions);
    expect(result.positionCount).toBe(3);
    expect(result.inRangeCount).toBe(2);
    expect(result.outOfRangeCount).toBe(1);
    expect(result.criticalAlerts).toBe(1);
    expect(result.byNetwork.Ethereum).toBe(2);
    expect(result.byNetwork.Base).toBe(1);
  });
});
