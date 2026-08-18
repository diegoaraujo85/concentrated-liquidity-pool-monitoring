# Roadmap — CLP Monitor

> Visão de produto e fases de evolução. Detalhes técnicos em `technical-refinement.md`.
> Última atualização: junho 2026

## Visão

Tornar o CLP Monitor a ferramenta de referência para provedores de liquidez concentrada que precisam **monitorar, avaliar e gerenciar** posições em múltiplos protocolos DeFi — com dados confiáveis, análise de risco clara e recomendações acionáveis.

## Estado Atual (Junho 2026)

- **Frontend-only:** HTML + CSS + JS vanilla, zero dependências, zero build step
- **Dados primários:** DeFi Llama (TVL, APR, volume) — fonte única sem fallback para preços
- **Busca:** GeckoTerminal (pools, busca por tokens/pares)
- **Carteiras:** RPC público (Uniswap V3 Posições Manager) — apenas EVM chains, sem Solana
- **Scoring:** Motor próprio com perfis conservador/agressivo, análise de range simplificada
- **UI:** Dashboard dark/light theme, tabelas com filtros inline, drawer de detalhes
- **Persistência:** localStorage (preferências, carteiras, filtros)
- **Testes:** Inexistentes
- **Segurança:** Sanitização HTML parcial, sem CSP, sem validação de URLs

---

## Fase 0: Fundação ✅ CONCLUÍDA

**Objetivo:** Dashboard funcional com dados de múltiplas redes e protocolos.

**Entregue:**
- ✅ Arquitetura modular (config → api → scoring → state → ui → app)
- ✅ Integração DeFi Llama (6 redes, 4 protocolos)
- ✅ Scoring com perfis (conservador/agressivo), análise de range, risk assessment
- ✅ Wallet Tracker com RPC on-chain (Uniswap V3)
- ✅ Sistema de filtros inline, busca, ordenação
- ✅ Persistência em localStorage
- ✅ Dark/light theme
- ✅ Toast notifications, drawer de detalhes, progress bar
- ✅ Data quality tracking

---

## Fase 1: Seguridad + Testes 🔴 PRIORIDADE MÁXIMA

**Objetivo:** Eliminar vulnerabilidades XSS, adicionar CSP e criar suite de testes.

**Entregáveis:**

| # | Item | Tipo | Esforço |
|---|------|------|---------|
| 1.1 | Sanitizar `showToast()` — XSS em mensagens de API | Bug segurança | 30min |
| 1.2 | Validar URLs em `<a href>` — prevenir `javascript:` | Bug segurança | 1h |
| 1.3 | Remover `onclick` inline — habilitar CSP sem `unsafe-inline` | Bug segurança | 2h |
| 1.4 | Adicionar meta tag CSP mínima | Segurança | 2h |
| 1.5 | Adicionar `rel="noopener noreferrer"` em todos os links externos | Segurança | 30min |
| 1.6 | Implementar suite de testes com Vitest: Scoring, API normalize, State filters | Testes | 3d |
| 1.7 | Validar schema ao carregar do localStorage (prevenir injeção) | Segurança | 2h |
| 1.8 | Congelar `CONFIG` com `Object.freeze()` | Robustez | 30min |
| 1.9 | Adicionar `aria-label`, `role`, `scope` e `aria-live` (acessibilidade mínima) | Acessibilidade | 1d |

**Meta:** Zero vulnerabilidades XSS conhecidas; 100% dos módulos de lógica com testes

---

## Fase 2: Confiabilidade de Dados 🟡 ALTA PRIORIDADE

**Objetivo:** Reduzir dependência de fonte única, melhorar precisão de scoring e adicionr preço real.

**Entregáveis:**

| # | Item | Tipo | Depende de |
|---|------|------|------------|
| 2.1 | Integrar CoinGecko OHLCV para volatilidade real de preço | Dados | — |
| 2.2 | Normalização absoluta de scoring (thresholds por TVL, volume) | Scoring | — |
| 2.3 | Fallback de dados: GeckoTerminal como fonte secundária para TVL/preço | Dados | — |
| 2.4 | Cache de preços de tokens (ETH, BTC, SOL, stablecoins) via CoinGecko | Dados | 2.1 |
| 2.5 | Preencher `valueInvested`, `valueCurrent`, `feesAccumulated` com USD reais | Funcionalidade | 2.4 |
| 2.6 | Label "APY Volatility" em vez de "Volatility" na UI | UX | — |
| 2.7 | Health check periódico das APIs (alertar quando fonte cai) | Monitoramento | — |
| 2.8 | Retry em `getTokenSymbol` com cache de falhas | Robustez | — |

