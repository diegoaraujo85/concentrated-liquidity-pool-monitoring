// Main Application Entry Point
const App = (() => {
  let refreshTimerId = null;

  // Initialize
  async function init() {
    console.log('[CLP Monitor] Initializing...');

    // Load saved preferences
    State.loadFromLocalStorage();

    const state = State.get();

    // Apply theme
    document.documentElement.setAttribute('data-theme', state.theme);

    // Set up event listeners
    setupNavigation();
    setupThemeToggle();
    setupRefreshControls();
    setupColumnModal();
    setupStopPropagationLinks();

    // Subscribe to state changes for re-rendering
    State.subscribe('*', debounce((s, path) => {
      if (path.startsWith('monitor.filteredPools') || path.startsWith('monitor.loading')) {
        if (s.page === 'monitor') UI.renderPoolMonitor();
      }
      if (path.startsWith('tracker') && s.page === 'tracker') {
        UI.renderWalletTracker();
      }
      State.saveToLocalStorage();
    }, 100));

    // Render initial page
    renderCurrentPage();

    // Start data fetch
    await fetchPoolData();

    // Set up auto-refresh
    setupAutoRefresh();
  }

  // Navigation
  function setupNavigation() {
    const nav = document.getElementById('header-nav');
    if (!nav) return;

    nav.addEventListener('click', (e) => {
      const tab = e.target.closest('.nav-tab');
      if (!tab) return;

      const page = tab.dataset.page;
      if (!page || page === State.get().page) return;

      // Update active tab
      nav.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      State.set('page', page);
      renderCurrentPage();
    });
  }

  function renderCurrentPage() {
    const state = State.get();
    const content = document.getElementById('app-content');
    if (!content) return;

    // Remove initial loader
    const loader = document.getElementById('initial-loader');
    if (loader) loader.remove();

    if (state.page === 'monitor') {
      UI.renderPoolMonitorPage(content);
      if (state.monitor.pools.length > 0) {
        UI.renderPoolMonitor();
      }
    } else {
      UI.renderWalletTrackerPage(content);
      if (state.tracker.scoredPositions.length > 0) {
        UI.renderWalletTracker();
      }
    }
  }

  // Theme toggle
  function setupThemeToggle() {
    const btn = document.getElementById('btn-theme');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const current = State.get().theme;
      const next = current === 'dark' ? 'light' : 'dark';
      State.set('theme', next);
      document.documentElement.setAttribute('data-theme', next);
      State.saveToLocalStorage();
    });
  }

  // Refresh controls
  function setupRefreshControls() {
    const select = document.getElementById('refresh-interval');
    const btn = document.getElementById('btn-refresh');

    if (select) {
      select.value = State.get().monitor.refreshInterval;
      select.addEventListener('change', () => {
        const val = select.value;
        State.set('monitor.refreshInterval', val);
        State.set('tracker.refreshInterval', val);
        setupAutoRefresh();
        State.saveToLocalStorage();
      });
    }

    if (btn) {
      btn.addEventListener('click', () => {
        btn.classList.add('spinning');
        fetchPoolData().finally(() => {
          setTimeout(() => btn.classList.remove('spinning'), 500);
        });
      });
    }
  }

  function setupAutoRefresh() {
    if (refreshTimerId) {
      clearInterval(refreshTimerId);
      refreshTimerId = null;
    }

    const interval = State.get().monitor.refreshInterval;
    const ms = CONFIG.REFRESH_INTERVALS[interval];

    if (ms) {
      refreshTimerId = setInterval(() => fetchPoolData(), ms);
      updateStatus('live', `Auto-refresh: ${interval}`);
    } else {
      updateStatus('idle', 'Manual refresh');
    }
  }

  // Column configuration modal
  function setupColumnModal() {
    const btnOpen = document.getElementById('btn-columns');
    const btnClose = document.getElementById('modal-close');
    const btnCancel = document.getElementById('modal-cancel');
    const btnApply = document.getElementById('modal-apply');
    const modal = document.getElementById('column-modal');

    if (btnOpen) btnOpen.addEventListener('click', () => openColumnModal());
    if (btnClose) btnClose.addEventListener('click', () => closeColumnModal());
    if (btnCancel) btnCancel.addEventListener('click', () => closeColumnModal());
    if (btnApply) btnApply.addEventListener('click', () => applyColumnConfig());
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) closeColumnModal();
    });
  }

  function setupStopPropagationLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-stop-propagation]');
      if (link) e.stopPropagation();
    });
  }

  function openColumnModal() {
    const state = State.get();
    const modal = document.getElementById('column-modal');
    const presetsEl = document.getElementById('modal-presets');
    const columnsEl = document.getElementById('modal-columns');
    if (!modal || !presetsEl || !columnsEl) return;

    const isMonitor = state.page === 'monitor';
    const columnDefs = isMonitor ? CONFIG.POOL_COLUMNS : CONFIG.POSITION_COLUMNS;
    const currentVisible = isMonitor ? state.monitor.visibleColumns : state.tracker.visibleColumns;
    const currentPreset = isMonitor ? state.monitor.viewPreset : state.tracker.viewPreset;

    // Render presets
    presetsEl.innerHTML = `
      <div class="preset-buttons">
        <label class="preset-label">View Presets:</label>
        ${Object.entries(CONFIG.VIEW_PRESETS).map(([key, preset]) => `
          <button class="btn btn-sm ${currentPreset === key ? 'btn-primary' : 'btn-secondary'}" data-preset="${key}">
            ${preset.label}
          </button>
        `).join('')}
      </div>
    `;

    presetsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      const preset = btn.dataset.preset;
      const presetConfig = CONFIG.VIEW_PRESETS[preset];
      const cols = isMonitor ? presetConfig.poolColumns : presetConfig.positionColumns;
      if (cols) {
        columnsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = cols.includes(cb.value);
        });
      }
      presetsEl.querySelectorAll('.btn').forEach(b => b.classList.remove('btn-primary'));
      presetsEl.querySelectorAll('.btn').forEach(b => b.classList.add('btn-secondary'));
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    });

    // Render columns grouped
    const groups = {};
    for (const [key, def] of Object.entries(columnDefs)) {
      const group = def.group || 'other';
      if (!groups[group]) groups[group] = [];
      groups[group].push({ key, ...def });
    }

    columnsEl.innerHTML = Object.entries(groups).map(([group, cols]) => `
      <div class="column-group">
        <div class="column-group-title">${group.charAt(0).toUpperCase() + group.slice(1)}</div>
        ${cols.map(col => `
          <label class="column-check">
            <input type="checkbox" value="${col.key}" ${currentVisible.includes(col.key) ? 'checked' : ''}>
            <span>${col.label}</span>
          </label>
        `).join('')}
      </div>
    `).join('');

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  }

  function closeColumnModal() {
    const modal = document.getElementById('column-modal');
    if (modal) {
      modal.classList.remove('open');
      setTimeout(() => { modal.style.display = 'none'; }, 200);
    }
  }

  function applyColumnConfig() {
    const columnsEl = document.getElementById('modal-columns');
    const presetsEl = document.getElementById('modal-presets');
    if (!columnsEl) return;

    const selected = Array.from(columnsEl.querySelectorAll('input:checked')).map(cb => cb.value);
    const activePreset = presetsEl?.querySelector('.btn-primary')?.dataset?.preset || 'custom';

    const state = State.get();
    if (state.page === 'monitor') {
      State.set('monitor.visibleColumns', selected);
      State.set('monitor.viewPreset', activePreset);
      UI.renderPoolMonitor();
    } else {
      State.set('tracker.visibleColumns', selected);
      State.set('tracker.viewPreset', activePreset);
      UI.renderWalletTracker();
    }

    State.saveToLocalStorage();
    closeColumnModal();
    showToast('Column configuration updated', 'success');
  }

  // Data fetching
  async function fetchPoolData() {
    const state = State.get();
    if (state.monitor.loading) return;

    State.set('monitor.loading', true);
    updateStatus('loading', 'Fetching pool data...');
    showProgress(true);

    try {
      let rawPools;

      // Use cache if valid
      if (State.isCacheValid()) {
        rawPools = State.getCache();
        updateStatus('live', `${rawPools.length} pools loaded from cache`);
        showToast(`Loaded ${rawPools.length} pools from cache`, 'info');
      } else {
        const result = await API.fetchAllPools((progress) => {
          State.set('progress', { ...progress, visible: true });
          updateProgress(progress.completed, progress.total, `${progress.protocol} on ${progress.network}`);
        });

        rawPools = result.pools;

        if (result.errors.length > 0) {
          console.warn('[CLP Monitor] Fetch errors:', result.errors);
          for (const err of result.errors) {
            showToast(`Failed: ${err.protocol} on ${err.network} — ${err.error}`, 'warning', 5000);
          }
        }

        State.set('monitor.errors', result.errors);

        // Save to cache
        State.setCache(rawPools);
      }

      // Score pools in chunks to avoid blocking the UI
      const profile = state.monitor.profile;
      const scored = await scorePoolsInChunks(rawPools, profile);

      State.set('monitor.pools', scored);
      State.set('monitor.lastUpdated', new Date().toISOString());

      // Reset pagination to first page on new data
      State.set('monitor.pagination.page', 1);

      // Apply filters
      State.applyPoolFilters();

      const poolCount = scored.length;
      const errorCount = state.monitor.errors.length;

      updateStatus('live', `${poolCount} pools loaded${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
      showToast(`Loaded ${poolCount} pools from ${Object.keys(CONFIG.PROTOCOLS).length} protocols`, 'success');

      // Render
      if (state.page === 'monitor') {
        UI.renderPoolMonitor();
      }

    } catch (e) {
      console.error('[CLP Monitor] Fatal fetch error:', e);
      updateStatus('error', 'Fetch failed');
      showToast(`Data fetch failed: ${e.message}`, 'error');
    } finally {
      State.set('monitor.loading', false);
      showProgress(false);
    }
  }

  // Score pools in chunks to avoid blocking the main thread on large datasets
  function scorePoolsInChunks(pools, profile, chunkSize = 200) {
    return new Promise((resolve) => {
      const scored = [];
      let i = 0;

      function processChunk() {
        const end = Math.min(i + chunkSize, pools.length);
        for (; i < end; i++) {
          scored.push(Scoring.scorePool(pools[i], pools, profile));
        }
        if (i < pools.length) {
          setTimeout(processChunk, 0); // yield to browser
        } else {
          resolve(scored);
        }
      }

      processChunk();
    });
  }

  // Wallet position fetching
  async function fetchWalletPositions(address, network) {
    if (!address) return;

    State.set('tracker.loading', true);
    updateStatus('loading', 'Fetching positions...');

    try {
      const result = await API.fetchWalletPositions(address, network);

      // Score positions
      const scored = Scoring.scoreAllPositions(result.positions);
      const summary = Scoring.walletSummary(scored);

      // Merge with existing positions (from other wallets)
      const existing = State.get().tracker.scoredPositions.filter(p =>
        !scored.some(s => s.id === p.id)
      );

      State.set('tracker.scoredPositions', [...existing, ...scored]);
      State.set('tracker.summary', Scoring.walletSummary([...existing, ...scored]));
      State.set('tracker.limitations', [
        ...State.get().tracker.limitations.filter(l => l.network !== network),
        ...result.limitations
      ]);
      State.set('tracker.lastUpdated', new Date().toISOString());

      if (result.positions.length > 0) {
        showToast(`Found ${result.positions.length} positions for ${address.slice(0, 8)}...`, 'success');
      } else {
        showToast(`No active LP positions found for ${address.slice(0, 8)}... on ${network}`, 'info');
      }

      if (result.limitations.length > 0) {
        for (const lim of result.limitations) {
          showToast(`${lim.source}: ${lim.reason}`, 'warning', 8000);
        }
      }

      updateStatus('live', `${State.get().tracker.scoredPositions.length} positions tracked`);

      if (State.get().page === 'tracker') {
        UI.renderWalletTracker();
      }

    } catch (e) {
      console.error('[CLP Monitor] Position fetch error:', e);
      showToast(`Failed to fetch positions: ${e.message}`, 'error');
      updateStatus('error', 'Position fetch failed');
    } finally {
      State.set('tracker.loading', false);
    }
  }

  // Pool search
  async function searchPools(query) {
    if (!query || query.length < 2) return;

    State.set('monitor.searching', true);
    State.set('monitor.searchQuery', query);

    try {
      const results = await API.searchPools(query);
      const scored = Scoring.scoreAllPools(results, State.get().monitor.profile);
      State.set('monitor.searchResults', scored);

      if (State.get().page === 'monitor') {
        UI.renderSearchResults(scored);
      }
    } catch (e) {
      showToast(`Search failed: ${e.message}`, 'error');
    } finally {
      State.set('monitor.searching', false);
    }
  }

  // Add custom pool to monitor
  function addCustomPool(pool) {
    const pools = State.get().monitor.pools;
    if (!pools.find(p => p.id === pool.id)) {
      State.update('monitor.pools', prev => [...prev, pool]);
      State.update('monitor.customPools', prev => [...prev, pool.id]);
      State.applyPoolFilters();
      showToast(`Added ${pool.pair} to monitor`, 'success');
      if (State.get().page === 'monitor') UI.renderPoolMonitor();
    }
  }

  // Add wallet to tracker
  function addWallet(address, network, label = '') {
    const wallets = State.get().tracker.wallets;
    if (wallets.find(w => w.address.toLowerCase() === address.toLowerCase() && w.network === network)) {
      showToast('Wallet already being tracked', 'info');
      return;
    }

    // Detect network from address if not specified
    if (!network) {
      if (address.length === 44 || address.length === 43) {
        network = 'solana';
      } else if (address.startsWith('0x') && address.length === 42) {
        network = 'ethereum'; // default EVM
      } else {
        showToast('Could not detect network. Please select manually.', 'warning');
        return;
      }
    }

    State.update('tracker.wallets', prev => [...prev, { address, network, label: label || `${address.slice(0, 6)}...${address.slice(-4)}` }]);
    State.saveToLocalStorage();

    fetchWalletPositions(address, network);
  }

  // Remove wallet
  function removeWallet(address, network) {
    State.update('tracker.wallets', prev => prev.filter(w => !(w.address === address && w.network === network)));
    State.update('tracker.scoredPositions', prev => prev.filter(p => true)); // positions don't directly track wallet, simplified
    State.saveToLocalStorage();
    if (State.get().page === 'tracker') UI.renderWalletTracker();
  }

  // UI helpers
  function updateStatus(status, text) {
    const dot = document.getElementById('status-dot');
    const textEl = document.getElementById('status-text');
    if (dot) {
      dot.className = 'status-dot';
      dot.classList.add(`status-${status}`);
    }
    if (textEl) textEl.textContent = text;
  }

  function showProgress(visible, pct) {
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.display = visible ? 'block' : 'none';
  }

  function updateProgress(completed, total, label) {
    const fill = document.getElementById('progress-fill');
    if (fill && total > 0) {
      fill.style.width = `${(completed / total) * 100}%`;
    }
  }

  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '\u2713',
      error: '\u2715',
      warning: '\u26A0',
      info: '\u2139'
    };

    // Icon is hardcoded (not user input)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || '\u2139';

    // Message is user/API input — MUST use textContent to prevent XSS
    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-message';
    msgSpan.textContent = message;

    // Close button: no inline onclick (CSP-safe), use event listener
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => toast.remove());

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    // Auto-remove
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  }

  // Update filters from UI
  function updateFilter(key, value) {
    State.set(`monitor.filters.${key}`, value);
    State.applyPoolFilters();
    if (State.get().page === 'monitor') UI.renderPoolMonitor();
    State.saveToLocalStorage();
  }

  function updateSort(column) {
    const state = State.get();
    const target = state.page === 'monitor' ? 'monitor' : 'tracker';
    const current = state[target].sortBy;
    const currentDir = state[target].sortDir;

    if (current === column) {
      State.set(`${target}.sortDir`, currentDir === 'desc' ? 'asc' : 'desc');
    } else {
      State.set(`${target}.sortBy`, column);
      State.set(`${target}.sortDir`, 'desc');
    }

    if (target === 'monitor') {
      State.applyPoolFilters();
      UI.renderPoolMonitor();
    } else {
      UI.renderWalletTracker();
    }
  }

  function setProfile(profile) {
    State.set('monitor.profile', profile);
    // Re-score all pools
    const pools = State.get().monitor.pools;
    if (pools.length > 0) {
      // Need to re-score from raw data
      const rescored = Scoring.scoreAllPools(pools, profile);
      State.set('monitor.pools', rescored);
      State.applyPoolFilters();
      if (State.get().page === 'monitor') UI.renderPoolMonitor();
    }
    State.saveToLocalStorage();
  }

  // Pagination
  function setPoolPage(page) {
    State.setPoolPage(page);
    if (State.get().page === 'monitor') UI.renderPoolMonitor();
  }

  function setPoolPerPage(perPage) {
    State.setPoolPerPage(perPage);
    if (State.get().page === 'monitor') UI.renderPoolMonitor();
  }

  // Utility
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // DOM ready
  document.addEventListener('DOMContentLoaded', init);

  // Public API
  return {
    fetchPoolData,
    fetchWalletPositions,
    searchPools,
    addCustomPool,
    addWallet,
    removeWallet,
    updateFilter,
    updateSort,
    setProfile,
    setPoolPage,
    setPoolPerPage,
    showToast,
    renderCurrentPage
  };
})();
