# Refinamento Técnico — CLP Monitor

> Análise técnica profunda com gaps, riscos e recomendações de melhoria.
> Baseado em revisão completa do código-fonte (junho 2026).
> Padrões de segurança adaptados do projeto AplicativoDeBuscaVagasRemotas.

---

## 1. Arquitetura — Avaliação e Gaps

### 1.1 Padrão IIFE sem Módulos ES

**Status atual:** Todos os módulos (`CONFIG`, `API`, `Scoring`, `State`, `UI`, `App`) usam IIFE com return explícito, criando um namespace global plano.

**Problemas:**
- Sem tree-shaking ou lazy loading — todo código carrega em todas as páginas
- Ordem de carregamento rígida via `<script>` tags em `index.html`
- Sem encapsulamento real — qualquer script pode acessar `CONFIG`, `State`, etc.
- Impossível testar módulos isoladamente (sem mock de globals)

**Recomendação:** Migrar para ES Modules (`<script type="module">`) gradualmente:
```
Fase 1: Converter IIFEs para ES modules exportando funções
Fase 2: Importar apenas o necessário em cada contexto
Fase 3: Adicionar Vitest para testes unitários
```

### 1.2 Renderização Imperativa via innerHTML

**Status atual:** `UI` constrói HTML via template strings e `innerHTML`. Sem VDOM, sem diffing.

**Problemas:**
- **Segurança:** Apesar de `escHtml()`, o padrão de interpolação de strings é intrinsecamente vulnerável a XSS se `escHtml` for esquecido em UM ponto
- **Performance:** Cada re-renderização reconstrói toda a tabela DOM (não há reconciliation)
- **Estado de UI perdido:** Filtros inline, posição de scroll, seleção de texto — tudo se perde ao re-renderizar
- **Memory leaks:** Listeners de clique inline (`onclick="this.parentElement.remove()"`) criam closures que não são limpas

**Recomendação:**
- Curto prazo: Auditar TODOS os `innerHTML +=` para garantir `escHtml()` em dados usuario
- Médio prazo: Implementar renderização incremental (atualizar apenas células modificadas)
- Longo prazo: Avaliar Preact (3KB) para VDOM sem alterar o paradigma fundamental

### 1.3 State Management — Mutação Direta

**Status atual:** `State.set()` aceita dot-path e muta o objeto diretamente. `applyPoolFilters()` muta `state.monitor.filteredPools` direto em vez de usar `set()`.

**Problemas:**
- `filtered` é atribuído diretamente (`state.monitor.filteredPools = filtered`) sem notificação via `notify()`, exceto a chamada manual subsequente
- Não há immutability — objetos de pool são passados por referência, e `scorePool` retorna `{...pool, ...scores}` criando cópias parciais
- `filters` interna coluna (`_colFeeTier`, `_colRisk`, `_colSource`) é mutada diretamente no objeto `filters`

**Recomendação:**
- Garantir que TODA mutação de estado passe por `State.set()` com `notify()`
- Congelar objetos de config com `Object.freeze(CONFIG)` para prevenir mutação acidental
- Adicionar `immer` ou padrão spread para immutable updates

---

## 2. Segurança — Análise Detalhada

> Princípio adaptado do AplicativoDeBuscaVagasRemotas: **"Supõe-se que cada camada será comprometida. Projete como se o client-side já estivesse invadido."**

### 2.1 XSS — Cross-Site Scripting (🔴 Crítico)

**Vetores identificados:**

| # | Local | Risco | Status |
|---|-------|-------|--------|
| X1 | `showToast(message)` — `innerHTML` com `message` interpolado | **ALTO** — mensagens de erro de API podem conter HTML | ⚠️ Não sanitizado |
| X2 | `renderPoolCell` → `pool.pair` — usa `escHtml()` | Controlado | ✅ |
| X3 | `renderPositionCell` → `pos.pair` — usa `escHtml()` | Controlado | ✅ |
| X4 | Template strings de badge — dados de config (hardcoded) | Baixo | ✅ |
| X5 | URLs em `<a href="${url}">` — `javascript:` URI possível | Médio | ⚠️ Não validado |
| X6 | Inline handler `onclick="this.parentElement.remove()"` | Médio — CSP impossível | ⚠️ |

**Ação imediata (X1):**
```javascript
// ANTES (vulnerável)
toast.innerHTML = `...<span class="toast-message">${message}</span>...`;

// DEPOIS (seguro)
const msgSpan = toast.querySelector('.toast-message');
if (msgSpan) msgSpan.textContent = message;
```

**Ação imediata (X5):**
```javascript
function safeUrl(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return '#';
    return url;
  } catch { return '#'; }
}
```

### 2.2 Exposição de Dados no Client

**Problemas:**
- Endereços de carteira armazenados em localStorage sem criptografia
- `rawData` do DeFi Llama preservado em cada pool (dados potencialmente sensíveis de endereços de contrato)
- Estado completo serializado em localStorage — pode ser lido por qualquer script na mesma origem

