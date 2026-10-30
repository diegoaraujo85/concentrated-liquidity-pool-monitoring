# CLP Monitor

Dashboard de monitoramento de pools de liquidez concentrada (CLP) em múltiplas redes e protocolos DeFi. Aplicação client-side, sem backend próprio, sem dependências npm e sem build step.

## O que faz

- Monitora pools de liquidez concentrada (Uniswap V3/V4, Orca, Raydium)
- Exibe TVL, APR/APY, volume 24h, fee tier, score de risco e dados de qualidade
- Sugere ranges de posição por perfil (conservador/agressivo) com justificativa
- Carteira (Wallet Tracker): rastreia posições on-chain via RPC (Uniswap V3, cadeias EVM)
- Filtros inline (rede, protocolo, ativo, tipo de par, TVL, volume, fee tier, volatilidade), busca, ordenação
- Colunas visíveis configuráveis, presets de visualização (conservador/agressivo/custom)
- Tema escuro/claro, persistência de preferências em localStorage
- Toasts, drawer de detalhes, barra de progresso

## Estrutura do projeto

```
index.html             — Entry point (header, modais, drawer, toasts)
css/styles.css         — Design system (~4800 linhas)
js/config.js           — Config centralizada (redes, protocolos, scoring, colunas, presets)
js/api.js              — Camada de dados: DeFi Llama → GeckoTerminal → RPC on-chain
js/scoring.js          — Motor de scoring, análise de range, health score, TA simplificado
js/state.js            — Estado reativo com subscribe/notify + localStorage
js/ui.js               — Renderização da UI (tabelas, badges, drawers, filtros, busca)
js/app.js              — Orquestrador principal (navegação, refresh, modais, eventos)
roadmap.md             — Visão de produto e fases de evolução
technical-refinement.md— Análise técnica, gaps de segurança e recomendações
AGENTS.md              — Guia para agentes de código (este repositório)
```

## Como rodar

Não há build step, npm ou bundler. Abra diretamente ou sirva via HTTP:

```bash
# Abrir diretamente no navegador
start index.html

# Ou servir via HTTP (recomendado para evitar problemas de CORS/fetch)
npx serve .

# Ou com Python
python -m http.server 8080
```

## Redes e protocolos suportados

| Rede | Símbolo | Explorer |
|------|---------|----------|
| Ethereum | ETH | etherscan.io |
| Base | ETH | basescan.org |
| Arbitrum | ETH | arbiscan.io |
| Polygon | MATIC | polygonscan.com |
| BSC | BNB | bscscan.com |
| Solana | SOL | solscan.io |

Protocolos: Uniswap V3, Uniswap V4 (dados limitados), Orca, Raydium.

**Observação:** o Wallet Tracker (RPC on-chain) lê posições Uniswap V3 apenas em cadeias EVM. Solana não é coberta por RPC — apenas via indexadores externos (app.orca.so, app.raydium.io).

## Fontes de dados (prioridade)

1. **DeFi Llama Yields** — primário (TVL, APR, volume)
2. **GeckoTerminal** — busca de pools por token/par
3. **RPC públicos** — leitura de posições on-chain Uniswap V3 (EVM)

## Configuração

Tudo está em `js/config.js`. Não é preciso tocar nos outros módulos para mudar redes ou protocolos.

- `CONFIG.NETWORKS` — adicionar, remover ou editar redes
- `CONFIG.PROTOCOLS` — adicionar, remover protocolos e quais redes cada um suporta
- `CONFIG.SCORING` — pesos por perfil (conservador/agressivo)
- `CONFIG.RANGES` — ranges sugeridos por tipo de par (stable / correlated / volatile)
- `CONFIG.POOL_COLUMNS` / `CONFIG.POSITION_COLUMNS` — colunas das tabelas e visibilidade padrão
- `CONFIG.VIEW_PRESETS` — presets de visualização (conservador, agressivo, custom)
- `CONFIG.REFRESH_INTERVALS` — intervalos de auto-refresh (15s, 30s, 60s, 5min, manual)

## Roadmap

| Fase | Status | Foco |
|------|--------|------|
| Fase 0: Fundação | ✅ Concluída | Dashboard funcional, scoring, wallet tracker, filtros, persistência, tema dark/light |
| Fase 1: Segurança + Testes | 🔴 Prioridade máxima | Corrigir XSS, CSP, validar URLs, testes Vitest, acessibilidade mínima |
| Fase 2: Confiabilidade de Dados | 🟡 Alta | CoinGecko OHLCV, fallback GeckoTerminal, preços USD reais |
| Fase 3: Solana + Uniswap V4 | ⚪ Planejado | Cobertura completa dos 4 protocolos |
| Fase 4: Performance + UX | ⚪ Planejado | Paginação, renderização incremental, mobile, atalhos de teclado |

## Limitações conhecidas

- Sem testes automatizados
- Solana: posições LP só via indexadores externos; RPC não suporta
- Preços USD por token indisponíveis via DeFi Llama (preço fica `null`)
- Fees não coletadas; IL (Impermanent Loss) indisponível sem preço de entrada
- Máximo de 50 posições por carteira por chamada RPC
- Uniswap V4: dados limitados, podem aparecer sob V3 nos indexadores
- Volatilidade usa mudança diária de APY como proxy (não volatilidade real de preço)

## Segurança

- ✅ `escHtml()` para sanitização de strings em `innerHTML`
- ✅ Rate limiting (300ms), timeout (15s API / 30s RPC), retry com backoff exponencial
- ⚠️ Sem CSP (Content Security Policy)
- ⚠️ `showToast(message)` usa `innerHTML` com mensagem interpolada — vetor XSS potencial
- ⚠️ URLs em `<a href>` não validadas — possível `javascript:`
- ⚠️ Endereços de carteira armazenados em localStorage sem criptografia
- ⚠️ RPCs públicos sem autenticação

## Sobre o AGENTS.md

O `AGENTS.md` é o guia de referência para agentes de código que trabalham neste repositório. Ele já está atualizado com a estrutura atual. Só é preciso editá-lo se houver mudanças estruturais (novas redes, novos protocolos, novos módulos JS ou alteração de arquitetura).
