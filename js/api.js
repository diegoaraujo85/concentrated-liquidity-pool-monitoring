// API Layer - Data fetching and normalization
// Priority: DeFi Llama > CoinGecko/GeckoTerminal > On-chain RPC
import { CONFIG } from './config.js';
import { checkApiHealth } from './health-check.js';

  let lastRequestTime = 0;

  // --- Retry + failure cache utilities ---
  async function retryAsync(fn, maxRetries = 2, baseDelayMs = 800) {
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

  class FailureCache {
    constructor(ttlMs = 300000) {
      this.cache = new Map();
      this.ttlMs = ttlMs;
    }
    get(key) {
      const entry = this.cache.get(key);
      if (!entry) return null;
      if (Date.now() - entry.failureTime > entry.ttl) {
        this.cache.delete(key);
        return null;
      }
      return entry;
    }
    set(key, ttlMs = this.ttlMs) {
      this.cache.set(key, { failureTime: Date.now(), ttl: ttlMs });
    }
    delete(key) { this.cache.delete(key); }
    has(key) { return this.get(key) !== null; }
    clear() { this.cache.clear(); }
  }

  const TOKEN_FAILURE_CACHE = new FailureCache(300000); // 5 min

  // --- Fetch utilities ---

  async function rateLimitedFetch(url, options = {}, timeoutMs) {
    const now = Date.now();
    const gap = now - lastRequestTime;
    if (gap < CONFIG.API.REQUEST_DELAY) {
      await new Promise(r => setTimeout(r, CONFIG.API.REQUEST_DELAY - gap));
    }
    lastRequestTime = Date.now();

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs || CONFIG.API.TIMEOUT);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  async function fetchWithRetry(url, options = {}, retries = CONFIG.API.MAX_RETRIES, timeoutMs) {
    for (let i = 0; i <= retries; i++) {
      try {
        return await rateLimitedFetch(url, options, timeoutMs);
      } catch (e) {
        if (e.name === 'TypeError' || e.message?.includes('404') || i === retries) throw e;
        await new Promise(r => setTimeout(r, 800 * (i + 1)));
      }
    }
  }

  // =============================================
  // 1. DEFI LLAMA — Primary data source
  // =============================================

  // Map DeFi Llama chain names to our network keys
  const LLAMA_CHAIN_MAP = {};
  for (const [key, net] of Object.entries(CONFIG.NETWORKS)) {
    LLAMA_CHAIN_MAP[net.llamaChain?.toLowerCase()] = key;
  }

  // Map DeFi Llama project names to our protocol keys
  const LLAMA_PROJECT_MAP = {};
  for (const [key, proto] of Object.entries(CONFIG.PROTOCOLS)) {
    LLAMA_PROJECT_MAP[proto.llamaProject?.toLowerCase()] = key;
  }

  function normalizeLlamaPool(raw) {
    const chain = (raw.chain || '').toLowerCase();
    const project = (raw.project || '').toLowerCase();

    const networkKey = LLAMA_CHAIN_MAP[chain];
    const protocolKey = LLAMA_PROJECT_MAP[project];

    if (!networkKey || !protocolKey) return null;

    const network = CONFIG.NETWORKS[networkKey];
    const protocol = CONFIG.PROTOCOLS[protocolKey];

    // Parse symbol (e.g. "USDC-WETH" or "WBTC-USDC")
    const symbol = raw.symbol || '';
    const tokens = symbol.split('-');
    const baseToken = tokens[0] || '?';
    const quoteToken = tokens[1] || '?';

    const tvl = raw.tvlUsd || 0;
    const apy = raw.apy || 0;
    const apyBase = raw.apyBase || 0;
    const apyReward = raw.apyReward || 0;
    const volume24h = raw.volumeUsd1d || 0;
    const volume7d = raw.volumeUsd7d || 0;

    // Fee tier from pool metadata or inferred
    let feeTier = null;
    const poolMeta = raw.poolMeta || '';
    const feeMatch = poolMeta.match(/([\d.]+)%/);
    if (feeMatch) feeTier = parseFloat(feeMatch[1]);

    // Volatility from IL data if available
    const il7d = raw.il7d || null;
    const apyPct1D = raw.apyPct1D || 0;
    const apyPct7D = raw.apyPct7D || 0;

    const volumeTvlRatio = tvl > 0 ? volume24h / tvl : 0;

    // Stablecoin detection
    const stables = CONFIG.STABLECOINS.map(s => s.toUpperCase());
    const bothStable = stables.includes(baseToken.toUpperCase()) && stables.includes(quoteToken.toUpperCase());

    // Exposure type from DeFi Llama
    const exposure = raw.exposure || '';

    // DeFi Llama pool page URL
    const llamaUrl = `https://defillama.com/yields/pool/${raw.pool}`;

    return {
      id: raw.pool || `${networkKey}-${protocolKey}-${symbol}`,
      address: raw.pool || '',
      protocol: protocolKey,
      protocolName: protocol.name,
      network: networkKey,
      networkName: network.name,
      pair: `${baseToken}/${quoteToken}`,
      baseToken,
      quoteToken,
      feeTier,
      feeTierLabel: feeTier ? `${feeTier}%` : poolMeta || 'N/A',
      price: null, // DeFi Llama doesn't give price per se
      volume24h,
      volume7d,
      tvl,
      apr: apy > 0 ? apy : apyBase, // Use APY as the main metric
      apy,
      apyBase,
      apyReward,
      volatility: Math.abs(apyPct1D), // daily APY change as volatility proxy
      volatility7d: Math.abs(apyPct7D),
      ageDays: null, // Not available from DeFi Llama
      createdAt: null,
      volumeTvlRatio,
      pairType: bothStable ? 'stable' : 'volatile',
      correlationScore: bothStable ? 0.95 : 0.30,
      il7d,
      exposure,

      // Range (computed by scoring)
      rangeMin: null, rangeMax: null, rangeWidth: null,
      inRange: null, rangeExitProb: null, rangeCenterDist: null,

      // Scoring (computed later)
      score: null, risk: null, liquidityEffective: null,

      // Data source tracking
      source: 'defillama',
      sourceName: 'DeFi Llama',
      sourceUrl: llamaUrl,

      // Data quality
      dataQuality: {
        priceConfirmed: false,
        volumeConfirmed: volume24h > 0,
        tvlConfirmed: tvl > 0,
        aprSource: apy > 0 ? 'defillama' : (apyBase > 0 ? 'defillama_base' : 'unavailable'),
        volatilitySource: apyPct1D !== 0 ? 'defillama_apy_change' : 'unavailable',
        ageConfirmed: false,
        overall: 'good',
        score: 0, total: 5
      },

      // Links
      geckoUrl: llamaUrl, // backward compat
      llamaUrl,
      lastUpdated: new Date().toISOString(),
      rawData: raw
    };
  }

  function computeDataQuality(pool) {
    const dq = pool.dataQuality;
    let s = 0;
    if (dq.volumeConfirmed) s++;
    if (dq.tvlConfirmed) s++;
    if (dq.aprSource !== 'unavailable') s++;
    if (dq.volatilitySource !== 'unavailable') s++;
    if (dq.priceConfirmed) s++;
    dq.score = s;
    dq.total = 5;
    dq.overall = s >= 3 ? 'good' : s >= 2 ? 'partial' : 'poor';
    return pool;
  }

  // Fetch all pools from DeFi Llama
  async function fetchDefiLlamaPools(onProgress) {
    if (onProgress) onProgress({ phase: 'fetching', protocol: 'All', network: 'All', completed: 0, total: 1 });

    const data = await fetchWithRetry(CONFIG.API.DEFI_LLAMA_YIELDS);
    const rawPools = data.data || [];

    if (onProgress) onProgress({ phase: 'processing', protocol: 'DeFi Llama', network: 'All', completed: 1, total: 1 });

    // Filter to our target protocols and chains
    const targetProjects = new Set(Object.values(CONFIG.PROTOCOLS).map(p => p.llamaProject?.toLowerCase()).filter(Boolean));
    const targetChains = new Set(Object.values(CONFIG.NETWORKS).map(n => n.llamaChain?.toLowerCase()).filter(Boolean));

    const pools = [];
    for (const raw of rawPools) {
      const project = (raw.project || '').toLowerCase();
      const chain = (raw.chain || '').toLowerCase();

      if (!targetProjects.has(project) || !targetChains.has(chain)) continue;

      const normalized = normalizeLlamaPool(raw);
      if (normalized) {
        computeDataQuality(normalized);
        pools.push(normalized);
      }
    }

    return pools;
  }

  // =============================================
  // 2. MAIN FETCH — Orchestrator
  // =============================================

  async function fetchAllPools(onProgress) {
    const pools = [];
    const errors = [];

    try {
      if (onProgress) onProgress({ phase: 'fetching', protocol: 'DeFi Llama', network: 'All chains', completed: 0, total: 1 });

      const llamaPools = await fetchDefiLlamaPools(onProgress);
      pools.push(...llamaPools);

      if (onProgress) onProgress({ phase: 'done', protocol: 'DeFi Llama', network: 'All chains', completed: 1, total: 1 });
    } catch (e) {
      errors.push({ protocol: 'DeFi Llama', network: 'all', error: e.message });
      console.error('[CLP] DeFi Llama fetch failed:', e.message);
    }

    return { pools, errors, timestamp: new Date().toISOString() };
  }

  // =============================================
  // 3. SEARCH — via GeckoTerminal (fallback)
  // =============================================

  async function searchPools(query) {
    try {
      const url = `${CONFIG.API.GECKO_BASE}/search/pools?query=${encodeURIComponent(query)}`;
      const data = await fetchWithRetry(url);
      return (data.data || []).map(r => {
        const attrs = r.attributes || {};
        const baseToken = attrs.name ? attrs.name.split(' / ')[0]?.trim() : '?';
        const quoteToken = attrs.name ? attrs.name.split(' / ')[1]?.split(' ')?.[0]?.trim() : '?';
        const volume24h = parseFloat(attrs.volume_usd?.h24) || 0;
        const tvl = parseFloat(attrs.reserve_in_usd) || 0;
        const price = parseFloat(attrs.base_token_price_usd) || 0;

        return {
          id: r.id || `search-${attrs.address}`,
          address: attrs.address || '',
          protocol: 'unknown',
          protocolName: attrs.name?.includes('Uniswap') ? 'Uniswap V3' : 'Unknown',
          network: 'ethereum',
          networkName: 'Unknown',
          pair: `${baseToken}/${quoteToken}`,
          baseToken, quoteToken,
          feeTier: null, feeTierLabel: 'N/A',
          price, volume24h, tvl,
          apr: tvl > 0 ? (volume24h * 0.003 * 365 / tvl) * 100 : 0,
          apy: 0, apyBase: 0, apyReward: 0,
          volatility: 0, ageDays: null, volumeTvlRatio: tvl > 0 ? volume24h / tvl : 0,
          pairType: 'volatile',
          score: null, risk: null,
          source: 'geckoterminal',
          sourceName: 'GeckoTerminal',
          sourceUrl: `https://www.geckoterminal.com/pools/${attrs.address}`,
          llamaUrl: null,
          geckoUrl: `https://www.geckoterminal.com/pools/${attrs.address}`,
          dataQuality: { overall: 'partial', score: 2, total: 5, priceConfirmed: price > 0, volumeConfirmed: volume24h > 0, tvlConfirmed: tvl > 0, aprSource: 'estimated', volatilitySource: 'unavailable', ageConfirmed: false },
          lastUpdated: new Date().toISOString(),
          rawData: attrs
        };
      });
    } catch (e) {
      console.error('Pool search failed:', e);
      return [];
    }
  }

  // =============================================
  // 4. WALLET TRACKING — Direct RPC calls
  // =============================================

  const POSITION_MANAGER = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
  const FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

  const RPC_URLS = {
    ethereum: 'https://eth.llamarpc.com',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    polygon: 'https://polygon-rpc.com',
    base: 'https://mainnet.base.org',
    bsc: 'https://bsc-dataseed.binance.org'
  };

  const ABI = {
    balanceOf: '0x70a08231',
    tokenOfOwnerByIndex: '0x2f745c59',
    positions: '0x99fbab88',
    slot0: '0x3850c7bd',
    getPool: '0x1698ee82'
  };

  function padAddress(addr) { return '0x' + addr.replace('0x', '').toLowerCase().padStart(64, '0'); }
  function padUint256(num) { return '0x' + BigInt(num).toString(16).padStart(64, '0'); }
  function decodeUint256(hex) { if (!hex || hex === '0x') return 0n; return BigInt(hex.slice(0, 66)); }

  async function ethCall(rpcUrl, to, data) {
    const res = await rateLimitedFetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to, data }, 'latest'], id: Date.now() })
    }, CONFIG.API.RPC_TIMEOUT);
    if (res.error) throw new Error(res.error.message || 'RPC error');
    return res.result;
  }

  function decodePositionsResult(hex) {
    if (!hex || hex.length < 642) return null;
    const c = hex.replace('0x', '');
    const w = (i) => c.slice(i * 64, (i + 1) * 64);
    const toAddr = (s) => '0x' + s.slice(24);
    const toSigned = (s) => { let v = BigInt('0x' + s); if (v >= 2n ** 255n) v -= 2n ** 256n; return Number(v); };
    const toUint = (s) => BigInt('0x' + s);
    return {
      nonce: Number(toUint(w(0))), operator: toAddr(w(1)),
      token0: toAddr(w(2)), token1: toAddr(w(3)),
      fee: Number(toUint(w(4))),
      tickLower: toSigned(w(5)), tickUpper: toSigned(w(6)),
      liquidity: toUint(w(7)).toString(),
      tokensOwed0: toUint(w(10)).toString(),
      tokensOwed1: toUint(w(11)).toString()
    };
  }

  function decodeSlot0(hex) {
    if (!hex || hex.length < 194) return null;
    const c = hex.replace('0x', '');
    const w = (i) => c.slice(i * 64, (i + 1) * 64);
    const toSigned = (s) => { let v = BigInt('0x' + s); if (v >= 2n ** 255n) v -= 2n ** 256n; return Number(v); };
    return { sqrtPriceX96: BigInt('0x' + w(0)), tick: toSigned(w(1)) };
  }

  const TOKEN_SYMBOLS = {};
  async function getTokenSymbol(rpcUrl, tokenAddr) {
    const key = tokenAddr.toLowerCase();

    // Return cached success
    if (TOKEN_SYMBOLS[key]) return TOKEN_SYMBOLS[key];

    // Return cached failure if within TTL (don't retry yet)
    if (TOKEN_FAILURE_CACHE.has(key)) return TOKEN_FAILURE_CACHE.get(key).fallback;

    try {
      const result = await retryAsync(
        () => ethCall(rpcUrl, tokenAddr, '0x95d89b41'),
        2, // maxRetries
        800 // baseDelayMs
      );
      if (result && result.length > 130) {
        const len = parseInt(result.slice(66, 130), 16);
        const raw = result.slice(130, 130 + len * 2);
        const sym = Array.from({ length: len }, (_, i) => String.fromCharCode(parseInt(raw.slice(i * 2, i * 2 + 2), 16))).join('');
        TOKEN_SYMBOLS[key] = sym;
        return sym;
      }
    } catch (e) { /* retry exhausted — fall through to cache failure */ }

    // Cache failure (not permanent — TTL allows retry later)
    const fallback = key.slice(0, 6) + '…';
    TOKEN_FAILURE_CACHE.set(key);
    TOKEN_FAILURE_CACHE.get(key).fallback = fallback;
    return fallback;
  }

  async function fetchWalletPositions(address, network) {
    const positions = [];
    const limitations = [];
    const rpcUrl = RPC_URLS[network];

    if (!rpcUrl) {
      if (network === 'solana') {
        limitations.push({ source: 'Solana LP Tracking', network: 'solana', reason: 'Solana LP positions require Orca/Raydium-specific indexers', impact: 'Use app.orca.so or app.raydium.io directly.' });
      } else {
        limitations.push({ source: 'LP Tracking', network, reason: `No RPC configured for ${network}`, impact: 'Position data unavailable.' });
      }
      return { positions, limitations };
    }

    try {
      const balHex = await ethCall(rpcUrl, POSITION_MANAGER, ABI.balanceOf + padAddress(address).slice(2));
      const balance = Number(decodeUint256(balHex));
      if (balance === 0) return { positions, limitations };

      const count = Math.min(balance, 50);
      if (balance > 50) limitations.push({ source: 'Limit', network, reason: `${balance} positions, showing first 50`, impact: 'Some positions hidden.' });

      const tokenIds = [];
      for (let i = 0; i < count; i++) {
        const data = ABI.tokenOfOwnerByIndex + padAddress(address).slice(2) + padUint256(i).slice(2);
        const r = await ethCall(rpcUrl, POSITION_MANAGER, data);
        tokenIds.push(Number(decodeUint256(r)));
      }

      for (const tokenId of tokenIds) {
        try {
          const posHex = await ethCall(rpcUrl, POSITION_MANAGER, ABI.positions + padUint256(tokenId).slice(2));
          const pos = decodePositionsResult(posHex);
          if (!pos || pos.liquidity === '0') continue;

          const [sym0, sym1] = await Promise.all([
            getTokenSymbol(rpcUrl, pos.token0),
            getTokenSymbol(rpcUrl, pos.token1)
          ]);

          let currentTick = 0;
          try {
            const poolHex = await ethCall(rpcUrl, FACTORY_ADDRESS,
              ABI.getPool + padAddress(pos.token0).slice(2) + padAddress(pos.token1).slice(2) + padUint256(pos.fee).slice(2));
            const poolAddr = '0x' + poolHex.slice(26);
            if (poolAddr !== '0x' + '0'.repeat(40)) {
              const slot0 = decodeSlot0(await ethCall(rpcUrl, poolAddr, ABI.slot0));
              if (slot0) currentTick = slot0.tick;
            }
          } catch (e) { /* pool query failed */ }

          const priceLower = Math.pow(1.0001, pos.tickLower);
          const priceUpper = Math.pow(1.0001, pos.tickUpper);
          const currentPrice = Math.pow(1.0001, currentTick);
          const inRange = currentTick >= pos.tickLower && currentTick <= pos.tickUpper;
          const rangeWidth = priceLower > 0 ? ((priceUpper - priceLower) / priceLower) * 100 : 0;
          const distLower = currentPrice > 0 ? ((currentPrice - priceLower) / currentPrice) * 100 : 0;
          const distUpper = currentPrice > 0 ? ((priceUpper - currentPrice) / currentPrice) * 100 : 0;
          const rangeUtil = (priceUpper - priceLower) > 0 ? Math.max(0, Math.min(1, (currentPrice - priceLower) / (priceUpper - priceLower))) * 100 : 0;
          const feePct = pos.fee / 10000;

          positions.push({
            id: `${network}-${tokenId}`, protocol: 'uniswap-v3', protocolName: 'Uniswap V3',
            network, networkName: CONFIG.NETWORKS[network]?.name || network,
            pair: `${sym0}/${sym1}`, baseToken: sym0, quoteToken: sym1,
            positionId: tokenId.toString(), feeTier: feePct, feeTierLabel: `${feePct}%`,
            valueInvested: null, valueCurrent: null, pnl: null,
            feesAccumulated: { token0: null, token1: null, usd: null },
            feesUncollected: { token0: null, token1: null, usd: null, note: 'Requires complex on-chain computation' },
            rangeMin: priceLower, rangeMax: priceUpper, rangeWidth, currentPrice, inRange,
            distLower, distUpper, rangeUtil,
            tokenAAlloc: inRange ? rangeUtil : (currentTick < pos.tickLower ? 100 : 0),
            tokenBAlloc: inRange ? (100 - rangeUtil) : (currentTick < pos.tickLower ? 0 : 100),
            il: null, netVsHold: null, createdAt: null,
            lastUpdated: new Date().toISOString(), liquidity: pos.liquidity,
            health: null, urgency: null,
            dataQuality: {
              rangeConfirmed: true, priceConfirmed: currentTick !== 0, feesPartial: false,
              valueEstimated: true, ilUnavailable: true,
              overall: currentTick !== 0 ? 'partial' : 'poor',
              notes: ['On-chain data via public RPC', 'USD values need token prices', 'Fees need complex computation']
            },
            link: `https://app.uniswap.org/pool/${tokenId}`,
            explorerLink: `${CONFIG.NETWORKS[network]?.explorer}/address/${address}`
          });
        } catch (e) { console.warn(`Position ${tokenId} failed:`, e.message); }
      }
    } catch (e) {
      limitations.push({
        source: 'On-chain RPC', network,
        reason: e.message?.includes('aborted') ? 'Request timeout — RPC may be slow or rate-limiting' : e.message,
        impact: `Could not read positions on ${CONFIG.NETWORKS[network]?.name || network}. Try again or use a different network.`
      });
    }

    return { positions, limitations };
  }

  // URL validation — prevents XSS via javascript: URIs in <a href>
  function safeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    try {
      const u = new URL(url);
      if (!['http:', 'https:'].includes(u.protocol)) return '#';
      return url;
    } catch {
      return '#';
    }
  }

  // --- API Health Check ---
  let apiHealthCache = { results: {}, checkedAt: 0, ttlMs: 300000 }; // 5 min cache

  async function checkAllApiHealth() {
    const apis = [
      { name: 'defillama', url: CONFIG.API.DEFI_LLAMA_YIELDS, type: 'api' },
      { name: 'geckoterminal', url: `${CONFIG.API.GECKO_BASE}/search/pools?query=ETH`, type: 'api' },
    ];

    // Add RPC endpoints
    for (const [key, url] of Object.entries(CONFIG.API_RPC_URLS || CONFIG.RPC_URLS || {})) {
      apis.push({ name: `rpc-${key}`, url, type: 'rpc' });
    }

    const results = {};
    for (const api of apis) {
      results[api.name] = await checkApiHealth(api.url, 8000);
    }

    apiHealthCache = {
      results,
      checkedAt: Date.now(),
      ttlMs: 300000,
    };
    return results;
  }

  function getApiHealthStatus() {
    const now = Date.now();
    if (now - apiHealthCache.checkedAt > apiHealthCache.ttlMs || Object.keys(apiHealthCache.results).length === 0) {
      // Return stale or empty — caller can trigger refresh
      return { ...apiHealthCache, stale: true };
    }
    return { ...apiHealthCache, stale: false };
  }

export { fetchAllPools, searchPools, fetchWalletPositions, safeUrl, checkAllApiHealth, getApiHealthStatus, fetchVolatilityFromOHLCV };

// --- Real volatility from CoinGecko/GeckoTerminal OHLCV ---
async function fetchVolatilityFromOHLCV(network, poolAddress, timeframe = 'day') {
  try {
    // GeckoTerminal OHLCV endpoint
    const url = `${CONFIG.API.GECKO_BASE}/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}`;
    const data = await fetchWithRetry(url);
    const ohlcv = (data.data || {}).attributes || {};
    const ohlcvList = ohlcv.ohlcv_list || [];

    if (!ohlcvList || ohlcvList.length < 2) return null;

    // ohlcv_list entries: [timestamp, open, high, low, close, volume]
    const closePrices = ohlcvList.map(entry => parseFloat(entry[4])).filter(p => p > 0);

    if (closePrices.length < 2) return null;

    // Import volatility calculation from scoring module
    const { calculateVolatilityFromOHLCV } = await import('./scoring.js');
    return calculateVolatilityFromOHLCV(closePrices);
  } catch (e) {
    console.warn(`[CLP] OHLCV volatility fetch failed for ${network}/${poolAddress}:`, e.message);
    return null;
  }
}