**Recomendação:**
- Não armazenar `rawData` no estado — remover após normalização
- Avaliar `crypto.subtle.encrypt()` para dados de carteira no localStorage
- Adicionar CSP header para limitar escopo de scripts

### 2.3 RPCs Públicos — Interceptação de Tráfego

**Problema:** Todas as chamadas RPC são via HTTP (não HTTPS) em alguns endpoints, e dados de carteira trafegam sem proteção adicional.

**Recomendação:**
- Verificar que TODOS os RPCs usam HTTPS (já está, mas confirmar)
- Adicionar warning na UI quando comunicando com RPCs não-HTTPS
- Implementar fallback de RPCs com validação de certificado

### 2.4 Content Security Policy (🟡 Importante)

**Status atual:** Nenhuma CSP definida. `index.html` carrega fonts do Google via `@import`, scripts inline.

**Recomendação mínima:**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src https://fonts.gstatic.com; 
               connect-src https://yields.llama.fi https://api.geckoterminal.com https://*.llamarpc.com https://arb1.arbitrum.io https://polygon-rpc.com https://mainnet.base.org https://bsc-dataseed.binance.org; 
               img-src 'self' data:;">
```

**Nota:** CSP completa requer remoção de `onclick` inline e `unsafe-inline` em scripts — isso é uma migração maior.

### 2.5 Rate Limiting — Proteção contra Abuso de API

**Status atual:** `REQUEST_DELAY` de 300ms entre chamadas. `MAX_RETRIES` = 2.

**Adaptado do AplicativoDeBuscaVagasRemotas:**
- Adicionar rate limit por usuário (endpoint) — mesmo que client-side, desencoraja abuso acidental
- Limite total de chamadas RPC por sessão (proteger contra loops infinitos em `fetchWalletPositions`)
- Backoff exponential caps em 5s para evitar acúmulo

---

## 3. Motor de Scoring — Gaps e Melhorias

### 3.1 Scoring com Dados Insuficientes

**Problema:** `scorePool()` opera com percentile ranking entre os pools carregados. Se poucos pools retornam, o ranking é distorcido.

**Exemplo:** Se apenas 5 pools carregam (API instável), o pool de TVL mais alto recebe `percentile = 1.0` mesmo que seja $10K — um TVL baixo em termos absolutos.

**Recomendação:**
- Normalização absoluta vs. relativa: usar `normalize()` com thresholds absolutos já definidos (TVL ≥ $1M = bom, ≥ $10M = excelente)
- Fallback para valores hardcoded quando o dataset tem < 20 pools
- Ajustar peso de `dataQuality.overall` no score final

### 3.2 Volatilidade como Proxy

**Problema:** `volatility = Math.abs(apyPct1D)` — isso mede a mudança de APY em 24h, não a volatilidade real de preço do ativo. É um proxy fraco.

**Impacto:**
- `calculateRange()` ajusta largura de range baseado em um valor que não reflete risco real
- `rangeExitProb` é calculado com esse proxy e pode ser enganoso
- `simplifiedTA()` deriva suporte/resistência do mesmo valor

**Recomendação:**
- Curto prazo: Rotular claramente como "APY Volatility" na UI e não "Price Volatility"
- Médio prazo: Integrar CoinGecko OHLCV para volatilidade real de preço
- Longo prazo: Calcular volatilidade realizada (rolling 7d/30d) para range suggestions

### 3.3 Solana — Gap Crítico de Dados

**Problema:** Posições Solana (Orca/Raydium) não são rastreáveis diretamente via RPC publics. O app mostra apenas limitações.

**Recomendação:**
- Integrar API do Orca (`https://api.orca.so`) ou SDK `@orca-so/whirlpools`
- Integrar Raydium SDK para posições de concentração
- Como fallback: abrir iframe ou link direto para app.orca.so / app.raydium.io

### 3.4 ScorePool Mutação

**Problema:** `scorePool` retorna `{...pool, score, risk, ...}` — cria um NOVO objeto para cada pool a cada re-scoring. Isso funciona, mas `scoreAllPools` é chamado frequentemente (mudança de perfil, re-fetch) e cria muitos objetos temporários.

**Recomendação:** Manter pools originais imutáveis e scores em estrutura separada (`Map<poolId, score>`).

---

## 4. UI/UX — Melhorias Prioritárias

### 4.1 Performance de Renderização

**Problema:** `renderPoolMonitor()` reconstrói toda a tabela HTML (~200 pools × ~12 colunas = ~2400 células) a cada mudança de filtro ou sort.

**Recomendação:**
- Implementar paginação (25/50/100 por página)
- Virtual scrolling para grandes datasets (usar `IntersectionObserver`)
- Debounce mais agressivo em filtros numéricos (300ms → 500ms)

### 4.2 Acessibilidade

**Problemas identificados:**
- Sem `aria-label` em botões de ícone
- Sem `role="table"` ou `scope` nas tabelas de dados
- Sem navegação por teclado no drawer de detalhes
- Sem `alt` text em SVGs inline
- Sem `aria-live` para toasts e atualizações de status

