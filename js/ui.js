// UI Rendering Module
const UI = (() => {

  // === UTILITY FORMATTERS ===

  function fmtUSD(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return '$' + (val / 1e3).toFixed(1) + 'K';
    return '$' + val.toFixed(2);
  }

  function fmtNum(val, dec = 2) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (val >= 1e9) return (val / 1e9).toFixed(dec) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(dec) + 'M';
    if (val >= 1e3) return (val / 1e3).toFixed(dec) + 'K';
    return val.toFixed(dec);
  }

  function fmtPct(val, dec = 1) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return val.toFixed(dec) + '%';
  }

  function fmtPrice(val) {
    if (val === null || val === undefined || isNaN(val) || val === 0) return '—';
    if (val >= 1000) return '$' + val.toFixed(2);
    if (val >= 1) return '$' + val.toFixed(4);
    if (val >= 0.01) return '$' + val.toFixed(6);
    return '$' + val.toExponential(3);
  }

  function fmtAge(days) {
    if (days === null || days === undefined) return '—';
    if (days >= 365) return Math.floor(days / 365) + 'y ' + (days % 365) + 'd';
    return days + 'd';
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // === BADGE RENDERERS ===

  function riskBadge(risk) {
    const labels = { very_low: 'Very Low', low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High' };
    const classes = { very_low: 'badge-success', low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', very_high: 'badge-danger' };
    return `<span class="badge ${classes[risk] || 'badge-neutral'}">${labels[risk] || risk || '—'}</span>`;
  }

  function statusBadge(inRange) {
    if (inRange === null || inRange === undefined) return '<span class="badge badge-neutral">N/A</span>';
    return inRange
      ? '<span class="badge badge-success">In Range</span>'
      : '<span class="badge badge-danger badge-pulse">Out of Range</span>';
  }

  function qualityBadge(dq) {
    if (!dq) return '<span class="badge badge-neutral">—</span>';
    const cls = { good: 'badge-success', partial: 'badge-warning', poor: 'badge-danger' };
    const icons = { good: '●', partial: '◐', poor: '○' };
    return `<span class="badge ${cls[dq.overall] || 'badge-neutral'}" title="${dq.score}/${dq.total} metrics confirmed">${icons[dq.overall] || '?'} ${dq.overall}</span>`;
  }

  function healthBadge(health, label) {
    if (health === null || health === undefined) return '<span class="badge badge-neutral">—</span>';
    const cls = health >= 80 ? 'badge-success' : health >= 50 ? 'badge-warning' : 'badge-danger';
    return `<span class="badge ${cls}">${health}%</span>`;
  }

  function urgencyBadge(urgency) {
    const cls = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger badge-pulse' };
    const labels = { low: 'OK', medium: 'Monitor', high: 'Attention', critical: 'Urgent' };
    return `<span class="badge ${cls[urgency] || 'badge-neutral'}">${labels[urgency] || '—'}</span>`;
  }

  function sourceBadge(source) {
    const src = CONFIG.SOURCES[source];
    if (!src) return `<span class="badge badge-neutral">${source || '—'}</span>`;
    return `<span class="badge" style="background:${src.color}20;color:${src.color}">${src.name}</span>`;
  }

  function networkChip(network) {
    const net = CONFIG.NETWORKS[network];
    if (!net) return `<span class="chip">${network}</span>`;
    return `<span class="chip chip-network" style="--chip-color: ${net.color}">${net.name}</span>`;
  }

  function protocolChip(proto) {
    const p = CONFIG.PROTOCOLS[proto];
    if (!p) return `<span class="chip">${proto}</span>`;
    return `<span class="chip chip-protocol" style="--chip-color: ${p.color}">${p.name}</span>`;
  }

  function scoreMiniBar(score) {
    if (score === null || score === undefined) return '<span class="mono-data">—</span>';
    const pct = Math.max(0, Math.min(100, score));
    const color = pct >= 70 ? 'var(--accent-green)' : pct >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    return `<div class="score-mini" title="Score: ${score}">
      <div class="score-mini-bar" style="width:${pct}%;background:${color}"></div>
      <span class="score-mini-val mono-data">${score.toFixed(1)}</span>
    </div>`;
  }

  // === POOL MONITOR PAGE ===

  function renderPoolMonitorPage(container) {
    container.innerHTML = `
      <div class="page-monitor">
        <div class="page-topbar">
          <div class="topbar-left">
            <h1 class="page-title">Pool Monitor</h1>
            <span class="page-subtitle" id="pool-count-label">Loading pools...</span>
          </div>
          <div class="topbar-right">
            <div class="profile-toggle" id="profile-toggle">
              <button class="profile-btn ${State.get().monitor.profile === 'conservative' ? 'active' : ''}" data-profile="conservative">Conservative</button>
              <button class="profile-btn ${State.get().monitor.profile === 'aggressive' ? 'active' : ''}" data-profile="aggressive">Aggressive</button>
            </div>
            <div class="search-wrapper">
              <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85-.017.016zm-5.442.656a5 5 0 110-10 5 5 0 010 10z"/></svg>
              <input type="text" id="pool-search" class="input-search" placeholder="Search tokens, pairs, addresses...">
              <div class="search-results-dropdown" id="search-dropdown" style="display:none"></div>
            </div>
          </div>
        </div>
        ${renderFilterBar()}
        <div class="summary-cards" id="pool-summary-cards"></div>
        <div class="table-wrapper" id="pool-table-wrapper">
          ${renderSkeletonTable(8)}
        </div>
      </div>
    `;

    // Wire up profile toggle
    const profileToggle = document.getElementById('profile-toggle');
    if (profileToggle) {
      profileToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.profile-btn');
        if (!btn) return;
        profileToggle.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        App.setProfile(btn.dataset.profile);
      });
    }

    // Wire up search
    const searchInput = document.getElementById('pool-search');
    if (searchInput) {
      let searchTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = searchInput.value.trim();
        if (q.length >= 2) {
          searchTimer = setTimeout(() => App.searchPools(q), 500);
        } else {
          const dd = document.getElementById('search-dropdown');
          if (dd) dd.style.display = 'none';
        }
      });
    }

    // Wire up filters
    wireFilterEvents();
  }

  function renderFilterBar() {
    const state = State.get();
    const f = state.monitor.filters;

    return `
    <div class="filter-bar" id="filter-bar">
      <div class="filter-bar-toggle" id="filter-toggle">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h14L9 9v5l-2-1V9L1 2z"/></svg>
        Filters
        <span class="filter-active-count" id="filter-count" style="display:none">0</span>
        <button class="btn-text btn-xs" id="filter-clear" style="display:none">Clear all</button>
      </div>
      <div class="filter-bar-body" id="filter-body" style="display:none">
        <div class="filter-grid">
          <div class="filter-group">
            <label class="filter-label">Network</label>
            <div class="filter-chips" id="filter-networks">
              ${Object.entries(CONFIG.NETWORKS).map(([key, net]) => `
                <label class="chip-check"><input type="checkbox" value="${key}" ${f.networks.includes(key) ? 'checked' : ''}><span class="chip chip-network" style="--chip-color: ${net.color}">${net.name}</span></label>
              `).join('')}
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Protocol</label>
            <div class="filter-chips" id="filter-protocols">
              ${Object.entries(CONFIG.PROTOCOLS).map(([key, p]) => `
                <label class="chip-check"><input type="checkbox" value="${key}" ${f.protocols.includes(key) ? 'checked' : ''}><span class="chip chip-protocol" style="--chip-color: ${p.color}">${p.name}<span class="chip-note">${p.networks.map(n => CONFIG.NETWORKS[n]?.name).join(', ')}</span></span></label>
              `).join('')}
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Asset</label>
            <div class="filter-chips" id="filter-assets">
              ${['ETH', 'BTC', 'SOL', 'USDC', 'USDT'].map(a => `
                <label class="chip-check"><input type="checkbox" value="${a}" ${f.assets.includes(a) ? 'checked' : ''}><span class="chip">${a}</span></label>
              `).join('')}
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Pair Type</label>
            <select id="filter-pairType" class="select-sm">
              <option value="">All</option>
              <option value="volatile" ${f.pairType === 'volatile' ? 'selected' : ''}>Volatile</option>
              <option value="correlated" ${f.pairType === 'correlated' ? 'selected' : ''}>Correlated</option>
              <option value="stable" ${f.pairType === 'stable' ? 'selected' : ''}>Stable</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">TVL Range</label>
            <div class="filter-range">
              <input type="number" id="filter-tvlMin" class="input-sm" placeholder="Min" value="${f.tvlMin || ''}">
              <span class="filter-range-sep">–</span>
              <input type="number" id="filter-tvlMax" class="input-sm" placeholder="Max" value="${f.tvlMax || ''}">
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Volume 24h</label>
            <div class="filter-range">
              <input type="number" id="filter-volume24hMin" class="input-sm" placeholder="Min" value="${f.volume24hMin || ''}">
              <span class="filter-range-sep">–</span>
              <input type="number" id="filter-volume24hMax" class="input-sm" placeholder="Max" value="${f.volume24hMax || ''}">
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Vol/TVL Min</label>
            <input type="number" id="filter-volumeTvlRatioMin" class="input-sm" placeholder="e.g. 0.1" step="0.01" value="${f.volumeTvlRatioMin || ''}">
          </div>
          <div class="filter-group">
            <label class="filter-label">Pool Age (days)</label>
            <div class="filter-range">
              <input type="number" id="filter-ageMin" class="input-sm" placeholder="Min" value="${f.ageMin || ''}">
              <span class="filter-range-sep">–</span>
              <input type="number" id="filter-ageMax" class="input-sm" placeholder="Max" value="${f.ageMax || ''}">
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Volatility (%)</label>
            <div class="filter-range">
              <input type="number" id="filter-volatilityMin" class="input-sm" placeholder="Min" step="0.1" value="${f.volatilityMin || ''}">
              <span class="filter-range-sep">–</span>
              <input type="number" id="filter-volatilityMax" class="input-sm" placeholder="Max" step="0.1" value="${f.volatilityMax || ''}">
            </div>
          </div>
          <div class="filter-group">
            <label class="chip-check">
              <input type="checkbox" id="filter-hideIncomplete" ${f.hideIncompleteData ? 'checked' : ''}>
              <span class="chip">Hide incomplete data</span>
            </label>
          </div>
        </div>
      </div>
    </div>`;
  }

  function wireFilterEvents() {
    // Toggle filter bar
    const toggle = document.getElementById('filter-toggle');
    const body = document.getElementById('filter-body');
    if (toggle && body) {
      toggle.addEventListener('click', (e) => {
        if (e.target.closest('.btn-text')) return;
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Clear filters
    const clearBtn = document.getElementById('filter-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const defaults = {
          networks: [], protocols: [], assets: [], pairType: '',
          tvlMin: null, tvlMax: null, volume24hMin: null, volume24hMax: null,
          volumeTvlRatioMin: null, ageMin: null, ageMax: null, feeTier: null,
          volatilityMin: null, volatilityMax: null, liquidityEffectiveMin: null,
          hideIncompleteData: false
        };
        State.set('monitor.filters', defaults);
        State.applyPoolFilters();
        renderPoolMonitorPage(document.getElementById('app-content'));
        renderPoolMonitor();
      });
    }

    // Chip checkboxes (networks, protocols, assets)
    for (const [filterId, stateKey] of [['filter-networks', 'networks'], ['filter-protocols', 'protocols'], ['filter-assets', 'assets']]) {
      const el = document.getElementById(filterId);
      if (el) {
        el.addEventListener('change', () => {
          const checked = Array.from(el.querySelectorAll('input:checked')).map(i => i.value);
          App.updateFilter(stateKey, checked);
          updateFilterCount();
        });
      }
    }

    // Selects
    const pairType = document.getElementById('filter-pairType');
    if (pairType) pairType.addEventListener('change', () => { App.updateFilter('pairType', pairType.value || ''); updateFilterCount(); });

    // Number inputs
    const numFilters = ['tvlMin', 'tvlMax', 'volume24hMin', 'volume24hMax', 'volumeTvlRatioMin', 'ageMin', 'ageMax', 'volatilityMin', 'volatilityMax'];
    for (const key of numFilters) {
      const el = document.getElementById(`filter-${key}`);
      if (el) {
        el.addEventListener('change', () => {
          const val = el.value ? parseFloat(el.value) : null;
          App.updateFilter(key, val);
          updateFilterCount();
        });
      }
    }

    // Hide incomplete
    const hideInc = document.getElementById('filter-hideIncomplete');
    if (hideInc) hideInc.addEventListener('change', () => { App.updateFilter('hideIncompleteData', hideInc.checked); updateFilterCount(); });
  }

  function updateFilterCount() {
    const f = State.get().monitor.filters;
    let count = 0;
    if (f.networks.length) count++;
    if (f.protocols.length) count++;
    if (f.assets.length) count++;
    if (f.pairType) count++;
    if (f.tvlMin !== null) count++;
    if (f.tvlMax !== null) count++;
    if (f.volume24hMin !== null) count++;
    if (f.volume24hMax !== null) count++;
    if (f.volumeTvlRatioMin !== null) count++;
    if (f.ageMin !== null) count++;
    if (f.ageMax !== null) count++;
    if (f.volatilityMin !== null) count++;
    if (f.volatilityMax !== null) count++;
    if (f.hideIncompleteData) count++;

    const badge = document.getElementById('filter-count');
    const clearBtn = document.getElementById('filter-clear');
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'inline-flex' : 'none'; }
    if (clearBtn) clearBtn.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // === POOL TABLE RENDERING ===

  function renderPoolMonitor() {
    const state = State.get();
    const pools = State.getPagedPools();
    const allFiltered = state.monitor.filteredPools;
    const cols = state.monitor.visibleColumns;
    const sortBy = state.monitor.sortBy;
    const sortDir = state.monitor.sortDir;
    const pagination = state.monitor.pagination;
    const totalPages = State.getTotalPages();

    // Update count label
    const total = state.monitor.pools.length;
    const filteredCount = allFiltered.length;
    const label = document.getElementById('pool-count-label');
    if (label) {
      const start = (pagination.page - 1) * pagination.perPage + 1;
      const end = Math.min(pagination.page * pagination.perPage, filteredCount);
      const pageInfo = filteredCount > 0 ? ` (showing ${start}-${end})` : '';
      label.textContent = `${filteredCount} of ${total} pools${pageInfo}${state.monitor.errors.length > 0 ? ` · ${state.monitor.errors.length} sources failed` : ''}`;
    }

    // Summary cards
    renderPoolSummaryCards(pools);

    // Table
    const wrapper = document.getElementById('pool-table-wrapper');
    if (!wrapper) return;

    if (state.monitor.loading && pools.length === 0) {
      wrapper.innerHTML = renderSkeletonTable(8);
      return;
    }

    if (pools.length === 0 && !state.monitor.loading) {
      const hasActiveFilters = State.get().monitor.filters.networks.length > 0
        || State.get().monitor.filters.protocols.length > 0
        || State.get().monitor.filters.assets.length > 0
        || State.get().monitor.filters.pairType !== ''
        || State.get().monitor.filters.tvlMin !== null
        || State.get().monitor.filters.tvlMax !== null
        || State.get().monitor.filters.volume24hMin !== null
        || State.get().monitor.filters.volume24hMax !== null
        || State.get().monitor.filters.volumeTvlRatioMin !== null
        || State.get().monitor.filters.ageMin !== null
        || State.get().monitor.filters.ageMax !== null
        || State.get().monitor.filters.volatilityMin !== null
        || State.get().monitor.filters.volatilityMax !== null
        || State.get().monitor.filters.hideIncompleteData;
      
      let html = renderEmptyState(
        'No pools found',
        hasActiveFilters 
          ? 'No pools match your current filters. Try adjusting or clearing them.'
          : 'Try adjusting your filters or wait for data to load.',
        'Refresh Data',
        () => App.fetchPoolData()
      );
      
      // Add Clear Filters button if there are active filters
      if (hasActiveFilters) {
        html = html.replace('</div>', `
          <button class="btn btn-secondary empty-action" id="empty-clear-filters-btn" style="margin-top: 8px;">Clear Filters</button>
        </div>`);
      }
      
      wrapper.innerHTML = html;
      
      // Wire up Clear Filters button
      const clearBtn = document.getElementById('empty-clear-filters-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          const defaults = {
            networks: [], protocols: [], assets: [], pairType: '',
            tvlMin: null, tvlMax: null, volume24hMin: null, volume24hMax: null,
            volumeTvlRatioMin: null, ageMin: null, ageMax: null,
            volatilityMin: null, volatilityMax: null, hideIncompleteData: false
          };
          State.set('monitor.filters', defaults);
          State.applyPoolFilters();
          renderPoolMonitorPage(document.getElementById('app-content'));
          renderPoolMonitor();
        });
      }
      return;
    }

    const colDefs = CONFIG.POOL_COLUMNS;
    const filters = state.monitor.filters;

    // Build unique values for inline column filters
    const allPools = state.monitor.pools;
    const uniqueProtocols = [...new Set(allPools.map(p => p.protocol))];
    const uniqueNetworks = [...new Set(allPools.map(p => p.network))];
    const uniqueFeeTiers = [...new Set(allPools.map(p => p.feeTierLabel).filter(Boolean))].sort();
    const uniqueRisks = ['very_low', 'low', 'medium', 'high', 'very_high'];
    const riskLabels = { very_low: 'Very Low', low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High' };

    // Inline filter state (stored in filters object for protocol/network, separate for column-level)
    function colFilterDropdown(col, options, currentVal, labelFn) {
      return `<select class="col-filter-select" data-col-filter="${col}" title="Filter ${col}">
        <option value="">All</option>
        ${options.map(o => `<option value="${o}" ${currentVal === o ? 'selected' : ''}>${labelFn ? labelFn(o) : o}</option>`).join('')}
      </select>`;
    }

    let html = `<div class="table-scroll"><table class="data-table" id="pool-table">
      <thead>
        <tr>
          ${cols.map(col => {
            const def = colDefs[col];
            if (!def) return '';
            const isSorted = sortBy === col;
            const arrow = isSorted ? (sortDir === 'desc' ? ' ▾' : ' ▴') : '';
            return `<th class="sortable${isSorted ? ' sorted' : ''}" data-sort="${col}">${def.label}${arrow}</th>`;
          }).join('')}
        </tr>
        <tr class="filter-row">
          ${cols.map(col => {
            if (col === 'protocol') {
              return `<th class="filter-cell">${colFilterDropdown('protocol', uniqueProtocols, filters._colProtocol || '', (p) => CONFIG.PROTOCOLS[p]?.name || p)}</th>`;
            }
            if (col === 'network') {
              return `<th class="filter-cell">${colFilterDropdown('network', uniqueNetworks, filters._colNetwork || '', (n) => CONFIG.NETWORKS[n]?.name || n)}</th>`;
            }
            if (col === 'feeTier') {
              return `<th class="filter-cell">${colFilterDropdown('feeTier', uniqueFeeTiers, filters._colFeeTier || '', (f) => f)}</th>`;
            }
            if (col === 'risk') {
              return `<th class="filter-cell">${colFilterDropdown('risk', uniqueRisks, filters._colRisk || '', (r) => riskLabels[r] || r)}</th>`;
            }
            if (col === 'source') {
              const uniqueSources = [...new Set(allPools.map(p => p.source).filter(Boolean))];
              return `<th class="filter-cell">${colFilterDropdown('source', uniqueSources, filters._colSource || '', (s) => CONFIG.SOURCES[s]?.name || s)}</th>`;
            }
            return '<th class="filter-cell"></th>';
          }).join('')}
        </tr>
      </thead>
      <tbody>`;

    for (const pool of pools) {
      const isTop = pool.score !== null && pool.score >= 70;
      html += `<tr class="pool-row${isTop ? ' row-highlight' : ''}" data-pool-id="${pool.id}">`;

      for (const col of cols) {
        html += '<td>' + renderPoolCell(pool, col) + '</td>';
      }

      html += '</tr>';
    }

    html += '</tbody></table></div>';

    // Pagination controls
    html += renderPaginationControls(filteredCount, pagination, totalPages);

    // Last updated
    if (state.monitor.lastUpdated) {
      html += `<div class="table-footer"><span class="text-muted">Last updated: ${new Date(state.monitor.lastUpdated).toLocaleString()}</span>
        <span class="text-muted"> · Primary source: DeFi Llama</span>
        <span class="data-disclaimer"> · <em>APR/APY values are estimates based on 24h volume. Actual returns may vary.</em></span>
      </div>`;
    }

    wrapper.innerHTML = html;

    // Wire sort headers
    wrapper.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', () => App.updateSort(th.dataset.sort));
    });

    // Wire inline column filters
    wrapper.querySelectorAll('.col-filter-select').forEach(select => {
      select.addEventListener('click', (e) => e.stopPropagation()); // prevent sort trigger
      select.addEventListener('change', (e) => {
        e.stopPropagation();
        const col = select.dataset.colFilter;
        const val = select.value;
        // Store column-level filters in state
        const f = State.get().monitor.filters;
        if (col === 'protocol') {
          f._colProtocol = val;
          App.updateFilter('protocols', val ? [val] : []);
        } else if (col === 'network') {
          f._colNetwork = val;
          App.updateFilter('networks', val ? [val] : []);
        } else if (col === 'feeTier') {
          f._colFeeTier = val;
          // Filter by fee tier label
          State.set('monitor.filters._colFeeTier', val);
          State.applyPoolFilters();
          renderPoolMonitor();
        } else if (col === 'risk') {
          f._colRisk = val;
          State.set('monitor.filters._colRisk', val);
          State.applyPoolFilters();
          renderPoolMonitor();
        } else if (col === 'source') {
          f._colSource = val;
          State.set('monitor.filters._colSource', val);
          State.applyPoolFilters();
          renderPoolMonitor();
        }
      });
    });

    // Wire row clicks for detail
    wrapper.querySelectorAll('.pool-row').forEach(row => {
      row.addEventListener('click', () => {
        const poolId = row.dataset.poolId;
        const pool = state.monitor.filteredPools.find(p => p.id === poolId);
        if (pool) openPoolDetail(pool);
      });
    });

    // Wire pagination controls
    const perPageSelect = document.getElementById('pagin-per-page');
    if (perPageSelect) {
      perPageSelect.value = String(pagination.perPage);
      perPageSelect.addEventListener('change', (e) => {
        App.setPoolPerPage(parseInt(perPageSelect.value, 10));
      });
    }

    wrapper.querySelectorAll('.pagin-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        if (action === 'prev') App.setPoolPage(pagination.page - 1);
        else if (action === 'next') App.setPoolPage(pagination.page + 1);
        else if (action === 'page') App.setPoolPage(parseInt(btn.dataset.page, 10));
      });
    });
  }

  function renderPaginationControls(totalItems, pagination, totalPages) {
    const perPage = pagination.perPage;
    const page = pagination.page;
    const options = pagination.perPageOptions.map(opt =>
      `<option value="${opt}" ${opt === perPage ? 'selected' : ''}>${opt} por página</option>`
    ).join('');

    if (totalPages <= 1) return '';

    // Build visible page numbers (max 5 around current)
    let pages = [];
    if (totalPages <= 5) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, page + 2);
      if (start === 1) end = Math.min(5, totalPages);
      if (end === totalPages) start = Math.max(1, totalPages - 4);
      pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    const pageButtons = pages.map(p =>
      `<a href="#" class="pagin-btn ${p === page ? 'active' : ''}" data-action="page" data-page="${p}">${p}</a>`
    ).join('');

    const startItem = (page - 1) * perPage + 1;
    const endItem = Math.min(page * perPage, totalItems);

    return `
    <div class="pagination-controls" id="pagination-controls">
      <div class="pagination-info">
        Exibindo <strong>${startItem}</strong> a <strong>${endItem}</strong> de <strong>${totalItems}</strong> pools
      </div>
      <div class="pagination-actions">
        <label class="pagination-label">Itens por página:</label>
        <select id="pagin-per-page" class="select-sm">${options}</select>
      </div>
      <div class="pagination-nav">
        <a href="#" class="pagin-btn ${page === 1 ? 'disabled' : ''}" data-action="prev">Anterior</a>
        ${pageButtons}
        <a href="#" class="pagin-btn ${page === totalPages ? 'disabled' : ''}" data-action="next">Próximo</a>
      </div>
    </div>`;
  }

  function renderPoolCell(pool, col) {
    switch (col) {
      case 'protocol': return protocolChip(pool.protocol);
      case 'network': return networkChip(pool.network);
      case 'pair': return `<span class="pair-cell"><strong>${escHtml(pool.pair)}</strong><span class="pair-type-tag">${pool.pairType || ''}</span></span>`;
      case 'feeTier': return `<span class="mono-data">${pool.feeTierLabel || '—'}</span>`;
      case 'price': return `<span class="mono-data">${fmtPrice(pool.price)}</span>`;
      case 'volume24h': return `<span class="mono-data">${fmtUSD(pool.volume24h)}</span>`;
      case 'tvl': return `<span class="mono-data">${fmtUSD(pool.tvl)}</span>`;
      case 'apr': return pool.dataQuality?.aprSource === 'unavailable'
        ? '<span class="text-muted" title="Insufficient data">—</span>'
        : `<span class="mono-data ${pool.apr > 50 ? 'text-green' : ''}" title="Source: ${pool.dataQuality?.aprSource || 'estimated'}">${fmtPct(pool.apr)}${pool.dataQuality?.aprSource === 'estimated_from_volume' ? ' *' : ''}</span>`;
      case 'apy': return `<span class="mono-data">${fmtPct(pool.apy)}</span>`;
      case 'volatility': return `<span class="mono-data">${fmtPct(pool.volatility)}</span>`;
      case 'correlation': {
        const c = pool.correlationScore !== null && pool.correlationScore !== undefined ? pool.correlationScore : 0;
        const pct = Math.round(c * 100);
        const cls = c >= 0.8 ? 'text-red' : c >= 0.5 ? 'text-orange' : 'text-green';
        return `<span class="mono-data ${cls}" title="Correlation: ${pct}% (proxy based on pair type)">${pct}%</span>`;
      }
      case 'age': return `<span class="mono-data">${fmtAge(pool.ageDays)}</span>`;
      case 'volumeTvlRatio': return `<span class="mono-data">${pool.volumeTvlRatio !== null ? pool.volumeTvlRatio.toFixed(3) : '—'}</span>`;
      case 'rangeCenter': return `<span class="mono-data">${pool.rangeCenterDist !== null ? fmtPct(pool.rangeCenterDist) : '—'}</span>`;
      case 'inRange': return statusBadge(pool.inRange);
      case 'rangeExitProb': return pool.rangeExitProb !== null ? `<span class="mono-data">${pool.rangeExitProb}%</span>` : '<span class="text-muted">—</span>';
      case 'score': return scoreMiniBar(pool.score);
      case 'risk': return riskBadge(pool.risk);
      case 'dataQuality': return qualityBadge(pool.dataQuality);
      case 'source': return sourceBadge(pool.source);
      case 'apyBase': return `<span class="mono-data">${fmtPct(pool.apyBase)}</span>`;
      case 'apyReward': return pool.apyReward ? `<span class="mono-data text-green">${fmtPct(pool.apyReward)}</span>` : '<span class="text-muted">—</span>';
      case 'link': {
        const url = pool.sourceUrl || pool.llamaUrl || pool.geckoUrl;
        const label = pool.source === 'defillama' ? 'DeFi Llama' : pool.source === 'geckoterminal' ? 'GeckoTerminal' : 'View';
        return `<a href="${API.safeUrl(url)}" target="_blank" rel="noopener" class="btn-link" onclick="event.stopPropagation()" title="Open on ${label}">↗</a>`;
      }
      default: return '—';
    }
  }

  function renderPoolSummaryCards(pools) {
    const el = document.getElementById('pool-summary-cards');
    if (!el) return;

    const totalTvl = pools.reduce((s, p) => s + (p.tvl || 0), 0);
    const totalVol = pools.reduce((s, p) => s + (p.volume24h || 0), 0);
    const avgApr = pools.length > 0 ? pools.reduce((s, p) => s + (p.apr || 0), 0) / pools.length : 0;
    const inRange = pools.filter(p => p.inRange).length;
    const topScore = pools.length > 0 ? Math.max(...pools.map(p => p.score || 0)) : 0;
    const networks = new Set(pools.map(p => p.network)).size;

    el.innerHTML = `
      <div class="summary-card">
        <div class="summary-card-label">Total TVL</div>
        <div class="summary-card-value mono-data">${fmtUSD(totalTvl)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Total Volume 24h</div>
        <div class="summary-card-value mono-data">${fmtUSD(totalVol)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Avg APR (est.)</div>
        <div class="summary-card-value mono-data">${fmtPct(avgApr)}</div>
        <div class="summary-card-note">Based on 24h volume</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Pools In Range</div>
        <div class="summary-card-value mono-data">${inRange}<span class="text-muted">/${pools.length}</span></div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Top Score</div>
        <div class="summary-card-value mono-data">${topScore.toFixed(1)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Networks</div>
        <div class="summary-card-value mono-data">${networks}</div>
      </div>
    `;
  }

  // === POOL DETAIL DRAWER ===

  function openPoolDetail(pool) {
    const drawer = document.getElementById('pool-drawer');
    const title = document.getElementById('drawer-title');
    const body = document.getElementById('drawer-body');
    const closeBtn = document.getElementById('drawer-close');

    if (!drawer || !body) return;

    title.textContent = `${pool.pair} — ${pool.protocolName} on ${pool.networkName}`;

    const range = Scoring.calculateRange(pool, State.get().monitor.profile);
    const ta = pool.ta || Scoring.simplifiedTA(pool);

    body.innerHTML = `
      <div class="detail-section">
        <h4 class="detail-section-title">Pool Overview</h4>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">Protocol</span>${protocolChip(pool.protocol)}</div>
          <div class="detail-item"><span class="detail-label">Network</span>${networkChip(pool.network)}</div>
          <div class="detail-item"><span class="detail-label">Fee Tier</span><span class="mono-data">${pool.feeTierLabel}</span></div>
          <div class="detail-item"><span class="detail-label">Pair Type</span><span class="badge badge-neutral">${pool.pairType}</span></div>
          <div class="detail-item"><span class="detail-label">Price</span><span class="mono-data">${fmtPrice(pool.price)}</span></div>
          <div class="detail-item"><span class="detail-label">TVL</span><span class="mono-data">${fmtUSD(pool.tvl)}</span></div>
          <div class="detail-item"><span class="detail-label">Volume 24h</span><span class="mono-data">${fmtUSD(pool.volume24h)}</span></div>
          <div class="detail-item"><span class="detail-label">Vol/TVL</span><span class="mono-data">${pool.volumeTvlRatio?.toFixed(3) || '—'}</span></div>
          <div class="detail-item"><span class="detail-label">APR (est.)</span><span class="mono-data">${fmtPct(pool.apr)}</span></div>
          <div class="detail-item"><span class="detail-label">APY (est.)</span><span class="mono-data">${fmtPct(pool.apy)}</span></div>
          <div class="detail-item"><span class="detail-label">Volatility 24h</span><span class="mono-data">${fmtPct(pool.volatility)}</span></div>
          <div class="detail-item"><span class="detail-label">Age</span><span class="mono-data">${fmtAge(pool.ageDays)}</span></div>
          <div class="detail-item"><span class="detail-label">Score</span>${scoreMiniBar(pool.score)}</div>
          <div class="detail-item"><span class="detail-label">Risk</span>${riskBadge(pool.risk)}</div>
          <div class="detail-item"><span class="detail-label">Status</span>${statusBadge(pool.inRange)}</div>
          <div class="detail-item"><span class="detail-label">Data Quality</span>${qualityBadge(pool.dataQuality)}</div>
        </div>
      </div>

      <div class="detail-section">
        <h4 class="detail-section-title">Range Analysis <span class="badge badge-neutral">${State.get().monitor.profile}</span></h4>
        <div class="range-viz">
          <div class="range-bar-container">
            ${renderRangeVisualization(pool, range)}
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">Range Min</span><span class="mono-data">${range.min ? fmtPrice(range.min) : '—'}</span></div>
          <div class="detail-item"><span class="detail-label">Range Max</span><span class="mono-data">${range.max ? fmtPrice(range.max) : '—'}</span></div>
          <div class="detail-item"><span class="detail-label">Width</span><span class="mono-data">${range.width ? fmtPct(range.width) : '—'}</span></div>
          <div class="detail-item"><span class="detail-label">Exit Probability</span><span class="mono-data">${pool.rangeExitProb !== null ? pool.rangeExitProb + '%' : '—'}</span></div>
        </div>
        <div class="detail-note">${range.justification || ''}</div>
        <div class="detail-note detail-note-warn">Range suggestions are estimates based on limited data. Always do your own analysis before providing liquidity.</div>
      </div>

      <div class="detail-section">
        <h4 class="detail-section-title">Technical Summary <span class="badge badge-neutral">Simplified</span></h4>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">Support (est.)</span><span class="mono-data">${ta.support ? fmtPrice(ta.support) : '—'}</span></div>
          <div class="detail-item"><span class="detail-label">Resistance (est.)</span><span class="mono-data">${ta.resistance ? fmtPrice(ta.resistance) : '—'}</span></div>
          <div class="detail-item"><span class="detail-label">Bias</span><span class="badge badge-neutral">${ta.bias}</span></div>
          <div class="detail-item"><span class="detail-label">Vol. Level</span><span class="badge badge-neutral">${ta.volatilityLevel}</span></div>
        </div>
        <div class="detail-note">${ta.note || 'Based on limited 24h data. Low confidence.'}</div>
      </div>

      <div class="detail-section">
        <h4 class="detail-section-title">Data Quality</h4>
        <div class="quality-grid">
          ${renderDataQualityDetails(pool.dataQuality)}
        </div>
      </div>

      <div class="detail-actions">
        <a href="${API.safeUrl(pool.sourceUrl || pool.llamaUrl || pool.geckoUrl)}" target="_blank" rel="noopener" class="btn btn-primary">Open on ${pool.sourceName || 'DeFi Llama'} ↗</a>
      </div>
    `;

    drawer.style.display = 'flex';
    setTimeout(() => drawer.classList.add('open'), 10);

    closeBtn.onclick = () => {
      drawer.classList.remove('open');
      setTimeout(() => { drawer.style.display = 'none'; }, 200);
    };
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) {
        drawer.classList.remove('open');
        setTimeout(() => { drawer.style.display = 'none'; }, 200);
      }
    });
  }

  function renderRangeVisualization(pool, range) {
    if (!range.min || !range.max || !pool.price) {
      return '<div class="range-unavailable">Range visualization unavailable — insufficient price data</div>';
    }

    const min = range.min;
    const max = range.max;
    const price = pool.price;
    const totalRange = max - min;
    const pricePct = totalRange > 0 ? ((price - min) / totalRange) * 100 : 50;

    return `
      <div class="range-bar">
        <div class="range-bar-fill" style="left:0;right:0;"></div>
        <div class="range-bar-price" style="left:${Math.max(0, Math.min(100, pricePct))}%" title="Current: ${fmtPrice(price)}"></div>
      </div>
      <div class="range-bar-labels">
        <span class="mono-data range-label-min">${fmtPrice(min)}</span>
        <span class="mono-data range-label-current">${fmtPrice(price)}</span>
        <span class="mono-data range-label-max">${fmtPrice(max)}</span>
      </div>
    `;
  }

  function renderDataQualityDetails(dq) {
    if (!dq) return '<div class="text-muted">No quality data</div>';
    const items = [
      { label: 'Price', ok: dq.priceConfirmed },
      { label: 'Volume', ok: dq.volumeConfirmed },
      { label: 'TVL', ok: dq.tvlConfirmed },
      { label: 'APR Source', value: dq.aprSource },
      { label: 'Age', ok: dq.ageConfirmed }
    ];
    return items.map(i => {
      if (i.value) return `<div class="quality-item"><span class="quality-label">${i.label}</span><span class="badge badge-neutral">${i.value}</span></div>`;
      return `<div class="quality-item"><span class="quality-label">${i.label}</span><span class="quality-dot ${i.ok ? 'quality-ok' : 'quality-no'}"></span></div>`;
    }).join('');
  }

  // === SEARCH RESULTS ===

  function renderSearchResults(results) {
    const dd = document.getElementById('search-dropdown');
    if (!dd) return;

    if (results.length === 0) {
      dd.innerHTML = '<div class="search-empty">No pools found</div>';
      dd.style.display = 'block';
      return;
    }

    dd.innerHTML = results.slice(0, 10).map(pool => `
      <div class="search-result-item" data-pool-id="${pool.id}">
        <div class="search-result-main">
          <strong>${escHtml(pool.pair)}</strong>
          <span class="text-muted">${pool.feeTierLabel || ''}</span>
        </div>
        <div class="search-result-meta">
          ${networkChip(pool.network)} ${protocolChip(pool.protocol)}
          <span class="mono-data text-muted">${fmtUSD(pool.tvl)} TVL</span>
        </div>
        <button class="btn btn-xs btn-primary search-result-add">+ Add to Monitor</button>
      </div>
    `).join('');

    dd.style.display = 'block';

    dd.querySelectorAll('.search-result-add').forEach((btn, i) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.addCustomPool(results[i]);
        btn.textContent = 'Added ✓';
        btn.disabled = true;
      });
    });

    // Close on outside click
    document.addEventListener('click', function closeDD(e) {
      if (!dd.contains(e.target) && e.target.id !== 'pool-search') {
        dd.style.display = 'none';
        document.removeEventListener('click', closeDD);
      }
    });
  }

  // === WALLET TRACKER PAGE ===

  function renderWalletTrackerPage(container) {
    const state = State.get();
    const wallets = state.tracker.wallets;

    container.innerHTML = `
      <div class="page-tracker">
        <div class="page-topbar">
          <div class="topbar-left">
            <h1 class="page-title">Wallet Tracker</h1>
            <span class="page-subtitle" id="position-count-label">${wallets.length > 0 ? 'Loading positions...' : 'Add a wallet to start tracking'}</span>
          </div>
        </div>

        <div class="wallet-input-section">
          <div class="wallet-input-row">
            <input type="text" id="wallet-address" class="input-lg" placeholder="Enter Ethereum (0x...) or Solana address">
            <select id="wallet-network" class="select-sm">
              <option value="">Auto-detect</option>
              ${Object.entries(CONFIG.NETWORKS).map(([key, net]) => `<option value="${key}">${net.name}</option>`).join('')}
            </select>
            <button class="btn btn-primary" id="btn-add-wallet">Track Wallet</button>
          </div>
          ${wallets.length > 0 ? `
            <div class="tracked-wallets">
              <span class="filter-label">Tracked:</span>
              ${wallets.map(w => `
                <span class="chip chip-wallet" title="${w.address}">
                  ${networkChip(w.network)}
                  <span class="mono-data">${w.label}</span>
                  <button class="chip-remove" data-addr="${w.address}" data-net="${w.network}">✕</button>
                </span>
              `).join('')}
            </div>
          ` : ''}
          <div class="wallet-limitations" id="wallet-limitations"></div>
        </div>

        <div class="wallet-summary-section" id="wallet-summary" style="display:none"></div>

        <div class="tracker-filters" id="tracker-filters">
          <div class="filter-chips-row">
            <select id="tracker-filter-status" class="select-sm">
              <option value="">All Status</option>
              <option value="in_range">In Range</option>
              <option value="out_of_range">Out of Range</option>
            </select>
            <select id="tracker-sort" class="select-sm">
              <option value="urgency">Sort: Urgency</option>
              <option value="health">Sort: Health</option>
              <option value="pnl">Sort: PnL</option>
              <option value="inRange">Sort: Status</option>
            </select>
          </div>
        </div>

        <div class="table-wrapper" id="position-table-wrapper">
          ${wallets.length > 0 && state.tracker.loading ? renderSkeletonTable(5) : ''}
          ${wallets.length === 0 ? renderEmptyState(
            'No wallets tracked',
            'Enter an Ethereum or Solana address to view your concentrated liquidity positions. Supports Uniswap V3 on Ethereum, Arbitrum, Polygon, and Base.',
            null
          ) : ''}
        </div>
      </div>
    `;

    // Wire wallet input
    const btnAdd = document.getElementById('btn-add-wallet');
    const addrInput = document.getElementById('wallet-address');
    if (btnAdd && addrInput) {
      btnAdd.addEventListener('click', () => {
        const addr = addrInput.value.trim();
        const net = document.getElementById('wallet-network')?.value || '';
        if (addr) {
          App.addWallet(addr, net || undefined);
          addrInput.value = '';
        }
      });
      addrInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnAdd.click();
      });
    }

    // Wire wallet removal
    container.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const addr = btn.getAttribute('data-addr');
        const net = btn.getAttribute('data-net');
        App.removeWallet(addr, net);
        // Re-render the tracker page immediately
        renderWalletTrackerPage(document.getElementById('app-content'));
      });
    });

    // Wire filters
    const statusFilter = document.getElementById('tracker-filter-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        State.set('tracker.filters.status', statusFilter.value);
        renderWalletTracker();
      });
    }

    const sortSelect = document.getElementById('tracker-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        State.set('tracker.sortBy', sortSelect.value);
        renderWalletTracker();
      });
    }

    // Show limitations
    renderLimitations();
  }

  function renderWalletTracker() {
    const state = State.get();
    const positions = State.applyPositionFilters() || state.tracker.scoredPositions;
    const summary = state.tracker.summary;

    // Update count label
    const label = document.getElementById('position-count-label');
    if (label) label.textContent = `${positions.length} positions tracked`;

    // Render summary
    if (summary && summary.positionCount > 0) {
      renderWalletSummary(summary);
    }

    // Render positions table
    const wrapper = document.getElementById('position-table-wrapper');
    if (!wrapper) return;

    if (state.tracker.loading && positions.length === 0) {
      wrapper.innerHTML = renderSkeletonTable(5);
      return;
    }

    if (positions.length === 0) {
      if (state.tracker.wallets.length > 0) {
        wrapper.innerHTML = renderEmptyState('No positions found', 'No active concentrated liquidity positions were found for the tracked wallets. This could mean no positions exist, or the data source is unavailable.');
      }
      return;
    }

    const cols = state.tracker.visibleColumns;
    const colDefs = CONFIG.POSITION_COLUMNS;

    let html = `<div class="table-scroll"><table class="data-table" id="position-table">
      <thead><tr>
        ${cols.map(col => {
          const def = colDefs[col];
          if (!def) return '';
          const sorted = state.tracker.sortBy === col;
          const arrow = sorted ? (state.tracker.sortDir === 'desc' ? ' ▾' : ' ▴') : '';
          return `<th class="sortable${sorted ? ' sorted' : ''}" data-sort="${col}">${def.label}${arrow}</th>`;
        }).join('')}
      </tr></thead>
      <tbody>`;

    for (const pos of positions) {
      const rowClass = pos.urgency === 'critical' ? 'row-danger' : pos.urgency === 'high' ? 'row-warning' : '';
      html += `<tr class="position-row ${rowClass}" data-pos-id="${pos.id}">`;

      for (const col of cols) {
        html += '<td>' + renderPositionCell(pos, col) + '</td>';
      }

      html += '</tr>';

      // Alerts row
      if (pos.alerts && pos.alerts.length > 0) {
        html += `<tr class="alert-row"><td colspan="${cols.length}"><div class="inline-alerts">`;
        for (const alert of pos.alerts) {
          html += `<span class="inline-alert inline-alert-${alert.type}">${alert.message}</span>`;
        }
        html += '</div></td></tr>';
      }
    }

    html += '</tbody></table></div>';

    if (state.tracker.lastUpdated) {
      html += `<div class="table-footer">
        <span class="text-muted">Last updated: ${new Date(state.tracker.lastUpdated).toLocaleString()}</span>
        <span class="data-disclaimer"> · <em>Values marked with * are estimated. Uncollected fees require on-chain calls.</em></span>
      </div>`;
    }

    wrapper.innerHTML = html;

    // Wire sort
    wrapper.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', () => App.updateSort(th.dataset.sort));
    });
  }

  function renderPositionCell(pos, col) {
    switch (col) {
      case 'protocol': return protocolChip(pos.protocol);
      case 'network': return networkChip(pos.network);
      case 'pair': return `<strong>${escHtml(pos.pair)}</strong>`;
      case 'positionId': return pos.positionId ? `<span class="mono-data text-muted">#${pos.positionId.slice(0, 8)}</span>` : '—';
      case 'valueInvested': return pos.valueInvested !== null ? `<span class="mono-data">${fmtUSD(pos.valueInvested)}</span>` : '<span class="text-muted" title="Requires historical price data">—*</span>';
      case 'valueCurrent': return pos.valueCurrent !== null ? `<span class="mono-data">${fmtUSD(pos.valueCurrent)}</span>` : '<span class="text-muted" title="Requires token price lookup">—*</span>';
      case 'pnl': return pos.pnl !== null ? `<span class="mono-data ${pos.pnl >= 0 ? 'text-green' : 'text-red'}">${fmtPct(pos.pnl)}</span>` : '<span class="text-muted">—*</span>';
      case 'feesAccumulated': return pos.feesAccumulated?.usd !== null ? `<span class="mono-data">${fmtUSD(pos.feesAccumulated.usd)}</span>` : `<span class="mono-data text-muted" title="In token amounts">${pos.feesAccumulated?.token0?.toFixed(4) || '?'}/${pos.feesAccumulated?.token1?.toFixed(4) || '?'}</span>`;
      case 'feesUncollected': return pos.feesUncollected?.usd !== null ? `<span class="mono-data">${fmtUSD(pos.feesUncollected.usd)}</span>` : `<span class="text-muted" title="${pos.feesUncollected?.note || 'Unavailable'}">—*</span>`;
      case 'rangeMin': return `<span class="mono-data">${fmtPrice(pos.rangeMin)}</span>`;
      case 'rangeMax': return `<span class="mono-data">${fmtPrice(pos.rangeMax)}</span>`;
      case 'rangeWidth': return `<span class="mono-data">${fmtPct(pos.rangeWidth)}</span>`;
      case 'currentPrice': return `<span class="mono-data">${fmtPrice(pos.currentPrice)}</span>`;
      case 'inRange': return statusBadge(pos.inRange);
      case 'distLower': return `<span class="mono-data">${fmtPct(pos.distLower)}</span>`;
      case 'distUpper': return `<span class="mono-data">${fmtPct(pos.distUpper)}</span>`;
      case 'rangeUtil': return `<span class="mono-data">${fmtPct(pos.rangeUtil)}</span>`;
      case 'tokenAAlloc': return `<span class="mono-data">${fmtPct(pos.tokenAAlloc, 0)}</span>`;
      case 'tokenBAlloc': return `<span class="mono-data">${fmtPct(pos.tokenBAlloc, 0)}</span>`;
      case 'il': return pos.il !== null ? `<span class="mono-data text-red">${fmtPct(pos.il)}</span>` : '<span class="text-muted" title="Requires entry price data">—*</span>';
      case 'netVsHold': return pos.netVsHold !== null ? `<span class="mono-data ${pos.netVsHold >= 0 ? 'text-green' : 'text-red'}">${fmtPct(pos.netVsHold)}</span>` : '<span class="text-muted">—*</span>';
      case 'created': return pos.createdAt ? new Date(pos.createdAt).toLocaleDateString() : '—';
      case 'lastUpdate': return fmtTime(pos.lastUpdated);
      case 'health': return healthBadge(pos.health);
      case 'urgency': return urgencyBadge(pos.urgency);
      case 'link': return `<a href="${API.safeUrl(pos.link)}" target="_blank" rel="noopener" class="btn-link" onclick="event.stopPropagation()">↗</a>`;
      default: return '—';
    }
  }

  function renderWalletSummary(summary) {
    const el = document.getElementById('wallet-summary');
    if (!el) return;
    el.style.display = 'block';

    el.innerHTML = `
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-card-label">Positions</div>
          <div class="summary-card-value mono-data">${summary.positionCount}</div>
        </div>
        <div class="summary-card ${summary.outOfRangeCount > 0 ? 'summary-card-warn' : ''}">
          <div class="summary-card-label">In Range</div>
          <div class="summary-card-value mono-data">${fmtPct(summary.inRangePct, 0)}</div>
          <div class="summary-card-note">${summary.inRangeCount} in / ${summary.outOfRangeCount} out</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Avg Health</div>
          <div class="summary-card-value mono-data">${summary.avgHealth}%</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Risk Level</div>
          <div class="summary-card-value">${riskBadge(summary.riskLevel)}</div>
        </div>
        ${summary.criticalAlerts > 0 ? `
          <div class="summary-card summary-card-danger">
            <div class="summary-card-label">Critical Alerts</div>
            <div class="summary-card-value mono-data text-red">${summary.criticalAlerts}</div>
          </div>
        ` : ''}
        <div class="summary-card">
          <div class="summary-card-label">Networks</div>
          <div class="summary-card-value">${Object.entries(summary.byNetwork).map(([n, c]) => `<span class="chip chip-sm">${n}: ${c}</span>`).join(' ')}</div>
        </div>
      </div>
      ${Object.keys(summary.byAsset).length > 0 ? `
        <div class="asset-distribution">
          <span class="filter-label">Asset Exposure:</span>
          ${Object.entries(summary.byAsset).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([asset, count]) => `
            <span class="chip chip-sm">${asset}: ${count}</span>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  function renderLimitations() {
    const el = document.getElementById('wallet-limitations');
    const lims = State.get().tracker.limitations;
    if (!el || lims.length === 0) return;

    el.innerHTML = lims.map(l => `
      <div class="limitation-notice">
        <span class="limitation-icon">⚠</span>
        <div>
          <strong>${l.source}</strong>: ${l.reason}
          <div class="text-muted">${l.impact}</div>
        </div>
      </div>
    `).join('');
  }

  // === SHARED RENDERERS ===

  function renderSkeletonTable(rows) {
    return `<div class="skeleton-table">
      <div class="skeleton-row skeleton-header">
        ${Array(6).fill('<div class="skeleton-cell skeleton-shimmer"></div>').join('')}
      </div>
      ${Array(rows).fill(`<div class="skeleton-row">
        ${Array(6).fill('<div class="skeleton-cell skeleton-shimmer"></div>').join('')}
      </div>`).join('')}
    </div>`;
  }

  function renderEmptyState(title, description, actionLabel, actionFn) {
    return `<div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="4" y="8" width="40" height="32" rx="4" stroke="currentColor" stroke-width="2" opacity="0.3"/><path d="M16 20h16M16 28h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/></svg>
      </div>
      <h3 class="empty-title">${title}</h3>
      <p class="empty-description">${description}</p>
      ${actionLabel ? `<button class="btn btn-primary empty-action" id="empty-action-btn">${actionLabel}</button>` : ''}
    </div>`;
  }

  // Public API
  return {
    renderPoolMonitorPage,
    renderPoolMonitor,
    renderWalletTrackerPage,
    renderWalletTracker,
    renderSearchResults,
    openPoolDetail
  };
})();
