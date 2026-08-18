# CLP Monitor — Monorepo Frontend

## Propósito
Dashboard de monitoramento de pools de liquidez concentrada (CLP) em múltiplas redes e protocolos DeFi. Aplicação client-side, sem backend próprio.

## Estrutura
```
index.html     — Entry point, estrutura HTML (header, modais, drawer, toasts)
css/styles.css — Design system completo (Bloomberg Terminal + Modern Fintech), ~4800 linhas
js/config.js   — Configuração centralizada (redes, protocolos, scoring, colunas, presets)
js/api.js      — Camada de dados: DeFi Llama (primário), GeckoTerminal (busca), RPC on-chain (carteiras)
js/scoring.js  — Motor de scoring, análise de range, avaliação de saúde de posições
js/state.js    — Gerenciamento de estado reativo com persistência em localStorage
js/ui.js       — Renderização da UI: tabelas, badges, drawers, filtros, busca
js/app.js      — Orquestrador principal: navegação, refresh, modais, eventos
```

## Arquitetura
- **Padrão:** SPA vanilla JS com módulos IIFE ( Reveling Module Pattern)
- **Estado:** `State` — gerenciamento centralizado com subscribe/notify e persistência em `localStorage`
- **Dados:** `API` — fetch com rate-limit, retry e timeout; fontes priorizadas: DeFi Llama → GeckoTerminal → RPC on-chain
- **Scoring:** `Scoring` — algoritmo ponderado com perfis (conservador/agressivo), análise de range simplificada, health score para posições
- **UI:** `UI` — renderização imperativa via innerHTML, sem framework, sem VDOM
- **App:** `App` — controlador principal, delega para State/API/Scoring/UI

## Redes Suportadas
Ethereum, Base, Arbitrum, Polygon, BSC, Solana

## Protocolos Suportados
Uniswap V3, Uniswap V4 (dados limitados), Orca, Raydium

## Comandos
```bash
# Não há build step — abrir index.html diretamente ou servir via qualquer HTTP server
npx serve .
# ou
python3 -m http.server 8080
```

## APIs Externas
| Fonte | URL | Uso |
|-------|-----|-----|
| DeFi Llama Yields | `https://yields.llama.fi/pools` | Dados primários (TVL, APR, volume) |
| GeckoTerminal | `https://api.geckoterminal.com/api/v2` | Busca de pools |
| RPCs Públicos | eth.llamarpc.com, arb1.arbitrum.io, etc. | Leitura de posições on-chain (Uniswap V3) |

## Dependências
- **Zero dependências JS** — sem npm, sem bundler, sem framework
- **Fonts:** Google Fonts (DM Sans, JetBrains Mono) via CDN
- **Playwright CLI:** snapshots para debug visual (em `.playwright-cli/`)

## Configuração e Personalização
- **Perfis de scoring:** `CONFIG.SCORING.CONSERVATIVE` e `CONFIG.SCORING.AGGRESSIVE` (pesos ajustáveis)
- **Ranges sugeridos:** `CONFIG.RANGES` (por tipo de par: stable/correlated/volatile)
- **Colunas:** `CONFIG.POOL_COLUMNS` e `CONFIG.POSITION_COLUMNS` (visibilidade e agrupamento)
- **Presets de visualização:** `CONFIG.VIEW_PRESETS` (conservative, aggressive, custom)
- **Intervalos de refresh:** 15s, 30s, 60s (default), 5min, manual

## Limitações Conhecidas
- **Solana:** posições LP só via indexadores externos (app.orca.so, app.raydium.io)
- **Valores USD:** dependem de preços de tokens não disponíveis via DeFi Llama
- **Fees não coletadas:** requerem computação on-chain complexa (flashchain)
- **IL (Impermanent Loss):** estimativa indisponível sem preço de entrada
- **Máximo de posições:** limitado a 50 por carteira por chamada RPC
- **Uniswap V4:** dados limitados, podem aparecer sob V3 nos indexadores
- **Volatilidade:** usa mudança diária de APY como proxy (não é volatilidade real de preço)
- **shufflePools:** estado de scoring é mutado diretamente nos pools (scorePool retorna `...pool`)

## Segurança (Verificados)
- ✅ `escHtml()` para sanitização de strings em innerHTML
- ✅ `rel="noopener"` em links externos
- ✅ Rate limiting em chamadas API (300ms delay)
- ✅ Timeout em fetch (15s API, 30s RPC)
- ✅ Retry com backoff exponencial
- ⚠️ Não há CSP (Content Security Policy) — inline styles/scripts permitidos
- ⚠️ Endereços de carteira armazenados em localStorage sem criptografia
- ⚠️ RPCs públicos sem autenticação — dados podem ser interceptados em trânsito
