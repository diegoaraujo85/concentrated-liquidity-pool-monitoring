# Implementation Plan

[Overview]

Implement all 27 technical-refinement cards for the Concentrated Liquidity Pool Monitor (CLP Monitor) dashboard, ordered by priority P0 → P1 → P2 → P3. The project is a vanilla JS SPA (zero-dependencies) at `D:/Downloads/mulerun/ConcentratedLiquidityPoolMonitoring/`. Security P0 items block production deploy; P1 adds tests/accessibility/performance; P2 adds architecture/scoring/Solana; P3 adds build/modernization/CI. Git is initialized with branch `develop` as main.

[Types]

No new type system introduced — vanilla JS. However, the following data structures are formalized:

- `State.monitor.filters` — object with keys: networks (string[]), protocols (string[]), assets (string[]), pairType (string), tvlMin/Max (number|null), volume24hMin/Max, volumeTvlRatioMin, ageMin/Max, volatilityMin/Max, hideIncompleteData (boolean), plus inline column filters _colProtocol/_colNetwork/_colFeeTier/_colRisk/_colSource.
- `State.monitor.pools` — array of normalized pool objects from DeFi Llama + GeckoTerminal.
- `State.monitor.filteredPools` — subset after applying filters.
- `CONFIG.PROTOCOLS` — object keyed by protocol id (uniswap-v3, uniswap-v4, orca, raydium), each with {name, networks[], color, llamaProject, note}.
- `CONFIG.NETWORKS` — object keyed by network id, each with {id, name, symbol, explorer, color, geckoId, llamaChain}.
- `CONFIG.SOURCES` — data source labels with color.
- Test fixtures: sample pool objects, wallet position objects, scoring expected outputs.

[Files]

New files:
- `vitest.config.js` — Vitest configuration with happy-dom environment.
- `test/scoring.test.js` — unit tests for Scoring.scorePool, calculateRange, getPairType.
- `test/api.test.js` — unit tests for API.normalizeLlamaPool, API.decodePositionsResult, safeUrl.
- `test/state.test.js` — unit tests for State.applyPoolFilters, State.set validation.
- `test/security.test.js` — tests for showToast sanitization, URL validation, schema validation on localStorage load.
- `package.json` — npm manifest (vitest, happy-dom, playwright as devDeps).
- `playwright.config.js` — Playwright E2E configuration.
- `e2e/pool-monitor.spec.js` — E2E smoke test for pool table render + filter clear.
- `index.html` — add CSP meta tag (modification, listed below).

Existing files to modify:
- `js/config.js` — add CSP-relevant constants, Object.freeze(CONFIG), protocol colors already updated (uniswap-v4 #00D4AA).
- `js/ui.js` — sanitize showToast (textContent instead of innerHTML), add CSP-compliant event listeners (remove onclick inline), add Clear Filters button on empty state (already implemented), aria labels/roles.
- `js/api.js` — add safeUrl validation, retry for getTokenSymbol with failure cache, health check for APIs.
- `js/scoring.js` — absolute normalization thresholds (TVL >= $1M bom, >= $10M excelente), fallback for datasets < 20 pools.
- `js/state.js` — validate schema on localStorage load, ensure all mutations go through State.set() with notify().
- `js/app.js` — wire new API health check, scoring updates, filter defaults.

Files to delete or move: none.

Config file updates:
- `package.json` — add test scripts (`npm test`, `npm run test:e2e`).

[Functions]

New functions:
- `API.safeUrl(url)` in `js/api.js` — validate http/https protocol, return '#' otherwise.
- `API.getHealthStatus()` in `js/api.js` — periodic health check for DeFi Llama, GeckoTerminal, RPC endpoints.
- `State.validateSchema(data)` in `js/state.js` — validate localStorage payload before applying.
- `UI.renderEmptyStateWithClear(title, description, actionLabel, actionFn, hasFilters)` in `js/ui.js` — empty state with optional Clear Filters button.
- `UI.renderProtocolChip(proto)` in `js/ui.js` — use CONFIG.PROTOCOLS[proto].color with aria-label.
- `Scoring.normalizeAbsolute(value, thresholds)` in `js/scoring.js` — absolute threshold normalization.
- `test/scoring.test.js`, `test/api.test.js`, `test/state.test.js`, `test/security.test.js` — Vitest test suites.

Modified functions:
- `UI.showToast(message)` — replace innerHTML with textContent to prevent XSS.
- `UI.protocolChip(proto)` — add aria-label, ensure --chip-color uses CONFIG color.
- `State.set(path, value)` — enforce notify() on all mutations.
- `API.fetchWalletPositions()` — add retry + failure cache for getTokenSymbol.
- `App.fetchPoolData()` — integrate API health check results.

Removed functions: none.

[Classes]

No classes — IIFE module pattern (CONFIG, API, Scoring, State, UI, App). Migration to ES Modules is a P2 card but not implemented in this plan phase.

[Dependencies]

New npm devDependencies (package.json):
- vitest ^1.x
- happy-dom ^13.x
- playwright ^1.x

No runtime dependencies — project remains zero-dependency client-side. Solana integration uses CDN links / external URLs only (per user decision), no SDK install.

[Testing]

- Vitest unit tests for pure logic modules: Scoring, API normalize, State filters, security sanitization.
- Target: 80%+ coverage of logic modules.
- Playwright E2E smoke test: load page, verify pools render, apply restrictive filters → empty state shows "Clear Filters", click Clear Filters → pools reappear.
- TDD cycle: write failing test → implement minimal code → verify green → refactor.

[Implementation Order]

1. P0 Security — Sanitize showToast (js/ui.js) + test
2. P0 Security — Validate URLs safeUrl (js/api.js) + test
3. P0 Security — Remove onclick inline + CSP header in index.html
4. P0 Security — Validate localStorage schema (js/state.js) + test
5. P0 Security — Object.freeze(CONFIG) (js/config.js)
6. P1 Tests — Vitest setup + package.json + vitest.config.js
7. P1 Tests — scoring.test.js, api.test.js, state.test.js, security.test.js
8. P1 Accessibility — aria-label/role/scope/aria-live (js/ui.js, index.html)
9. P1 Performance — pagination + debounce 500ms (js/ui.js)
10. P1 Robustness — health check APIs + retry getTokenSymbol (js/api.js)
11. P2 Architecture — ES Modules migration (all js/*.js)
12. P2 Scoring — absolute normalization thresholds (js/scoring.js) + test
13. P2 Data — CoinGecko OHLCV volatility (js/api.js, js/scoring.js)
14. P2 Solana — Orca/Raydium CDN links + fallback buttons (js/ui.js, index.html)
15. P2 Solana — scoring adaptation for tick/sqrtPrice (js/scoring.js)
16. P2 Uniswap V4 — Position Manager address support (js/api.js)
17. P3 Performance — incremental render / virtual scroll (js/ui.js)
18. P3 Security — localStorage encryption (js/state.js)
19. P3 UX — mobile breakpoints <768px cards, sidebar collapse <1024px (css/styles.css)
20. P3 UX — keyboard shortcuts Ctrl+R/Ctrl+F/Escape (js/app.js)
21. P3 Build — Vite dev server + bundler (vite.config.js, package.json scripts)
22. P3 Typing — JSDoc @typedef → TypeScript migration (js/*.js → .ts)
23. P3 Testing — Playwright E2E tests + CI (playwright.config.js, e2e/*.spec.js)
24. P3 DevOps — GitHub Actions lint + test + deploy Pages (.github/workflows/)

Each step: write test first (TDD), watch it fail, implement minimal code, verify green, refactor, commit to `develop`.