**Meta:** Precisão de scoring ≥ 80% (auto-avaliação); USD values disponíveis para 90%+ das posições EVM

---

## Fase 3: Funcionalidade — Solana + Uniswap V4

**Objetivo:** Cobertura completa dos 4 protocolos declarados, incluindo Solana.

**Entregáveis:**

| # | Item | Tipo | Depende de |
|---|------|------|------------|
| 3.1 | Integração Orca: SDK `@orca-so/whirlpools` ou API app.orca.so | Funcionalidade | — |
| 3.2 | Integração Raydium: SDK ou API para CLMM positions | Funcionalidade | — |
| 3.3 | Detecção automática de posições Solana via wallet adapter | Funcionalidade | 3.1 ou 3.2 |
| 3.4 | Suporte a Uniswap V4 Position Manager (endereço diferente de V3) | Funcionalidade | RPC V4 address |
| 3.5 | Scoring de posições Solana (adaptação do motor para tick/sqrtPrice) | Scoring | 3.1 ou 3.2 |
| 3.6 | Fallback: link direto para app.orca.so / app.raydium.io quando dados não disponíveis | UX | — |

**Meta:** Cobertura de 4/4 protocolos com dados de posição; ≥ 70% das features do tracker funcionando em Solana

---

## Fase 4: Performance + UX

**Objetivo:** Escalar para centenas de pools sem degradação e melhorar experiência mobile.

**Entregáveis:**

| # | Item | Tipo |
|---|------|------|
| 4.1 | Paginação na tabela (25/50/100 por página) | Performance |
| 4.2 | Renderização incremental (diff de células, não innerHTML completo) | Performance |
| 4.3 | Debounce de 500ms em filtros numéricos | UX |
| 4.4 | Skeleton loader durante re-renderização | UX |
| 4.5 | Breakpoints para mobile (< 768px): cards em vez de tabela | Responsividade |
| 4.6 | Sidebar colapsa automaticamente em telas < 1024px | Responsividade |
| 4.7 | Focus trap e Escape para fechar drawer | Acessibilidade |
| 4.8 | Atalhos de teclado (Ctrl+R refresh, Ctrl+F busca, Escape fecha modais) | UX |

**Meta:** Tempo de renderização < 100ms para 500 pools; Lighthouse Performance ≥ 90

---

## Fase 5: Modernização do Build

**Objetivo:** Adotar tooling moderno sem perder simplicidade.

**Entregáveis:**

| # | Item | Tipo |
|---|------|------|
| 5.1 | Migrar IIFEs para ES Modules (`<script type="module">`) | Arquitetura |
| 5.2 | Adicionar Vite como dev server + bundler | Tooling |
| 5.3 | CSS Modules ou Tailwind (avaliar!) — eliminar 4800 linhas monolíticas | CSS |
| 5.4 | TypeScript (渐进): adicionar JSDoc com tipos `@typedef`, depois migrar para `.ts` | Tipagem |
| 5.5 | E2E tests com Playwright | Testes |
| 5.6 | CI/CD: GitHub Actions com lint + test + deploy Pages | DevOps |

**Meta:** Build time < 2s; Bundle < 50KB gzipped; 100% dos módulos com tipos

---

## Fase 6: Análise Avançada

**Objetivo:** Ir além do monitoramento — oferecer insights acionáveis para o LP.

**Entregáveis:**

| # | Item | Tipo |
|---|------|------|
| 6.1 | Backtesting de ranges: simular PnL em ranges sugeridos vs. dados históricos | Análise |
| 6.2 | Impermanent Loss calculator com dados de preço históricos | Análise |
| 6.3 | Alertas de posição: notificação quando posição sai do range (browser Notification API) | UX |
| 6.4 | Comparação de pools: side-by-side de 2-4 pools com métricas chave | Análise |
| 6.5 | Gráficos: TVL ao longo do tempo, volume 7d, APR histórico | Visualização |
| 6.6 | Correlação de ativos: detectar pares correlacionados para range tightening | Análise |
| 6.7 | Simulador de posição: input de range/capital → estimativa de fees | Ferramenta |

