// State Management Module
const State = (() => {
  // Application state
  let state = {
    // Current page
    page: 'monitor', // 'monitor' | 'tracker'

    // Theme
    theme: 'dark', // 'dark' | 'light'

    // Pool Monitor state
    monitor: {
      pools: [],
      filteredPools: [],
      errors: [],
      loading: false,
      lastUpdated: null,
      refreshInterval: '60s',
      refreshTimer: null,
      profile: 'conservative', // 'conservative' | 'aggressive'
      viewPreset: 'conservative', // 'conservative' | 'aggressive' | 'custom'
      visibleColumns: [...(CONFIG.VIEW_PRESETS.conservative.poolColumns || Object.keys(CONFIG.POOL_COLUMNS).filter(k => CONFIG.POOL_COLUMNS[k].default))],

      // Sort
      sortBy: 'score',
      sortDir: 'desc',

      // Filters
      filters: {
        networks: [], // empty = all
        protocols: [],
        assets: [],
        pairType: '', // '' | 'volatile' | 'correlated' | 'stable'
        rangeProfile: '', // '' | 'conservative' | 'aggressive'
        tvlMin: null,
        tvlMax: null,
        volume24hMin: null,
        volume24hMax: null,
        volumeTvlRatioMin: null,
        ageMin: null,
        ageMax: null,
        feeTier: null,
        volatilityMin: null,
        volatilityMax: null,
        liquidityEffectiveMin: null,
        hideIncompleteData: false
      },

      // Custom pools added by user
      customPools: [],

      // Search
      searchQuery: '',
      searchResults: [],
      searching: false
    },

    // Wallet Tracker state
    tracker: {
      wallets: [], // { address, network, label }
      positions: [],
      scoredPositions: [],
      summary: null,
      limitations: [],
      loading: false,
      lastUpdated: null,
      refreshInterval: '60s',
      refreshTimer: null,
      viewPreset: 'conservative',
      visibleColumns: [...(CONFIG.VIEW_PRESETS.conservative.positionColumns || Object.keys(CONFIG.POSITION_COLUMNS).filter(k => CONFIG.POSITION_COLUMNS[k].default))],

      // Sort
      sortBy: 'urgency',
      sortDir: 'desc',

      // Filters
      filters: {
        networks: [],
        protocols: [],
        status: '', // '' | 'in_range' | 'out_of_range'
        assets: [],
        pnlMin: null,
        riskLevel: '' // '' | 'low' | 'medium' | 'high' | 'critical'
      }
    },

    // Column configuration modal
    columnConfig: {
      open: false,
      target: 'monitor' // 'monitor' | 'tracker'
    },

    // Progress tracking
    progress: {
      visible: false,
      phase: '',
      protocol: '',
      network: '',
      completed: 0,
      total: 0
    }
  };

  // Listeners
  const listeners = new Map();
  let listenerIdCounter = 0;

  function get() {
    return state;
  }

  function set(path, value) {
    const keys = path.split('.');
    let obj = state;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    notify(path);
  }

  function update(path, updater) {
    const keys = path.split('.');
    let obj = state;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    const key = keys[keys.length - 1];
    obj[key] = updater(obj[key]);
    notify(path);
  }

  function subscribe(pathPrefix, callback) {
    const id = ++listenerIdCounter;
    listeners.set(id, { pathPrefix, callback });
    return () => listeners.delete(id);
  }

  function notify(changedPath) {
    for (const [id, { pathPrefix, callback }] of listeners) {
      if (changedPath.startsWith(pathPrefix) || pathPrefix.startsWith(changedPath) || pathPrefix === '*') {
        try { callback(state, changedPath); } catch (e) { console.error('State listener error:', e); }
      }
    }
  }

  // Filter pools based on current filters
  function applyPoolFilters() {
    const { pools, filters, sortBy, sortDir } = state.monitor;

    let filtered = [...pools];

    // Network filter
    if (filters.networks.length > 0) {
      filtered = filtered.filter(p => filters.networks.includes(p.network));
    }

    // Protocol filter
    if (filters.protocols.length > 0) {
      filtered = filtered.filter(p => filters.protocols.includes(p.protocol));
    }

    // Asset filter
    if (filters.assets.length > 0) {
      filtered = filtered.filter(p =>
        filters.assets.some(a =>
          p.baseToken?.toUpperCase().includes(a.toUpperCase()) ||
          p.quoteToken?.toUpperCase().includes(a.toUpperCase())
        )
      );
    }

    // Pair type
    if (filters.pairType) {
      filtered = filtered.filter(p => p.pairType === filters.pairType);
    }

    // TVL range
    if (filters.tvlMin !== null) filtered = filtered.filter(p => p.tvl >= filters.tvlMin);
    if (filters.tvlMax !== null) filtered = filtered.filter(p => p.tvl <= filters.tvlMax);

    // Volume range
    if (filters.volume24hMin !== null) filtered = filtered.filter(p => p.volume24h >= filters.volume24hMin);
    if (filters.volume24hMax !== null) filtered = filtered.filter(p => p.volume24h <= filters.volume24hMax);

    // Volume/TVL ratio
    if (filters.volumeTvlRatioMin !== null) filtered = filtered.filter(p => p.volumeTvlRatio >= filters.volumeTvlRatioMin);

    // Age
    if (filters.ageMin !== null) filtered = filtered.filter(p => p.ageDays !== null && p.ageDays >= filters.ageMin);
    if (filters.ageMax !== null) filtered = filtered.filter(p => p.ageDays !== null && p.ageDays <= filters.ageMax);

    // Fee tier
    if (filters.feeTier !== null) filtered = filtered.filter(p => p.feeTier === filters.feeTier);

    // Volatility
    if (filters.volatilityMin !== null) filtered = filtered.filter(p => p.volatility >= filters.volatilityMin);
    if (filters.volatilityMax !== null) filtered = filtered.filter(p => p.volatility <= filters.volatilityMax);

    // Effective liquidity
    if (filters.liquidityEffectiveMin !== null) filtered = filtered.filter(p => (p.liquidityEffective || 0) >= filters.liquidityEffectiveMin);

    // Hide incomplete data
    if (filters.hideIncompleteData) {
      filtered = filtered.filter(p => p.dataQuality.overall !== 'poor');
    }

    // Column-level inline filters
    if (filters._colFeeTier) {
      filtered = filtered.filter(p => p.feeTierLabel === filters._colFeeTier);
    }
    if (filters._colRisk) {
      filtered = filtered.filter(p => p.risk === filters._colRisk);
    }
    if (filters._colSource) {
      filtered = filtered.filter(p => p.source === filters._colSource);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle null values
      if (aVal === null || aVal === undefined) aVal = sortDir === 'desc' ? -Infinity : Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDir === 'desc' ? -Infinity : Infinity;

      // String comparison
      if (typeof aVal === 'string') {
        return sortDir === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }

      // Risk level comparison
      if (sortBy === 'risk') {
        const riskOrder = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
        aVal = riskOrder[aVal] || 3;
        bVal = riskOrder[bVal] || 3;
      }

      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    state.monitor.filteredPools = filtered;
    notify('monitor.filteredPools');
  }

  // Filter positions
  function applyPositionFilters() {
    const { scoredPositions, filters, sortBy, sortDir } = state.tracker;

    let filtered = [...scoredPositions];

    if (filters.networks.length > 0) {
      filtered = filtered.filter(p => filters.networks.includes(p.network));
    }

    if (filters.protocols.length > 0) {
      filtered = filtered.filter(p => filters.protocols.includes(p.protocol));
    }

    if (filters.status === 'in_range') filtered = filtered.filter(p => p.inRange);
    if (filters.status === 'out_of_range') filtered = filtered.filter(p => !p.inRange);

    if (filters.assets.length > 0) {
      filtered = filtered.filter(p =>
        filters.assets.some(a =>
          p.baseToken?.toUpperCase().includes(a.toUpperCase()) ||
          p.quoteToken?.toUpperCase().includes(a.toUpperCase())
        )
      );
    }

    // Sort
    const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'urgency') {
        aVal = urgencyOrder[aVal] || 0;
        bVal = urgencyOrder[bVal] || 0;
      }

      if (aVal === null || aVal === undefined) aVal = sortDir === 'desc' ? -Infinity : Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDir === 'desc' ? -Infinity : Infinity;

      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    notify('tracker.positions');
    return filtered;
  }

  // Persistence
  function saveToLocalStorage() {
    try {
      const saved = {
        theme: state.theme,
        monitor: {
          refreshInterval: state.monitor.refreshInterval,
          profile: state.monitor.profile,
          viewPreset: state.monitor.viewPreset,
          visibleColumns: state.monitor.visibleColumns,
          filters: state.monitor.filters
        },
        tracker: {
          wallets: state.tracker.wallets,
          refreshInterval: state.tracker.refreshInterval,
          viewPreset: state.tracker.viewPreset,
          visibleColumns: state.tracker.visibleColumns,
          filters: state.tracker.filters
        }
      };
      localStorage.setItem('clp_monitor_state', JSON.stringify(saved));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  function loadFromLocalStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem('clp_monitor_state') || '{}');
      if (saved.theme) state.theme = saved.theme;
      if (saved.monitor) {
        Object.assign(state.monitor, {
          refreshInterval: saved.monitor.refreshInterval || '60s',
          profile: saved.monitor.profile || 'conservative',
          viewPreset: saved.monitor.viewPreset || 'conservative',
          visibleColumns: saved.monitor.visibleColumns || state.monitor.visibleColumns,
          filters: { ...state.monitor.filters, ...(saved.monitor.filters || {}) }
        });
      }
      if (saved.tracker) {
        Object.assign(state.tracker, {
          wallets: saved.tracker.wallets || [],
          refreshInterval: saved.tracker.refreshInterval || '60s',
          viewPreset: saved.tracker.viewPreset || 'conservative',
          visibleColumns: saved.tracker.visibleColumns || state.tracker.visibleColumns,
          filters: { ...state.tracker.filters, ...(saved.tracker.filters || {}) }
        });
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  }

  return {
    get,
    set,
    update,
    subscribe,
    notify,
    applyPoolFilters,
    applyPositionFilters,
    saveToLocalStorage,
    loadFromLocalStorage
  };
})();
