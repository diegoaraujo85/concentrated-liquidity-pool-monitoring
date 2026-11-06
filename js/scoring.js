// Scoring, Analytics, and Range Analysis Module
import { CONFIG } from './config.js';

  // Determine pair type
  function getPairType(pool) {
    const base = (pool.baseToken || '').toUpperCase();
    const quote = (pool.quoteToken || '').toUpperCase();
    const stables = CONFIG.STABLECOINS.map(s => s.toUpperCase());

    const baseStable = stables.includes(base);
    const quoteStable = stables.includes(quote);

    if (baseStable && quoteStable) return 'stable';

    // Correlated pairs: same underlying (stETH/ETH, WBTC/BTC, etc.)
    const ethVariants = ['ETH', 'WETH', 'STETH', 'WSTETH', 'RETH', 'CBETH', 'METH'];
    const btcVariants = ['BTC', 'WBTC', 'TBTC', 'RENBTC', 'SBTC', 'CBBTC'];
    const solVariants = ['SOL', 'WSOL', 'MSOL', 'JITOSOL', 'BNSOL'];

    for (const group of [ethVariants, btcVariants, solVariants]) {
      if (group.includes(base) && group.includes(quote)) return 'correlated';
    }

    return 'volatile';
  }

  // Calculate suggested range based on pair type and profile
  function calculateRange(pool, profile = 'conservative') {
    const pairType = getPairType(pool);
    const ranges = CONFIG.RANGES[profile.toUpperCase()] || CONFIG.RANGES.CONSERVATIVE;
    const price = pool.price || 0;

    if (price <= 0) {
      return { min: null, max: null, width: null, justification: 'Price data unavailable', confidence: 'low' };
    }

    let widthPct;
    let justification;

    switch (pairType) {
      case 'stable':
        widthPct = ranges.stablePct;
        justification = `Stable pair: tight ${profile} range of ±${widthPct}%. Stablecoins typically maintain peg within 0.1-0.5%.`;
        break;
      case 'correlated':
        widthPct = ranges.correlatedPct;
        justification = `Correlated pair: ${profile} range of ±${widthPct}%. Assets track each other with minor deviations.`;
        break;
      case 'volatile':
      default:
        widthPct = ranges.volatilePct;
        // Adjust based on actual volatility if available
        if (pool.volatility > 10) {
          widthPct *= 1.5;
          justification = `Volatile pair: widened ${profile} range of ±${widthPct.toFixed(1)}% due to high 24h volatility (${pool.volatility.toFixed(1)}%).`;
        } else if (pool.volatility > 5) {
          widthPct *= 1.2;
          justification = `Volatile pair: slightly widened ${profile} range of ±${widthPct.toFixed(1)}% based on moderate volatility.`;
        } else {
          justification = `Volatile pair: standard ${profile} range of ±${widthPct}%. Covers typical daily price movement.`;
        }
        break;
    }

    const min = price * (1 - widthPct / 100);
    const max = price * (1 + widthPct / 100);

    return {
      min,
      max,
      width: widthPct * 2, // total width
      widthOneSide: widthPct,
      justification,
      pairType,
      confidence: pool.volatility > 0 ? 'medium' : 'low'
    };
  }

  // Simplified technical analysis
  function simplifiedTA(pool) {
    const vol = pool.volatility || 0;
    const vol1h = pool.volatility1h || 0;
    const price = pool.price || 0;

    if (price <= 0) {
      return { support: null, resistance: null, bias: 'unknown', volatilityLevel: 'unknown', confidence: 'none' };
    }

    // Rough support/resistance from recent volatility
    const support = price * (1 - vol / 100 * 1.5);
    const resistance = price * (1 + vol / 100 * 1.5);

    // Bias detection (very simplified)
    let bias = 'lateral';
    if (vol1h > 0 && vol > 0) {
      const momentum = vol1h / (vol / 24);
      if (momentum > 1.5) bias = 'trending';
      else if (momentum < 0.5) bias = 'consolidating';
    }

    let volatilityLevel;
    if (vol < 2) volatilityLevel = 'low';
    else if (vol < 5) volatilityLevel = 'moderate';
    else if (vol < 10) volatilityLevel = 'high';
    else volatilityLevel = 'extreme';

    return {
      support,
      resistance,
      bias,
      volatilityLevel,
      confidence: 'low', // Always low since this is based on limited data
      note: 'Based on 24h price change only. Not a substitute for full technical analysis.'
    };
  }

  // Normalize a value to 0-1 scale
  function normalize(value, min, max, invert = false) {
    if (max === min) return 0.5;
    let normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return invert ? 1 - normalized : normalized;
  }

  // Score a pool
  function scorePool(pool, allPools, profile = 'conservative') {
    const weights = CONFIG.SCORING[profile.toUpperCase()] || CONFIG.SCORING.CONSERVATIVE;

    // Collect stats for normalization
    const tvls = allPools.map(p => p.tvl).filter(v => v > 0);
    const volumes = allPools.map(p => p.volume24h).filter(v => v > 0);
    const ratios = allPools.map(p => p.volumeTvlRatio).filter(v => v > 0);
    const ages = allPools.map(p => p.ageDays).filter(v => v !== null && v > 0);
    const vols = allPools.map(p => p.volatility).filter(v => v > 0);
    const aprs = allPools.map(p => p.apr).filter(v => v > 0);

    const percentile = (arr, val) => {
      if (arr.length === 0 || val === null || val === undefined) return 0.5;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = sorted.findIndex(v => v >= val);
      return idx === -1 ? 1 : idx / sorted.length;
    };

    const components = {
      tvl: percentile(tvls, pool.tvl),
      volume: percentile(volumes, pool.volume24h),
      volumeTvlRatio: percentile(ratios, pool.volumeTvlRatio),
      feeYield: percentile(aprs, pool.apr),
      volatility: percentile(vols, pool.volatility), // higher vol = higher value, weight is negative for conservative
      age: percentile(ages, pool.ageDays),
      liquidityEffective: pool.tvl > 100000 ? normalize(pool.tvl, 100000, 10000000) : 0,
      rangeRisk: pool.volatility > 0 ? normalize(pool.volatility, 0, 20) : 0.5
    };

    // Weighted score
    let score = 0;
    let totalWeight = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const component = components[key] ?? 0.5;
      score += component * weight;
      totalWeight += Math.abs(weight);
    }

    // Normalize to 0-100
    score = totalWeight > 0 ? ((score / totalWeight + 1) / 2) * 100 : 50;
    score = Math.max(0, Math.min(100, score));

    // Risk assessment
    let risk;
    const riskScore = (
      (pool.volatility > 10 ? 3 : pool.volatility > 5 ? 2 : 1) +
      (pool.tvl < 100000 ? 3 : pool.tvl < 500000 ? 2 : 1) +
      (pool.ageDays !== null && pool.ageDays < 7 ? 3 : pool.ageDays !== null && pool.ageDays < 30 ? 2 : 1) +
      (pool.dataQuality.overall === 'poor' ? 2 : 0)
    );

    if (riskScore >= 9) risk = 'very_high';
    else if (riskScore >= 7) risk = 'high';
    else if (riskScore >= 5) risk = 'medium';
    else if (riskScore >= 3) risk = 'low';
    else risk = 'very_low';

    // Range exit probability (simplified)
    const range = calculateRange(pool, profile);
    let rangeExitProb = null;
    if (pool.volatility > 0 && range.widthOneSide) {
      // Very rough: if daily vol > range width, high exit probability
      const dailyVolEstimate = pool.volatility; // 24h price change as proxy
      rangeExitProb = Math.min(95, Math.max(5, (dailyVolEstimate / range.widthOneSide) * 50));
    }

    // In range estimation (for pool monitor, not position-specific)
    const inRange = range.min !== null && range.max !== null && pool.price >= range.min && pool.price <= range.max;
    const rangeCenterDist = range.min !== null ?
      Math.abs(pool.price - (range.min + range.max) / 2) / pool.price * 100 : null;

    return {
      ...pool,
      score: Math.round(score * 10) / 10,
      risk,
      riskScore,
      rangeMin: range.min,
      rangeMax: range.max,
      rangeWidth: range.width,
      rangeJustification: range.justification,
      rangePairType: range.pairType,
      rangeExitProb: rangeExitProb !== null ? Math.round(rangeExitProb) : null,
      inRange,
      rangeCenterDist: rangeCenterDist !== null ? Math.round(rangeCenterDist * 100) / 100 : null,
      ta: simplifiedTA(pool),
      liquidityEffective: components.liquidityEffective,
      pairType: getPairType(pool),
      correlationScore: pool.pairType === 'correlated' ? 0.70 : (pool.pairType === 'stable' ? 0.95 : 0.30),
      scoreComponents: components
    };
  }

  // Score all pools
  function scoreAllPools(pools, profile = 'conservative') {
    return pools.map(p => scorePool(p, pools, profile));
  }

  // Health score for a wallet position
  function scorePosition(position) {
    let health = 100;
    let urgency = 'low';
    const alerts = [];

    // Out of range is critical
    if (position.inRange === false) {
      health -= 40;
      urgency = 'critical';
      alerts.push({ type: 'critical', message: 'Position is out of range - earning zero fees' });
    }

    // Close to boundaries
    if (position.inRange && (position.distLower < 5 || position.distUpper < 5)) {
      health -= 20;
      urgency = urgency === 'critical' ? 'critical' : 'high';
      const side = position.distLower < position.distUpper ? 'lower' : 'upper';
      alerts.push({ type: 'warning', message: `Price is within ${Math.min(position.distLower, position.distUpper).toFixed(1)}% of ${side} bound` });
    } else if (position.inRange && (position.distLower < 10 || position.distUpper < 10)) {
      health -= 10;
      if (urgency === 'low') urgency = 'medium';
      alerts.push({ type: 'info', message: 'Price approaching range boundary' });
    }

    // Very wide range = low efficiency
    if (position.rangeWidth > 100) {
      health -= 5;
      alerts.push({ type: 'info', message: 'Very wide range - low capital efficiency' });
    }

    // High concentration in one token
    if (position.tokenAAlloc > 90 || position.tokenBAlloc > 90) {
      health -= 10;
      alerts.push({ type: 'warning', message: 'Highly concentrated in one token' });
    }

    // Negative PnL
    if (position.pnl !== null && position.pnl < -10) {
      health -= 10;
      alerts.push({ type: 'warning', message: `Significant negative PnL: ${position.pnl.toFixed(1)}%` });
    }

    health = Math.max(0, Math.min(100, health));

    return {
      ...position,
      health,
      urgency,
      alerts,
      healthLabel: health >= 80 ? 'healthy' : health >= 50 ? 'attention' : health >= 25 ? 'warning' : 'critical'
    };
  }

  // Score all positions
  function scoreAllPositions(positions) {
    return positions.map(scorePosition);
  }

  // Wallet summary
  function walletSummary(positions) {
    const total = positions.length;
    if (total === 0) {
      return {
        totalValue: 0, totalPnl: null, totalFees: null, totalUncollectedFees: null,
        positionCount: 0, inRangeCount: 0, outOfRangeCount: 0, inRangePct: 0,
        byNetwork: {}, byProtocol: {}, byAsset: {}, avgHealth: 0, riskLevel: 'unknown',
        stablePct: 0
      };
    }

    let inRange = 0, outRange = 0;
    let totalHealth = 0;
    const byNetwork = {};
    const byProtocol = {};
    const assetCount = {};
    let stablePositions = 0;

    for (const pos of positions) {
      if (pos.inRange) inRange++; else outRange++;
      totalHealth += pos.health || 0;

      byNetwork[pos.networkName] = (byNetwork[pos.networkName] || 0) + 1;
      byProtocol[pos.protocolName] = (byProtocol[pos.protocolName] || 0) + 1;

      if (pos.baseToken) assetCount[pos.baseToken] = (assetCount[pos.baseToken] || 0) + 1;
      if (pos.quoteToken) assetCount[pos.quoteToken] = (assetCount[pos.quoteToken] || 0) + 1;

      const stables = CONFIG.STABLECOINS.map(s => s.toUpperCase());
      if (stables.includes((pos.baseToken || '').toUpperCase()) && stables.includes((pos.quoteToken || '').toUpperCase())) {
        stablePositions++;
      }
    }

    const avgHealth = totalHealth / total;
    let riskLevel;
    if (avgHealth >= 80) riskLevel = 'low';
    else if (avgHealth >= 60) riskLevel = 'medium';
    else if (avgHealth >= 40) riskLevel = 'high';
    else riskLevel = 'critical';

    return {
      totalValue: null, // Would need USD values
      totalPnl: null,
      totalFees: null,
      totalUncollectedFees: null,
      positionCount: total,
      inRangeCount: inRange,
      outOfRangeCount: outRange,
      inRangePct: total > 0 ? (inRange / total * 100) : 0,
      byNetwork,
      byProtocol,
      byAsset: assetCount,
      avgHealth: Math.round(avgHealth),
      riskLevel,
      stablePct: total > 0 ? (stablePositions / total * 100) : 0,
      criticalAlerts: positions.filter(p => p.urgency === 'critical').length,
      warningAlerts: positions.filter(p => p.urgency === 'high' || p.urgency === 'medium').length
    };
  }

const Scoring = {
  getPairType,
  calculateRange,
  simplifiedTA,
  scorePool,
  scoreAllPools,
  scorePosition,
  scoreAllPositions,
  walletSummary
};

export { Scoring };
