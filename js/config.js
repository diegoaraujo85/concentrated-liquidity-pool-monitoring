// Protocol and network configuration
const CONFIG = {
  // Supported networks with their display info
  NETWORKS: {
    ethereum: { id: 'eth', name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io', color: '#627EEA', geckoId: 'eth', llamaChain: 'Ethereum' },
    base: { id: 'base', name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org', color: '#0052FF', geckoId: 'base', llamaChain: 'Base' },
    arbitrum: { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io', color: '#28A0F0', geckoId: 'arbitrum', llamaChain: 'Arbitrum' },
    polygon: { id: 'polygon', name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com', color: '#8247E5', geckoId: 'polygon_pos', llamaChain: 'Polygon' },
    bsc: { id: 'bsc', name: 'BSC', symbol: 'BNB', explorer: 'https://bscscan.com', color: '#F0B90B', geckoId: 'bsc', llamaChain: 'BSC' },
    solana: { id: 'solana', name: 'Solana', symbol: 'SOL', explorer: 'https://solscan.io', color: '#9945FF', geckoId: 'solana', llamaChain: 'Solana' },
    optimism: { id: 'optimism', name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io', color: '#F0103B', geckoId: 'optimism', llamaChain: 'OP Mainnet' },
    avalanche: { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', explorer: 'https://snowtrace.io', color: '#E84142', geckoId: 'avalanche', llamaChain: 'Avalanche' },
    hyperevm: { id: 'hyperevm', name: 'HyperEVM', symbol: 'ETH', explorer: 'https://hyperevm.io', color: '#7C3AED', geckoId: 'hyperevm', llamaChain: 'Hyperliquid L1' },
    robinhood: { id: 'robinhood', name: 'Robinhood', symbol: 'ETH', explorer: 'https://explorer.robinhood.com', color: '#000000', geckoId: 'robinhood', llamaChain: 'Robinhood Chain' }
  },

  // Protocol definitions with network availability
  PROTOCOLS: {
    'uniswap-v3': { name: 'Uniswap V3', networks: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'optimism', 'avalanche', 'hyperevm', 'robinhood'], color: '#FF007A', llamaProject: 'uniswap-v3' },
    'uniswap-v4': { name: 'Uniswap V4', networks: ['ethereum', 'base', 'arbitrum'], color: '#00D4AA', llamaProject: 'uniswap-v4', note: 'V4 data limited — may appear under V3 indexers' },
    'orca': { name: 'Orca', networks: ['solana'], color: '#FFD15C', llamaProject: 'orca' },
    'raydium': { name: 'Raydium', networks: ['solana'], color: '#2BDEAC', llamaProject: 'raydium' },
    'morpho-blue': { name: 'Morpho Blue', networks: ['robinhood'], color: '#FF3E00', llamaProject: 'morpho-blue' }
  },

  // Priority assets for filtering
  PRIORITY_ASSETS: ['ETH', 'WETH', 'BTC', 'WBTC', 'SOL', 'WSOL', 'USDC', 'USDT', 'DAI', 'FRAX'],

  STABLECOINS: ['USDC', 'USDT', 'DAI', 'FRAX', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'LUSD', 'crvUSD', 'GHO', 'PYUSD', 'USDe', 'USDS'],

  // Fee tiers (basis points)
  FEE_TIERS: [1, 5, 30, 100],
  FEE_TIER_LABELS: { 1: '0.01%', 5: '0.05%', 30: '0.30%', 100: '1.00%' },

  // Refresh intervals in ms
  REFRESH_INTERVALS: {
    '15s': 15000,
    '30s': 30000,
    '60s': 60000,
    '5min': 300000,
    'manual': null
  },

  // Scoring weights
  SCORING: {
    CONSERVATIVE: { tvl: 0.20, volume: 0.10, volumeTvlRatio: 0.15, feeYield: 0.15, volatility: -0.15, age: 0.10, liquidityEffective: 0.10, rangeRisk: -0.05 },
    AGGRESSIVE: { tvl: 0.05, volume: 0.15, volumeTvlRatio: 0.20, feeYield: 0.25, volatility: 0.05, age: 0.0, liquidityEffective: 0.15, rangeRisk: 0.15 }
  },

  // Range presets
  RANGES: {
    CONSERVATIVE: { stablePct: 0.5, correlatedPct: 10, volatilePct: 30 },
    AGGRESSIVE: { stablePct: 0.1, correlatedPct: 5, volatilePct: 15 }
  },

  // API config
  API: {
    DEFI_LLAMA_YIELDS: 'https://yields.llama.fi/pools',
    GECKO_BASE: 'https://api.geckoterminal.com/api/v2',
    REQUEST_DELAY: 300,
    MAX_RETRIES: 2,
    TIMEOUT: 15000,
    RPC_TIMEOUT: 30000 // longer timeout for RPC calls
  },

  // Data source priority labels
  SOURCES: {
    defillama: { name: 'DeFi Llama', color: '#1a6aff', url: 'https://defillama.com' },
    coingecko: { name: 'CoinGecko', color: '#8dc647', url: 'https://www.coingecko.com' },
    geckoterminal: { name: 'GeckoTerminal', color: '#6fe08d', url: 'https://www.geckoterminal.com' },
    onchain: { name: 'On-chain RPC', color: '#a78bfa', url: null },
    estimated: { name: 'Estimated', color: '#94a3b8', url: null }
  },

  // Column definitions for Pool Monitor
  POOL_COLUMNS: {
    protocol: { label: 'Protocol', default: true, group: 'basic' },
    network: { label: 'Network', default: true, group: 'basic' },
    pair: { label: 'Pair', default: true, group: 'basic' },
    feeTier: { label: 'Fee Tier', default: true, group: 'basic' },
    price: { label: 'Price', default: false, group: 'market' },
    volume24h: { label: 'Volume 24h', default: true, group: 'market' },
    tvl: { label: 'TVL', default: true, group: 'market' },
    apr: { label: 'APR', default: true, group: 'yield' },
    apy: { label: 'APY', default: true, group: 'yield' },
    apyBase: { label: 'APY Base', default: false, group: 'yield' },
    apyReward: { label: 'APY Reward', default: false, group: 'yield' },
    volatility: { label: 'Volatility', default: true, group: 'risk' },
    correlation: { label: 'Correlation', default: true, group: 'risk' },
    age: { label: 'Age', default: false, group: 'meta' },
    volumeTvlRatio: { label: 'Vol/TVL', default: true, group: 'efficiency' },
    inRange: { label: 'In Range', default: false, group: 'range' },
    rangeExitProb: { label: 'Exit Prob.', default: false, group: 'range' },
    score: { label: 'Score', default: true, group: 'score' },
    risk: { label: 'Risk', default: true, group: 'risk' },
    source: { label: 'Source', default: true, group: 'meta' },
    dataQuality: { label: 'Data Quality', default: false, group: 'meta' },
    link: { label: 'Link', default: true, group: 'basic' }
  },

  // Column definitions for Wallet Tracker
  POSITION_COLUMNS: {
    protocol: { label: 'Protocol', default: true, group: 'basic' },
    network: { label: 'Network', default: true, group: 'basic' },
    pair: { label: 'Pool/Pair', default: true, group: 'basic' },
    positionId: { label: 'Position ID', default: false, group: 'basic' },
    valueInvested: { label: 'Invested', default: true, group: 'value' },
    valueCurrent: { label: 'Current', default: true, group: 'value' },
    pnl: { label: 'PnL %', default: true, group: 'value' },
    feesAccumulated: { label: 'Fees Earned', default: true, group: 'fees' },
    feesUncollected: { label: 'Uncollected', default: true, group: 'fees' },
    rangeMin: { label: 'Range Min', default: true, group: 'range' },
    rangeMax: { label: 'Range Max', default: true, group: 'range' },
    rangeWidth: { label: 'Range Width %', default: false, group: 'range' },
    currentPrice: { label: 'Current Price', default: true, group: 'range' },
    inRange: { label: 'Status', default: true, group: 'range' },
    distLower: { label: 'Dist. Lower', default: false, group: 'range' },
    distUpper: { label: 'Dist. Upper', default: false, group: 'range' },
    rangeUtil: { label: 'Range Util.', default: false, group: 'efficiency' },
    tokenAAlloc: { label: 'Token A %', default: false, group: 'allocation' },
    tokenBAlloc: { label: 'Token B %', default: false, group: 'allocation' },
    il: { label: 'IL Est.', default: true, group: 'risk' },
    netVsHold: { label: 'Net vs Hold', default: false, group: 'value' },
    created: { label: 'Created', default: false, group: 'meta' },
    lastUpdate: { label: 'Updated', default: true, group: 'meta' },
    health: { label: 'Health', default: true, group: 'score' },
    urgency: { label: 'Urgency', default: true, group: 'score' },
    link: { label: 'Link', default: true, group: 'basic' }
  },

  // View presets
  VIEW_PRESETS: {
    conservative: {
      label: 'Conservative',
      poolColumns: ['protocol', 'network', 'pair', 'feeTier', 'tvl', 'apy', 'volumeTvlRatio', 'volatility', 'correlation', 'risk', 'score', 'source', 'link'],
      positionColumns: ['protocol', 'network', 'pair', 'valueCurrent', 'pnl', 'feesAccumulated', 'inRange', 'il', 'health', 'urgency', 'link'],
      sortBy: 'score',
      sortDir: 'desc'
    },
    aggressive: {
      label: 'Aggressive',
      poolColumns: ['protocol', 'network', 'pair', 'feeTier', 'apr', 'apy', 'volume24h', 'volatility', 'volumeTvlRatio', 'score', 'risk', 'source', 'link'],
      positionColumns: ['protocol', 'network', 'pair', 'valueCurrent', 'pnl', 'feesUncollected', 'inRange', 'distLower', 'distUpper', 'urgency', 'link'],
      sortBy: 'apy',
      sortDir: 'desc'
    },
    custom: {
      label: 'Custom',
      poolColumns: null,
      positionColumns: null,
      sortBy: 'score',
      sortDir: 'desc'
    }
  }
};