**Recomendação mínima:**
- Adicionar `role="alert"` no toast container com `aria-live="polite"`
- Adicionar `aria-label` em todos os botões sem texto
- Tabelas com `<caption>` e `scope="col"` nos headers
- Drawer com focus trap e `Escape` para fechar

### 4.3 Responsividade

**Problema:** CSS tem sidebar fixa de 260px + max-width de 1600px. Sem breakpoints adaptados.

**Recomendação:**
- Adicionar breakpoint para mobile (< 768px): tabela vira cards
- Sidebar colapsa automaticamente em telas menores
- Tabela com scroll horizontal em vez de truncar colunas

---

## 5. Qualidade de Código

### 5.1 Falta de Testes

**Status:** Zero testes automatizados. Zero framework de testes.

**Recomendação (prioridade):**
1. `Vitest` + `happy-dom` para testes unitários de módulos puros
2. Testes prioritários:
   - `Scoring.scorePool()` — validar scores com fixtures
   - `Scoring.calculateRange()` — validar ranges por tipo de par
   - `Scoring.getPairType()` — validar classificação stable/correlated/volatile
   - `API.normalizeLlamaPool()` — validar normalização de dados
   - `API.decodePositionsResult()` — validar parsing ABI
   - `State.applyPoolFilters()` — validar lógica de filtros
3. Playwright para testes E2E (já tem `.playwright-cli/`)

### 5.2 Tratamento de Erros

**Gaps:**
- `fetchWithRetry` não distingue errores de rede vs. errores de API (404, 429, 500)
- Errores de RPC em `fetchWalletPositions` são engolidos com `catch(e) {/* pool query failed */}`
- Não há retry em chamadas de token symbol (`getTokenSymbol`) — falha silenciosa

**Recomendação:**
- Classificar errores: `NetworkError`, `APIError`, `RPCError` com códigos
- Adicionar retry em `getTokenSymbol` com cache de falhas
- Log estructurado em vez de `console.error` disperso

### 5.3 CSS — Tamanho e Organização

**Status:** `styles.css` tem ~4800 linhas em um único arquivo.

**Recomendação:**
- Dividir em módulos: `base.css`, `layout.css`, `components.css`, `tables.css`, `themes.css`
- Ou adotar CSS Modules se migrar para bundler

---

## 6. Ciclo de Melhoria — Red Team Próprio

> Adaptado do AplicativoDeBuscaVagasRemotas: "Após gerar código, auto-atacar o próprio código em busca de falhas lógicas."

### Cenários de Ataque para CLP Monitor

| # | Cenário | Impacto | Mitigação |
|---|---------|---------|-----------|
| A1 | XSS via toast com mensagem de API contendo HTML | Execução de script na origem do app | Sanitizar `message` em `showToast()` |
| A2 | Item de busca malicioso com `javascript:` no URL | Navegação para script URI | Validar protocol em URLs |
| A3 | Sobrecarga de API por loop de refresh rápido | Rate limiting pelo servidor | Cooldown de 5s entre refreshs manuais |
| A4 | Injeção de pool falso via `addCustomPool` | Dados falsos no dashboard | Validar dados antes de adicionar |
| A5 | Manipulação de localStorage para injetar filters | UI corrompida | Validar schema ao carregar |
| A6 | RPC poisoning via DNS spoofing | Dados de posição falsos | Validar checksums de endereços |
| A7 | DOM clobbering via IDs de pool maliciosos | Seletor DOM retorna elemento errado | Usar `data-` attributes para IDs |

---

## 7. Priorização de Refinamento

| Prioridade | Item | Impacto | Esforço |
|-----------|------|---------|---------|
| 🔴 P0 | Sanitizar showToast (X1) | Segurança | 30min |
| 🔴 P0 | Validar URLs em links (X5) | Segurança | 1h |
| 🔴 P0 | Remover onclick inline (X6) | Segurança + CSP | 2h |
| 🟡 P1 | Adicionar testes unitários (5.1) | Confiabilidade | 3d |
| 🟡 P1 | CSP header mínima (2.4) | Segurança | 2h |
| 🟡 P1 | Paginação na tabela (4.1) | Performance | 4h |
| 🟡 P1 | Acessibilidade básica (4.2) | Inclusão | 8h |
| 🟢 P2 | Migrar para ES Modules (1.1) | Manutenibilidade | 3d |
| 🟢 P2 | Normalização absoluta de scoring (3.1) | Precisão | 4h |
| 🟢 P2 | Volatilidade real de preço (3.2) | Precisão | 1d |
| 🟢 P2 | Integração Solana (3.3) | Funcionalidade | 3d |
| 🔵 P3 | Renderização incremental (1.2) | Performance | 5d |
| 🔵 P3 | Criptografia localStorage (2.2) | Segurança | 1d |
| 🔵 P3 | Responsividade mobile (4.3) | Usabilidade | 3d |