**Meta:** Utilizador consegue tomar decisão informada de abrir/fechar posição sem sair do dashboard

---

## Fase 7: Multi-usuário + Backend (Opcional)

**Objetivo:** Persistência em nuvem, alertas assíncronos e compartilhamento.

**Entregáveis:**

| # | Item | Depende de |
|---|------|------------|
| 7.1 | Backend Express + Prisma + Supabase (adaptado de AplicativoDeBuscaVagasRemotas) | — |
| 7.2 | Auth Social (Google OAuth, wallet connect) | 7.1 |
| 7.3 | Persistência de carteiras e preferências em nuvem | 7.2 |
| 7.4 | Alertas assíncronos: email/push quando posição sai do range | 7.1 + Notification service |
| 7.5 | Compartilhamento de configurações de scoring entre dispositivos | 7.2 |
| 7.6 | Rate limiting tiered (adaptado de AplicativoDeBuscaVagasRemotas: 60/120/300 por plano) | 7.1 |
| 7.7 | RLS no Supabase (princípio de segurança: "nunca confie no frontend") | 7.2 |

**Nota:** Este projeto foi criado como client-only. O backend é opcional e deve seguir os padrões de segurança documentados no AplicativoDeBuscaVagasRemotas (`SECURITY.md`): defesa em profundidade, RLS, anti-enumeration, rate limiting por IP.

---

## Métricas de Sucesso

| Fase | Métrica-Chave | Meta |
|------|---------------|------|
| 0 | Funcionalidade básica | 4 protocolos, 6 redes ✅ |
| 1 | Zero XSS + testes | 0 vulnerabilidades; ≥80% cobertura de lógica |
| 2 | Precisão de dados | USD values para 90%+ das posições EVM |
| 3 | Cobertura de protocolos | 4/4 com dados de posição |
| 4 | Performance | < 100ms render para 500 pools |
| 5 | Build moderno | < 2s build time; < 50KB gzip |
| 6 | Valor analítico | Backtesting + IL calculator funcionais |
| 7 | Multi-usuário | Auth + persistência em nuvem |

---

## Ordem de Implementação Recomendada

```
1. Fase 1 (1.1-1.5): Correções de segurança XSS — bloqueia deploy em produção
2. Fase 1 (1.6-1.9): Testes + acessibilidade — fundação para evolução segura
3. Fase 2 (2.6, 2.7, 2.8): Quick wins de UX e robustez
4. Fase 2 (2.1-2.5): Melhoria de dados e scoring — valor imediato para utilizador
5. Fase 4 (4.1, 4.3): Paginação + debounce — necessário se base de pools cresce
6. Fase 3 (3.1-3.6): Solana + V4 — funcionalidade mais pedida, maior esforço
7. Fase 4 (4.5-4.8): UX mobile + acessibilidade + atalhos
8. Fase 5 (5.1-5.6): Modernização do build — habilita futura colaboração
9. Fase 6 (6.1-6.7): Análise avançada — diferencial competitivo
10. Fase 7 (7.1-7.7): Backend + multi-usuário — escalar para produto
```

---

## Dependências entre Fases

```
Fase 0 ✅
  ↓
Fase 1 (segurança + testes)  ← BLOQUEANTE para deploy
  ↓
Fase 2 (dados + scoring)  ← Depende de testes para refatoração segura
  ↓
Fase 3 (Solana + V4)  ← Depende de scoring melhorado (Fase 2)
  ↓
Fase 4 (performance + UX)  ← Pode começar em paralelo com Fase 3
  ↓
Fase 5 (build moderno)  ← Depende de Fase 4 (renderização incremental)
  ↓
Fase 6 (análise avançada)  ← Depende de dados históricos (Fase 2) e build (Fase 5)
  ↓
Fase 7 (backend)  ← Opcional, pode seguir padrões do AplicativoDeBuscaVagasRemotas
```

---

*Em caso de conflito entre praticidade e segurança, escolha segurança — o custo de um exploit supersede o atraso de entrega.* (Adaptado de AplicativoDeBuscaVagasRemotas SECURITY.md)
