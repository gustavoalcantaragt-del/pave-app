// dashboard-premium.js

// ── THEME HELPERS ────────────────────────────────────────────────────────────
function _isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
function _chartGrid() { return _isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'; }
function _chartTick() { return _isDark() ? '#94a3b8' : '#6b7280'; }
function _rowBg()     { return _isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'; }
function _statBg()    { return _isDark() ? 'rgba(255,255,255,0.04)' : 'var(--bg-elevated)'; }
function _statBor()   { return _isDark() ? '1px solid rgba(255,255,255,0.07)' : '1px solid var(--border)'; }

// ── ÍCONES SVG (Lucide-style, monochrome) ───────────────────────────────────
const IC = {
    revenue:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    profit:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    fixed:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    variable: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 16 6-6 4 4 4-4 6 6"/><path d="M22 12V8h-4"/></svg>`,
    calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    check:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    xmark:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    alert:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    target:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    arrowUp:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
    arrowDn:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
    bell:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    layers:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
};

// ── ZERO DATA (exibido quando não há balanço consolidado) ───────────────────
const ZERO_DATA = {
    faturamento: 0, lucroGerencial: 0, totalFixos: 0,
    totalVariaveis: 0, margemContribuicao: 0
};

let _dashboardDebounce = null;

// ── SELETOR DE PERÍODO ──────────────────────────────────────────────────────
function _togglePeriodPicker() {
    const existing = document.getElementById('period-picker-panel');
    if (existing) { existing.remove(); return; }

    let historico = [];
    try { historico = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch {}

    if (historico.length === 0) return;

    const atual = (() => { try { return (JSON.parse(localStorage.getItem('pav_ultimos_dados'))?.mesReferencia || '').substring(0, 7); } catch { return ''; } })();

    // Deduplicar por YYYY-MM — caso existam entradas com formato misto (YYYY-MM-DD vs YYYY-MM)
    const seen = new Set();
    const deduped = [...historico].reverse().filter(h => {
        const key = (h.mesRef || h.mesReferencia || '').substring(0, 7);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const items = deduped.map(h => {
        const key = (h.mesRef || h.mesReferencia || '').substring(0, 7);
        const [y, m] = key.split('-');
        const label = window.formatPeriod ? window.formatPeriod(key) : (m && y ? `${m}/${y}` : key);
        const isAtual = key === atual;
        return `<button class="period-picker-item${isAtual ? ' active' : ''}" data-ref="${key}">${label}</button>`;
    }).join('');

    const panel = document.createElement('div');
    panel.id = 'period-picker-panel';
    panel.className = 'period-picker-panel';
    panel.innerHTML = `<div class="period-picker-header">Selecionar período</div>${items}`;
    document.body.appendChild(panel);

    panel.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-ref]');
        if (!btn) return;
        const ref = btn.dataset.ref; // formato YYYY-MM-DD ou YYYY-MM
        panel.remove();

        // Busca dados completos do Supabase para o período selecionado
        try {
            const orgId = await OrgAPI.getOrgId();
            if (orgId) {
                const refDate = ref.length === 7 ? ref + '-01' : ref;
                const yyyyMM  = refDate.substring(0, 7);
                const [_y, _m] = yyyyMM.split('-').map(Number);
                const nextMonth = _m === 12 ? `${_y + 1}-01-01` : `${_y}-${String(_m + 1).padStart(2, '0')}-01`;
                const { data: entries } = await _supabase
                    .from('financial_entries')
                    .select('reference_date, data')
                    .eq('organization_id', orgId)
                    .gte('reference_date', yyyyMM + '-01')
                    .lt('reference_date', nextMonth)
                    .order('reference_date', { ascending: false })
                    .limit(1);

                if (entries && entries.length > 0 && entries[0].data) {
                    localStorage.setItem('pav_ultimos_dados', JSON.stringify(entries[0].data));
                    if (window.renderDashboard) window.renderDashboard();
                    return;
                }
            }
        } catch {}

        // Fallback: restaura snapshot local do período selecionado, se disponível
        try {
            const hist = JSON.parse(localStorage.getItem('pav_historico') || '[]');
            const entry = hist.find(h => (h.mesRef || '').substring(0, 7) === ref.substring(0, 7));
            if (entry?.snapshot) localStorage.setItem('pav_ultimos_dados', JSON.stringify(entry.snapshot));
        } catch {}
        if (window.renderDashboard) window.renderDashboard();
    });

    const close = (ev) => {
        if (!panel.contains(ev.target) && ev.target?.id !== 'period-picker-trigger') {
            panel.remove();
            document.removeEventListener('click', close);
        }
    };
    setTimeout(() => document.addEventListener('click', close), 80);
}

function _renderDashboardImpl(forceData) {
    const statsContainer  = document.getElementById('dashboard-stats');
    const chartsContainer = document.getElementById('dashboard-charts');
    if (!statsContainer || !chartsContainer) return;

    let data;
    try { data = forceData || JSON.parse(localStorage.getItem('pav_ultimos_dados')); }
    catch(e) { console.error('[Dashboard] localStorage corrompido:', e); data = null; }

    const hasData   = !!data;
    const fromCaixa = data?._fromCaixa === true;
    const totais    = hasData
        ? (fromCaixa
            ? {
                faturamento:        data.faturamento,
                totalFixos:         data._totalCosts,
                totalVariaveis:     0,
                margemContribuicao: data.faturamento - data._totalCosts,
                lucroGerencial:     data.faturamento - data._totalCosts
              }
            : (window.calcularTotais ? window.calcularTotais(data) : ZERO_DATA))
        : ZERO_DATA;

    const fat       = hasData && totais.faturamento > 0 ? totais.faturamento : 0;
    const pctFix    = fat > 0 ? ((totais.totalFixos / fat) * 100).toFixed(1) : '0.0';
    const margemPct = fat > 0 ? totais.margemContribuicao / fat : 0;
    const lucroPct  = fat > 0 ? ((totais.lucroGerencial / fat) * 100).toFixed(1) : '0.0';
    const pe        = margemPct > 0 ? (totais.totalFixos / margemPct).toFixed(2) : 0;
    const metaLucro = data?.metaLucro || 0;
    const metaFat   = data?.metaFaturamento || 0;
    const qtdAtend  = Math.round(parseFloat(data?.qtdAtendimentos) || 0);
    const ticketMed = qtdAtend > 0 ? (totais.faturamento / qtdAtend) : 0;

    // ── PERÍODO ──────────────────────────────────────────────────────────────
    let dataLabel = window.formatPeriod
        ? window.formatPeriod(data?.mesReferencia || '')
        : (data?.mesReferencia || '');
    const chipContainer = document.getElementById('period-chip-container');
    if (chipContainer) {
        chipContainer.innerHTML = dataLabel
            ? `<button class="period-chip period-chip-btn" id="period-picker-trigger" title="Selecionar período">${IC.calendar} ${dataLabel} ▾</button>`
            : '';
        const trigger = document.getElementById('period-picker-trigger');
        if (trigger && !trigger.dataset.wired) {
            trigger.dataset.wired = '1';
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                _togglePeriodPicker();
            });
        }
    }

    // ── YTD ──────────────────────────────────────────────────────────────────
    let historicoAll; try { historicoAll = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch { historicoAll = []; }
    historicoAll = [...historicoAll].sort((a, b) => (a.mesRef || '').localeCompare(b.mesRef || ''));
    const currentYear        = new Date().getFullYear().toString();
    const anoAtual           = historicoAll.filter(h => h.mesRef?.startsWith(currentYear));
    const ytdLucro           = anoAtual.reduce((a, h) => a + (parseFloat(h.lucro) || 0), 0);
    const ytdEl              = document.getElementById('ytd-valor');
    const ytdContainer       = document.getElementById('ytd-container');
    if (ytdEl && ytdContainer) {
        if (historicoAll.length > 0) {
            ytdContainer.style.display = 'block';
            ytdEl.style.color = ytdLucro >= 0 ? '#1D9E75' : '#E24B4A';
            ytdEl.innerText = `R$ ${ytdLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        } else {
            ytdContainer.style.display = 'none';
        }
    }

    // ── DELTA vs MÊS ANTERIOR ────────────────────────────────────────────────
    const idxAtual = data ? historicoAll.findIndex(h => h.mesRef === data.mesReferencia) : -1;
    const anterior = idxAtual > 0
        ? historicoAll[idxAtual - 1]
        : (historicoAll.length > 0 && idxAtual === -1 ? historicoAll[historicoAll.length - 1] : null);

    const calcDelta = (atual, prev) => {
        if (prev === null || prev === undefined || !isFinite(prev)) return null;
        if (prev === 0) return atual > 0 ? null : null; // sem base → sem delta
        return ((atual - prev) / Math.abs(prev)) * 100;
    };

    const deltaHTML = (pct, inverter = false) => {
        if (pct === null || !hasData) return '';
        const positivo = inverter ? pct < 0 : pct > 0;
        const cor      = positivo ? '#1D9E75' : '#E24B4A';
        const icon     = pct > 0 ? IC.arrowUp : IC.arrowDn;
        return `<span style="display:inline-flex; align-items:center; gap:3px; font-size:0.72rem; font-weight:700; color:${cor}; margin-left:8px;">${icon} ${Math.abs(pct).toFixed(1)}%</span>`;
    };

    let totAnt = {};
    if (anterior && window.calcularTotais) totAnt = window.calcularTotais(anterior);

    const dFat   = anterior ? calcDelta(totais.faturamento,    anterior.faturamento || 0) : null;
    const dLucro = anterior ? calcDelta(totais.lucroGerencial, anterior.lucro || 0)        : null;
    const dFix   = anterior ? calcDelta(totais.totalFixos,     totAnt.totalFixos || 0)     : null;
    const dVar   = anterior ? calcDelta(totais.totalVariaveis, totAnt.totalVariaveis || 0) : null;

    // ── INFO BANNER (sem dados) ───────────────────────────────────────────────
    const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    const infoBanner = !hasData
        ? `<div style="grid-column:1/-1; padding:1rem 1.5rem; background:rgba(10,132,255,0.06); border:1px solid rgba(10,132,255,0.2); border-radius:var(--radius-card); display:flex; align-items:center; gap:12px; margin-bottom:0.5rem;">
            <span style="color:var(--accent-blue); flex-shrink:0;">${IC.info}</span>
            <span style="font-size:0.875rem; color:var(--text-secondary);">Preencha seu primeiro balanço financeiro para ativar os indicadores.</span>
            <button onclick="document.getElementById('tab-balanco').click()" class="btn-primary" style="margin-left:auto; padding:0.45rem 1rem; font-size:0.8rem; flex-shrink:0;">Ir para Finanças</button>
           </div>`
        : fromCaixa
        ? `<div style="grid-column:1/-1; padding:0.75rem 1.25rem; background:rgba(29,158,117,0.07); border:1px solid rgba(29,158,117,0.25); border-radius:var(--radius-card); display:flex; align-items:center; gap:10px; margin-bottom:0.5rem;">
            <span style="color:#1D9E75; flex-shrink:0;">${IC.check}</span>
            <span style="font-size:0.82rem; color:var(--text-secondary);">Dados calculados automaticamente do <strong>Extrato</strong> — ${data._movCount} lançamentos pagos em ${dataLabel}. Preencha o <button onclick="document.getElementById('tab-balanco').click()" style="background:none;border:none;padding:0;font-size:inherit;color:var(--accent-blue);cursor:pointer;font-weight:700;text-decoration:underline;">Balanço</button> para ver o detalhamento de custos fixos vs variáveis.</span>
           </div>`
        : '';

    // ── KPI CARDS ─────────────────────────────────────────────────────────────
    const ticketIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>`;
    const cards = fromCaixa
        ? [
            { label: 'Receita Operacional', value: totais.faturamento,    color: 'var(--accent-blue)', icon: IC.revenue,  delta: dFat,   inverter: false },
            { label: 'Margem Líquida',      value: totais.lucroGerencial, color: totais.lucroGerencial >= 0 ? '#1D9E75' : '#E24B4A', icon: IC.profit, delta: dLucro, inverter: false },
            { label: 'Custos Totais',       value: data._totalCosts,      color: '#E24B4A',            icon: IC.fixed,    delta: null,   inverter: true,
              sub: 'Fixos + variáveis · detalhe no Balanço' },
            { label: 'Ticket Médio',        value: ticketMed,             color: 'var(--color-info)',  icon: ticketIcon,  delta: null,   inverter: false,
              sub: qtdAtend > 0 ? `${qtdAtend} atendimentos` : 'Sem atendimentos' }
          ]
        : [
            { label: 'Receita Operacional', value: totais.faturamento,    color: 'var(--accent-blue)', icon: IC.revenue,  delta: dFat,   inverter: false },
            { label: 'Margem Líquida',      value: totais.lucroGerencial, color: totais.lucroGerencial >= 0 ? '#1D9E75' : '#E24B4A', icon: IC.profit, delta: dLucro, inverter: false },
            { label: 'Custos Fixos',        value: totais.totalFixos,     color: '#E24B4A',            icon: IC.fixed,    delta: dFix,   inverter: true  },
            { label: 'Custos Variáveis',    value: totais.totalVariaveis, color: 'var(--color-warning)', icon: IC.variable, delta: dVar,   inverter: true  },
            { label: 'Ticket Médio',        value: ticketMed,             color: 'var(--color-info)',  icon: ticketIcon,  delta: null,   inverter: false,
              sub: qtdAtend > 0 ? `${qtdAtend} atendimentos` : 'Sem atendimentos' }
          ];

    statsContainer.innerHTML = infoBanner + cards.map(c => `
        <div class="card stat-card">
            <div class="stat-card-header">
                <span class="stat-card-icon" style="color:${c.color};">${c.icon}</span>
                <span class="stat-card-label">${c.label}</span>
            </div>
            <div class="stat-card-value" style="color:${c.color};">
                ${fmt(c.value)}${deltaHTML(c.delta, c.inverter)}
            </div>
            <div class="stat-card-sub">${c.sub || (dataLabel ? `Ref. ${dataLabel}` : 'Aguardando dados') + (anterior ? ' · vs mês ant.' : '')}</div>
        </div>
    `).join('');

    // ── CHARTS + INDICADORES ──────────────────────────────────────────────────
    const healthScore = parseFloat(pctFix) || 0;
    let healthColor = '#1D9E75', healthLabel = 'Saudável';
    let healthDesc  = fromCaixa
        ? 'Custos totais controlados em relação ao faturamento. Operação sustentável.'
        : 'Estrutura de custos fixos controlada. Operação sustentável.';
    if (healthScore > 35 && healthScore <= 50) {
        healthColor = '#ffd60a'; healthLabel = 'Atenção';
        healthDesc  = fromCaixa
            ? 'Custos totais elevados. Monitore o faturamento para evitar déficits.'
            : 'Custos fixos elevados. Monitore o faturamento para evitar déficits.';
    } else if (healthScore > 50) {
        healthColor = '#E24B4A'; healthLabel = 'Risco Crítico';
        healthDesc  = fromCaixa
            ? 'Mais de 50% do faturamento comprometido com custos totais.'
            : 'Mais de 50% do faturamento comprometido com estrutura fixa.';
    }

    chartsContainer.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:2rem;">

            <!-- Termômetro -->
            <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
                <h3 style="margin-bottom:1.5rem; color:var(--text-secondary); display:flex; align-items:center; gap:6px; justify-content:center;" data-tooltip="${fromCaixa ? 'Percentual do faturamento comprometido com custos totais (extrato de movimentações). Abaixo de 35%: saudável · 35–50%: atenção · Acima de 50%: crítico.' : 'Percentual do faturamento comprometido com custos fixos. Abaixo de 35%: saudável · 35–50%: atenção · Acima de 50%: crítico.'}">${fromCaixa ? 'Índice de Custos Totais' : 'Índice de Custo Fixo'} <span style="opacity:0.6; color:var(--text-muted);">${IC.info}</span></h3>
                <div style="position:relative; width:150px; height:150px; border-radius:50%; background:conic-gradient(${healthColor} ${healthScore}%, ${_isDark()?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)'} 0%); display:flex; align-items:center; justify-content:center;">
                    <div style="width:118px; height:118px; border-radius:50%; background:var(--bg-card); display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <span style="font-size:2rem; font-weight:900; color:${healthColor};">${hasData ? healthScore + '%' : '—'}</span>
                        <span style="font-size:0.6rem; color:var(--text-secondary); text-transform:uppercase; font-weight:700; letter-spacing:1px;">Comprometido</span>
                    </div>
                </div>
                <div style="margin-top:1.25rem;">
                    <span style="display:inline-block; padding:0.35rem 1rem; border-radius:20px; background:rgba(${healthScore>50?'255,69,58':healthScore>35?'255,214,10':'48,209,88'},0.1); color:${healthColor}; font-weight:700; font-size:0.8rem; text-transform:uppercase; letter-spacing:1.5px; border:1px solid ${healthColor}50;">${hasData ? healthLabel : 'Sem dados'}</span>
                    <p style="margin-top:1rem; font-size:0.82rem; color:var(--text-secondary); padding:0 1rem; line-height:1.5;">${hasData ? healthDesc : 'Consolidar balanço para ativar este indicador.'}</p>
                </div>
            </div>

            <!-- Composição de Gastos -->
            <div class="card">
                <h3 style="margin-bottom:1.5rem;">Composição de Custos</h3>
                <canvas id="chart-costs-deep" style="max-height:230px;"></canvas>
            </div>

            <!-- Indicadores Vitais -->
            <div class="card">
                <h3 style="margin-bottom:1.5rem;">Indicadores Vitais</h3>
                <div style="display:flex; flex-direction:column; gap:0.875rem;">
                    <div class="kpi-row" style="border-left-color:${totais.lucroGerencial >= 0 ? '#1D9E75' : '#E24B4A'};">
                        <span class="kpi-row-label">Margem Líquida</span>
                        <span class="kpi-row-value" style="color:${totais.lucroGerencial >= 0 ? '#1D9E75' : '#E24B4A'};">${hasData ? lucroPct + '%' : '—'}</span>
                    </div>
                    <div class="kpi-row" style="border-left-color:var(--color-info);">
                        <span class="kpi-row-label">Margem de Contribuição</span>
                        <span class="kpi-row-value" style="color:var(--color-info);">${hasData && fat > 0 ? ((totais.margemContribuicao / fat) * 100).toFixed(1) + '%' : '—'}</span>
                    </div>
                    <div class="kpi-row">
                        <span class="kpi-row-label">Margem de Contribuição (R$)</span>
                        <span class="kpi-row-value" style="color:var(--color-info);">${hasData ? fmt(totais.margemContribuicao) : '—'}</span>
                    </div>
                    <div class="kpi-row" style="border-left-color:var(--accent-gold);">
                        <span class="kpi-row-label">Ponto de Equilíbrio</span>
                        <span class="kpi-row-value" style="color:var(--accent-gold);">${hasData && parseFloat(pe) > 0 ? fmt(parseFloat(pe)) : '—'}</span>
                    </div>
                </div>
            </div>
        </div>

        ${metaFat > 0 || metaLucro > 0 ? `
        <div class="card" style="margin-top:2rem;">
            <h3 style="margin-bottom:1.5rem;">Metas do Período</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1.25rem;">
                ${metaFat > 0 ? `
                <div style="padding:1.25rem; background:var(--bg-elevated); border-radius:var(--radius-card); border-left:4px solid ${totais.faturamento >= metaFat ? '#1D9E75' : '#E24B4A'};">
                    <div style="color:var(--text-secondary); font-size:0.75rem; font-weight:700; margin-bottom:0.5rem; letter-spacing:0.5px; text-transform:uppercase;">Meta de Faturamento</div>
                    <div style="font-size:1.15rem; font-weight:800;">${fmt(metaFat)}</div>
                    <div style="display:inline-flex; align-items:center; gap:5px; font-size:0.8rem; font-weight:700; margin-top:0.5rem; color:${totais.faturamento >= metaFat ? '#1D9E75' : '#E24B4A'};">
                        ${totais.faturamento >= metaFat ? IC.check : IC.xmark}
                        ${totais.faturamento >= metaFat ? 'Atingida' : 'Não atingida'}
                    </div>
                </div>` : ''}
                ${metaLucro > 0 ? `
                <div style="padding:1.25rem; background:var(--bg-elevated); border-radius:var(--radius-card); border-left:4px solid ${totais.lucroGerencial >= metaLucro ? '#1D9E75' : '#E24B4A'};">
                    <div style="color:var(--text-secondary); font-size:0.75rem; font-weight:700; margin-bottom:0.5rem; letter-spacing:0.5px; text-transform:uppercase;">Meta de Lucro</div>
                    <div style="font-size:1.15rem; font-weight:800;">${fmt(metaLucro)}</div>
                    <div style="display:inline-flex; align-items:center; gap:5px; font-size:0.8rem; font-weight:700; margin-top:0.5rem; color:${totais.lucroGerencial >= metaLucro ? '#1D9E75' : '#E24B4A'};">
                        ${totais.lucroGerencial >= metaLucro ? IC.check : IC.xmark}
                        ${totais.lucroGerencial >= metaLucro ? 'Atingida' : 'Não atingida'}
                    </div>
                </div>` : ''}
            </div>
        </div>` : ''}

        ${totais.lucroGerencial > 0 ? (() => {
            const emp       = data?.emprestimos || 0;
            const restante  = totais.lucroGerencial - emp;
            const divisao   = window.calcularDivisaoLucro ? window.calcularDivisaoLucro(restante) : { proLabore: restante * .5, investimentos: restante * .3, reserva: restante * .2 };
            const empPct    = totais.lucroGerencial > 0 ? ((emp / totais.lucroGerencial) * 100).toFixed(0) : 0;
            return `
        <div class="card" style="margin-top:2rem;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:1.5rem;">
                <span style="color:var(--accent-gold);">${IC.layers}</span>
                <h3 style="margin:0;">Divisão do Lucro</h3>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem;">
                ${[
                    { label: 'Pró-Labore',   val: divisao.proLabore,     ref: '40–60%', color: 'var(--pave-green)' },
                    { label: `Empréstimos (${empPct}%)`, val: emp, ref: '0–20%', color: emp > 0 ? 'var(--color-warning)' : 'var(--text-primary)' },
                    { label: 'Reinvestimento', val: divisao.investimentos, ref: '20–40%', color: 'var(--pave-blue)' },
                    { label: 'Reserva de Caixa', val: divisao.reserva, ref: '20–40%', color: 'var(--color-info)' }
                ].map(d => `
                    <div style="padding:1.1rem; border:1px solid var(--border); border-radius:var(--radius-card); text-align:center;">
                        <div style="color:var(--text-secondary); font-size:0.72rem; font-weight:700; margin-bottom:0.6rem; text-transform:uppercase; letter-spacing:0.5px;">${d.label}</div>
                        <div style="font-size:1.25rem; font-weight:800; color:${d.color};">${fmt(d.val)}</div>
                        <div style="font-size:0.68rem; color:var(--text-secondary); margin-top:5px;">Meta: ${d.ref}</div>
                    </div>`).join('')}
            </div>
        </div>`;
        })() : ''}

        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:2rem; margin-top:2rem;">
            <div class="card">
                <h3 style="margin-bottom:1.5rem;">Evolução Mensal</h3>
                <canvas id="chart-evolution" style="max-height:230px;"></canvas>
            </div>
            <div class="card">
                <h3 style="margin-bottom:1.5rem;">Histórico de Consolidações</h3>
                <div id="historico-list" style="margin-top:0.5rem; max-height:300px; overflow-y:auto;"></div>
            </div>
        </div>

        <div id="alertas-container" style="margin-top:2rem;"></div>
    `;

    // ── GRÁFICO DE COMPOSIÇÃO ─────────────────────────────────────────────────
    if (window.chartCostsDeepObj) window.chartCostsDeepObj.destroy();
    let top5;
    if (fromCaixa) {
        // Dados do Caixa não têm breakdown por categoria — exibe 2 fatias significativas
        top5 = [];
        const custosCaixa = Math.max(0, totais.totalFixos);
        const lucroCaixa  = Math.max(0, totais.lucroGerencial);
        if (custosCaixa > 0) top5.push({ name: 'Custos Totais', val: custosCaixa });
        if (lucroCaixa  > 0) top5.push({ name: 'Lucro', val: lucroCaixa });
        if (top5.length === 0) top5.push({ name: 'Sem resultado', val: 1 });
    } else {
        const expenses = [
            { name: 'Folha',        val: parseFloat(data?.folha) || 0 },
            { name: 'Aluguel',      val: parseFloat(data?.aluguel) || 0 },
            { name: 'Insumos',      val: parseFloat(data?.insumos) || 0 },
            { name: 'Marketing',    val: parseFloat(data?.marketing) || 0 },
            { name: 'Sistemas',     val: parseFloat(data?.sistemas) || 0 },
            { name: 'Boletos',      val: parseFloat(data?.boletosFornecedores) || 0 },
            { name: 'Impostos',     val: parseFloat(data?.impostos) || 0 },
            { name: 'Taxas Cartão', val: parseFloat(data?.taxasCartao) || 0 }
        ];
        const explicitTotal = expenses.reduce((a, b) => a + b.val, 0);
        const othersVal     = Math.max(0, (totais.totalFixos + totais.totalVariaveis) - explicitTotal);
        if (othersVal > 0) expenses.push({ name: 'Outros', val: othersVal });
        expenses.sort((a, b) => b.val - a.val);
        top5 = expenses.slice(0, 5).filter(e => e.val > 0);
        const remaining = expenses.slice(5).reduce((a, b) => a + b.val, 0);
        if (remaining > 0) top5.push({ name: 'Demais', val: remaining });
        top5.push({ name: 'Lucro', val: Math.max(0, totais.lucroGerencial) });
    }

    const chartEl = document.getElementById('chart-costs-deep');
    if (chartEl) {
        if (!hasData) {
            // Placeholder chart with neutral data
            window.chartCostsDeepObj = new Chart(chartEl, {
                type: 'doughnut',
                data: {
                    labels: ['Aguardando dados'],
                    datasets: [{ data: [1], backgroundColor: [_isDark()?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'], borderWidth: 0 }]
                },
                options: { plugins: { legend: { labels: { color: _chartTick(), font: { family: 'Montserrat' } } } }, cutout: '72%' }
            });
        } else {
            window.chartCostsDeepObj = new Chart(chartEl, {
                type: 'doughnut',
                data: {
                    labels: top5.map(e => e.name),
                    datasets: [{ data: top5.map(e => e.val), backgroundColor: ['#E24B4A','#ff9f0a','#ffd60a','#ffb340','#ffc67b','#b0b0b5','#1D9E75'].slice(0, top5.length), borderWidth: 0, spacing: 4 }]
                },
                options: { plugins: { legend: { position: 'bottom', labels: { color: _chartTick(), font: { family: 'Montserrat', weight: '600' }, padding: 12 } } }, cutout: '72%' }
            });
        }
    }

    // ── GRÁFICO DE EVOLUÇÃO ───────────────────────────────────────────────────
    let historico; try { historico = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch { historico = []; }
    historico = [...historico].sort((a, b) => (a.mesRef || '').localeCompare(b.mesRef || ''));
    const last6     = historico.slice(-6);
    const evoEl     = document.getElementById('chart-evolution');
    if (evoEl) {
        if (window.chartEvoObj) window.chartEvoObj.destroy();
        const evoLabels = last6.length > 0 ? last6.map(h => h.label || h.mesRef || '?') : ['—'];
        const evoFat    = last6.length > 0 ? last6.map(h => h.faturamento || 0) : [0];
        const evoLucro  = last6.length > 0 ? last6.map(h => h.lucro || 0) : [0];
        window.chartEvoObj = new Chart(evoEl, {
            type: 'line',
            data: {
                labels: evoLabels,
                datasets: [
                    { label: 'Faturamento', data: evoFat,   borderColor: 'var(--accent-blue)', backgroundColor: 'rgba(10,132,255,0.08)', fill: true, tension: 0.4, pointRadius: 4 },
                    { label: 'Lucro',       data: evoLucro, borderColor: '#1D9E75',             backgroundColor: 'rgba(29,158,117,0.08)',  fill: true, tension: 0.4, pointRadius: 4 }
                ]
            },
            options: {
                plugins: { legend: { labels: { color: _chartTick(), font: { family: 'Montserrat' } } } },
                scales: {
                    x: { ticks: { color: _chartTick(), font: { family: 'Montserrat' } }, grid: { color: _chartGrid() } },
                    y: { ticks: { color: _chartTick(), font: { family: 'Montserrat' } }, grid: { color: _chartGrid() } }
                }
            }
        });
    }

    // ── HISTÓRICO LIST ────────────────────────────────────────────────────────
    const listEl = document.getElementById('historico-list');
    if (listEl) {
        if (historico.length === 0) {
            listEl.innerHTML = `<p style="color:var(--text-secondary); font-size:0.85rem; padding:0.5rem 0;">Nenhuma consolidação registrada.</p>`;
        } else {
            listEl.innerHTML = historico.slice().reverse().map((h, i) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; background:var(--bg-elevated); border-radius:var(--radius-md); margin-bottom:0.5rem;">
                    <div>
                        <div style="font-weight:700; font-size:0.85rem;">${h.label || h.mesRef || 'N/A'}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">Fat: R$ ${(h.faturamento || 0).toLocaleString('pt-BR')}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800; color:${(h.lucro || 0) >= 0 ? '#1D9E75' : '#E24B4A'}; font-size:0.9rem;">R$ ${(h.lucro || 0).toLocaleString('pt-BR')}</div>
                        <button onclick="window.deleteHistorico(${historico.length - 1 - i})" style="background:none; border:none; color:#E24B4A; cursor:pointer; font-size:0.7rem; padding:2px 0;">remover</button>
                    </div>
                </div>
            `).join('');
        }
    }

    // ── ALERTAS ───────────────────────────────────────────────────────────────
    const alertas = [];
    if (hasData) {
        if (totais.lucroGerencial < 0)
            alertas.push({ msg: 'Lucro Gerencial negativo. Revise os custos imediatamente.',  color: '#E24B4A' });
        if (metaFat   > 0 && totais.faturamento    < metaFat)
            alertas.push({ msg: `Faturamento abaixo da meta em R$ ${(metaFat - totais.faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`, color: '#ffd60a' });
        if (metaLucro > 0 && totais.lucroGerencial < metaLucro)
            alertas.push({ msg: `Lucro abaixo da meta em R$ ${(metaLucro - totais.lucroGerencial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`, color: '#ffd60a' });
        if (!fromCaixa && totais.totalVariaveis > fat * 0.6)
            alertas.push({ msg: 'Custos variáveis acima de 60% do faturamento.', color: '#ff9500' });
    }

    const alertEl = document.getElementById('alertas-container');
    if (alertEl && alertas.length > 0) {
        alertEl.innerHTML = `
            <div class="card">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:1.25rem;">
                    <span style="color:#ff9500;">${IC.bell}</span>
                    <h3 style="margin:0;">Alertas</h3>
                </div>
                ${alertas.map(a => `
                    <div style="display:flex; align-items:flex-start; gap:10px; padding:0.75rem 1rem; background:var(--bg-elevated); border-left:3px solid ${a.color}; border-radius:var(--radius-sm); margin-bottom:0.5rem;">
                        <span style="color:${a.color}; flex-shrink:0; margin-top:1px;">${IC.alert}</span>
                        <span style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">${a.msg}</span>
                    </div>`).join('')}
            </div>`;
    } else if (alertEl) {
        alertEl.innerHTML = '';
    }
}

// (definição canônica mais abaixo — "HOOK: renderDashboard")

// ── HISTÓRICO ──────────────────────────────────────────────────────────────
window.deleteHistorico = function(idx) {
    Utils.confirm('Este registro será removido do histórico de consolidações.', 'Remover consolidação?', () => {
        let hist; try { hist = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch { hist = []; }
        hist.splice(idx, 1);
        localStorage.setItem('pav_historico', JSON.stringify(hist));
        window.renderDashboard();
    });
};

// ── SUBMIT DO BALANÇO ──────────────────────────────────────────────────────
// ── PREENCHER FORM DE FINANÇAS COM DADOS SALVOS ──────────────────────────────
window.fillBalancoForm = function(data) {
    if (!data) return;
    const setV = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.value = val;
    };
    // Normaliza para YYYY-MM (compatível com input type="month")
    setV('mesReferencia',         (data.mesReferencia || '').substring(0, 7));
    setV('faturamento',           data.faturamento || '');
    setV('qtdAtendimentos',       data.qtdAtendimentos || '');
    setV('metaFaturamento',       data.metaFaturamento || '');
    setV('metaLucro',             data.metaLucro || '');
    setV('diasUteis',             data.diasUteis || 22);
    setV('reembolsoInadimplencia',data.reembolsoInadimplencia || '');
    setV('impostos',              data.impostos || '');
    setV('taxasCartao',           data.taxasCartao || '');
    setV('insumos',               data.insumos || '');
    setV('boletosFornecedores',   data.boletosFornecedores || '');
    setV('terceirizadosVar',      data.terceirizadosVar || '');
    setV('labTerceirizado',       data.labTerceirizado || '');
    setV('comissoes',             data.comissoes || '');
    setV('plantoes',              data.plantoes || '');
    setV('escritorioLimpezaVar',  data.escritorioLimpezaVar || '');
    setV('estorno',               data.estorno || '');
    setV('outrosVariaveis',       data.outrosVariaveis || '');
    setV('folha',                 data.folha || '');
    setV('agua',                  data.agua || '');
    setV('luz',                   data.luz || '');
    setV('sistemas',              data.sistemas || '');
    setV('aluguel',               data.aluguel || '');
    setV('telecom',               data.telecom || '');
    setV('contabilidade',         data.contabilidade || '');
    setV('marketing',             data.marketing || '');
    setV('esocial',               data.esocial || '');
    setV('taxasAdmin',            data.taxasAdmin || '');
    setV('crmv',                  data.crmv || '');
    setV('lixoContaminante',      data.lixoContaminante || '');
    setV('iptu',                  data.iptu || '');
    setV('limpezaFixa',           data.limpezaFixa || '');
    setV('terceirizadosFixos',    data.terceirizadosFixos || '');
    setV('outrosFixos',           data.outrosFixos || '');
    setV('emprestimos',           data.emprestimos || '');
    setV('emprestimosDesc',       data.emprestimosDesc || '');
    // Recalcular previews
    if (window.updateLiveBalanco) window.updateLiveBalanco();
    if (window._calcMetaDiaria)   window._calcMetaDiaria();
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.renderDashboard) window.renderDashboard();

    // Preencher form com último balanço salvo
    try {
        const saved = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
        if (saved) window.fillBalancoForm(saved);
    } catch {}

    const balancoForm = document.getElementById('balancoForm');
    if (!balancoForm) return;

    balancoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = balancoForm.querySelector('[type="submit"]');

        // Guard duplo-clique
        if (submitBtn?.dataset.saving === 'true') return;
        if (submitBtn) { submitBtn.dataset.saving = 'true'; Utils.setLoading(submitBtn, true); }

        const getVal = id => parseFloat(document.getElementById(id)?.value) || 0;
        const mesStr = document.getElementById('mesReferencia')?.value || 'N/A';

        const _unlock = () => {
            if (submitBtn) { submitBtn.dataset.saving = ''; Utils.setLoading(submitBtn, false); }
        };

        // Validação inline: faturamento e data são obrigatórios
        const _markBad = (id, msg) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = 'var(--color-danger)';
                el.style.animation   = 'pav-shake 0.3s ease';
                el.addEventListener('input', () => { el.style.borderColor = ''; el.style.animation = ''; }, { once: true });
            }
            _unlock();
            Utils.showToast(msg, 'error');
        };
        if (getVal('faturamento') <= 0) { _markBad('faturamento', 'Informe o faturamento do mês'); return; }
        if (!mesStr || mesStr === 'N/A') { _markBad('mesReferencia', 'Informe a data de referência'); return; }

        const dados = {
            mesReferencia: mesStr,
            faturamento: getVal('faturamento'), qtdAtendimentos: getVal('qtdAtendimentos'),
            metaFaturamento: getVal('metaFaturamento'), metaLucro: getVal('metaLucro'),
            diasUteis: parseInt(document.getElementById('diasUteis')?.value) || 22,
            reembolsoInadimplencia: getVal('reembolsoInadimplencia'), impostos: getVal('impostos'), taxasCartao: getVal('taxasCartao'),
            insumos: getVal('insumos'), boletosFornecedores: getVal('boletosFornecedores'), terceirizadosVar: getVal('terceirizadosVar'),
            labTerceirizado: getVal('labTerceirizado'), comissoes: getVal('comissoes'), plantoes: getVal('plantoes'),
            escritorioLimpezaVar: getVal('escritorioLimpezaVar'), estorno: getVal('estorno'), outrosVariaveis: getVal('outrosVariaveis'),
            folha: getVal('folha'), agua: getVal('agua'), luz: getVal('luz'), sistemas: getVal('sistemas'),
            aluguel: getVal('aluguel'), telecom: getVal('telecom'), contabilidade: getVal('contabilidade'), marketing: getVal('marketing'),
            esocial: getVal('esocial'), taxasAdmin: getVal('taxasAdmin'), crmv: getVal('crmv'),
            lixoContaminante: getVal('lixoContaminante'), iptu: getVal('iptu'), limpezaFixa: getVal('limpezaFixa'),
            terceirizadosFixos: getVal('terceirizadosFixos'), outrosFixos: getVal('outrosFixos'),
            emprestimos: getVal('emprestimos'), emprestimosDesc: document.getElementById('emprestimosDesc')?.value || ''
        };

        try {
            if (typeof FinancialAPI !== 'undefined') {
                await FinancialAPI.save(dados);
            } else {
                // Fallback offline: salvar direto no localStorage
                localStorage.setItem('pav_ultimos_dados', JSON.stringify(dados));
                const totais = window.calcularTotais ? window.calcularTotais(dados) : {};
                let historico; try { historico = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch { historico = []; }
                // Normalizar sempre para YYYY-MM para evitar duplicatas com formatos diferentes
                const mesRefNorm = (mesStr || '').substring(0, 7);
                const label = window.formatPeriod ? window.formatPeriod(mesRefNorm) : mesRefNorm;
                const idx = historico.findIndex(h => (h.mesRef || '').substring(0, 7) === mesRefNorm);
                const entry = { mesRef: mesRefNorm, label, faturamento: dados.faturamento, lucro: totais.lucroGerencial || 0, date: new Date().toISOString() };
                if (idx >= 0) historico[idx] = entry; else historico.push(entry);
                localStorage.setItem('pav_historico', JSON.stringify(historico));
            }

            _unlock();
            Utils.showToast('Balanço consolidado com sucesso!', 'success');
            window.renderDashboard(dados);
            document.getElementById('tab-dashboard').click();
            window.scrollTo(0, 0);
        } catch (err) {
            _unlock();
            console.error('[BALANCO] Falha ao salvar balanço:', err);
            Utils.showToast(
                'Erro ao salvar: ' + (err?.message || 'falha de conexão. Verifique sua internet e tente novamente.'),
                'error'
            );
        }
    });

    // ── Sugestão de Impostos baseada no Regime Tributário ──────────────────────
    // Alíquotas estimadas (faixa inicial de cada regime — referência, não cálculo exato)
    const _taxRates = { simples: 0.06, lucro_presumido: 0.1133, lucro_real: 0.15 };

    function _injectTaxHint() {
        const impostoEl = document.getElementById('impostos');
        if (!impostoEl || document.getElementById('_tax-hint-btn')) return;

        const wrapper = impostoEl.closest('.input-group');
        if (!wrapper) return;

        const hint = document.createElement('button');
        hint.type = 'button';
        hint.id   = '_tax-hint-btn';
        hint.title = 'Preenche com estimativa baseada no regime tributário configurado';
        hint.style.cssText = 'margin-top:4px; font-size:0.72rem; background:none; border:none; color:var(--accent-blue); cursor:pointer; padding:0; text-decoration:underline;';
        hint.textContent = 'Sugerir pelo regime';

        hint.addEventListener('click', () => {
            const fat    = parseFloat(document.getElementById('faturamento')?.value) || 0;
            const clinica = (() => { try { return JSON.parse(localStorage.getItem('pav_clinica') || '{}'); } catch { return {}; } })();
            const regime  = clinica.regime || 'simples';
            const rate    = _taxRates[regime] ?? _taxRates.simples;
            const sugest  = (fat * rate).toFixed(2);
            impostoEl.value = sugest;
            Utils.showToast(`Estimativa ${(rate * 100).toFixed(2)}% (${regime.replace('_', ' ')}) aplicada ao campo Impostos.`, 'info');
        });

        wrapper.appendChild(hint);
    }

    // Injeta o hint quando a aba Balanço for aberta (seção pode estar oculta no DOMContentLoaded)
    const _balancoSection = document.getElementById('aba-balanco');
    if (_balancoSection) {
        new MutationObserver(() => {
            if (_balancoSection.style.display !== 'none') _injectTaxHint();
        }).observe(_balancoSection, { attributes: true, attributeFilter: ['style'] });
    }
    _injectTaxHint(); // tenta logo no boot caso já esteja visível
});

// ── RELATÓRIOS — TAB SYSTEM ───────────────────────────────────────────────────
let _relActiveTab = 'visao-geral';

window.switchRelTab = function(tab) {
    _relActiveTab = tab;
    const tabs = ['visao-geral','fluxo-caixa','dre','custos','servicos','exportacao','comparativo'];
    tabs.forEach(t => {
        const btn   = document.getElementById('rel-tab-' + t);
        const panel = document.getElementById('rel-panel-' + t);
        if (!btn || !panel) return;
        const active = t === tab;
        btn.style.background = active ? 'var(--accent-blue)' : 'transparent';
        btn.style.color      = active ? '#fff' : 'var(--text-secondary)';
        panel.style.display  = active ? '' : 'none';
    });
    _renderRelActiveTab();
};

function _renderRelActiveTab() {
    switch (_relActiveTab) {
        case 'visao-geral':   _relVisaoGeral();    break;
        case 'fluxo-caixa':  _relFluxoCaixa();    break;
        case 'dre':          _relDRE();            break;
        case 'custos':       _relCustos();         break;
        case 'servicos':     _relServicos();       break;
        case 'exportacao':   _relExportacao();     break;
        case 'comparativo':  _relComparativo();    break;
    }
}

window.renderRelatorios = function() {
    window._initRelPeriodBar();
    window.switchRelTab(_relActiveTab);
};

// ── PERÍODO GLOBAL DE RELATÓRIOS ─────────────────────────────────────────────
// Exposto globalmente: window.REL_PERIOD = { from: 'YYYY-MM', to: 'YYYY-MM' } | null
window.REL_PERIOD = null;

window._initRelPeriodBar = function() {
    const fromEl = document.getElementById('rel-period-from');
    const toEl   = document.getElementById('rel-period-to');
    if (!fromEl || !toEl) return;

    let historico = [];
    try { historico = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch {}

    const seen = new Set();
    const keys = [...historico]
        .map(h => (h.mesRef || '').substring(0, 7))
        .filter(k => k && !seen.has(k) && seen.add(k))
        .sort();

    const fp = window.formatPeriod || (k => k);
    const opts = keys.map(k => `<option value="${k}">${fp(k)}</option>`).join('');
    fromEl.innerHTML = '<option value="">Todos</option>' + opts;
    toEl.innerHTML   = '<option value="">Todos</option>' + opts;

    // Restaurar seleção anterior
    if (window.REL_PERIOD) {
        fromEl.value = window.REL_PERIOD.from || '';
        toEl.value   = window.REL_PERIOD.to   || '';
    }
};

window.applyRelPeriod = function() {
    const from = document.getElementById('rel-period-from')?.value || '';
    const to   = document.getElementById('rel-period-to')?.value   || '';
    window.REL_PERIOD = (from || to) ? { from, to } : null;
    window.switchRelTab(_relActiveTab);
};

window.clearRelPeriod = function() {
    window.REL_PERIOD = null;
    const fromEl = document.getElementById('rel-period-from');
    const toEl   = document.getElementById('rel-period-to');
    if (fromEl) fromEl.value = '';
    if (toEl)   toEl.value   = '';
    window.switchRelTab(_relActiveTab);
};

// Filtra o histórico respeitando REL_PERIOD — sempre ordenado por mesRef asc
function _filteredHistorico() {
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch {}
    hist = [...hist].sort((a, b) => (a.mesRef || '').localeCompare(b.mesRef || ''));
    if (!window.REL_PERIOD) return hist;
    const { from, to } = window.REL_PERIOD;
    return hist.filter(h => {
        const k = (h.mesRef || '').substring(0, 7);
        if (from && k < from) return false;
        if (to   && k > to)   return false;
        return true;
    });
}

// ── TAB: VISÃO GERAL ──────────────────────────────────────────────────────────
function _relVisaoGeral() {
    const panel = document.getElementById('rel-panel-visao-geral');
    if (!panel) return;

    const historico    = _filteredHistorico();
    const data        = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    const totais      = data && window.calcularTotais ? window.calcularTotais(data) : {};
    const fmt         = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const currentYear = new Date().getFullYear().toString();
    const anoAtual    = historico.filter(h => h.mesRef?.startsWith(currentYear));

    let fatAno = 0, lucroAno = 0, meses = 0;
    historico.forEach(h => { if (h.faturamento > 0) { fatAno += h.faturamento; meses++; } lucroAno += parseFloat(h.lucro) || 0; });
    const mediaMensal = meses > 0 ? fatAno / meses : 0;

    panel.innerHTML = `
        <!-- KPI strip -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1.5rem;">
            ${[
                { label: 'Média Faturamento/Mês', val: fmt(mediaMensal),          color: 'var(--accent-blue)' },
                { label: 'Média Diária (22d)',     val: fmt(mediaMensal / 22),     color: 'var(--accent-gold)' },
                { label: 'Custos Fixos (último)',  val: fmt(totais.totalFixos),    color: '#E24B4A' },
                { label: 'Lucro Acumulado (Ano)',  val: fmt(lucroAno),             color: lucroAno >= 0 ? '#1D9E75' : '#E24B4A' }
            ].map(k => `
                <div style="padding:1.25rem 1rem; background:${_statBg()}; border:${_statBor()}; border-radius:var(--radius-card); text-align:center;">
                    <div style="font-size:0.68rem; font-weight:700; color:var(--text-secondary); margin-bottom:6px; letter-spacing:0.8px; text-transform:uppercase;">${k.label}</div>
                    <div style="font-size:1.5rem; font-weight:800; color:${k.color};">${k.val}</div>
                </div>`).join('')}
        </div>

        <!-- Charts row -->
        <div style="display:grid; grid-template-columns:3fr 2fr; gap:1.5rem;">
            <div class="card">
                <h3 style="margin-bottom:1.25rem; font-size:0.95rem;">Receita vs Despesa (últimos meses)</h3>
                <canvas id="rel-chart-bar" style="max-height:240px;"></canvas>
            </div>
            <div class="card">
                <h3 style="margin-bottom:1.25rem; font-size:0.95rem;">Evolução do Lucro</h3>
                <canvas id="rel-chart-lucro" style="max-height:240px;"></canvas>
            </div>
        </div>

        <!-- History table -->
        <div class="card" style="margin-top:1.5rem;">
            <h3 style="margin-bottom:1.25rem; font-size:0.95rem;">Histórico de Consolidações</h3>
            ${historico.length === 0
                ? `<p style="color:var(--text-secondary); font-size:0.85rem;">Nenhuma consolidação registrada ainda.</p>`
                : `<div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--border);">
                                <th style="text-align:left; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Período</th>
                                <th style="text-align:right; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Faturamento</th>
                                <th style="text-align:right; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Lucro</th>
                                <th style="text-align:right; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historico.slice().reverse().map(h => {
                                const margem = h.faturamento > 0 ? ((h.lucro / h.faturamento) * 100).toFixed(1) : '—';
                                return `<tr style="border-bottom:1px solid var(--border);" onmouseover="this.style.background='${_rowBg()}'" onmouseout="this.style.background='transparent'">
                                    <td style="padding:0.625rem 0.875rem; font-weight:700;">${h.label || h.mesRef || 'N/A'}</td>
                                    <td style="padding:0.625rem 0.875rem; text-align:right; color:var(--accent-blue);">${fmt(h.faturamento)}</td>
                                    <td style="padding:0.625rem 0.875rem; text-align:right; color:${(h.lucro||0)>=0?'#1D9E75':'#E24B4A'}; font-weight:700;">${fmt(h.lucro)}</td>
                                    <td style="padding:0.625rem 0.875rem; text-align:right; color:var(--text-secondary);">${margem}%</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`}
        </div>
    `;

    // Bar chart: receitas vs despesas per month
    const last12 = historico.slice(-12);
    const barEl  = document.getElementById('rel-chart-bar');
    if (barEl) {
        if (window._relBarChart) window._relBarChart.destroy();
        const labels = last12.map(h => h.label || h.mesRef || '?');
        // receita from history, despesa = faturamento - lucro (approximation)
        const fatData  = last12.map(h => h.faturamento || 0);
        const despData = last12.map(h => Math.max(0, (h.faturamento || 0) - (h.lucro || 0)));
        window._relBarChart = new Chart(barEl, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Faturamento', data: fatData,  backgroundColor: 'rgba(10,132,255,0.55)',  borderRadius: 4 },
                    { label: 'Custos',      data: despData, backgroundColor: 'rgba(226,75,74,0.45)',   borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: _chartTick(), font: { family: 'Montserrat', size: 11 } } } },
                scales: {
                    x: { ticks: { color: _chartTick(), font: { family: 'Montserrat', size: 10 } }, grid: { color: _chartGrid() } },
                    y: { ticks: { color: _chartTick(), font: { family: 'Montserrat', size: 10 } }, grid: { color: _chartGrid() } }
                }
            }
        });
    }

    // Line chart: lucro evolution
    const lucroEl = document.getElementById('rel-chart-lucro');
    if (lucroEl) {
        if (window._relLucroChart) window._relLucroChart.destroy();
        const lucroData = last12.map(h => h.lucro || 0);
        window._relLucroChart = new Chart(lucroEl, {
            type: 'line',
            data: {
                labels: last12.map(h => h.label || h.mesRef || '?'),
                datasets: [{
                    label: 'Lucro',
                    data: lucroData,
                    borderColor: '#1D9E75',
                    backgroundColor: 'rgba(29,158,117,0.08)',
                    fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#1D9E75'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: _chartTick(), font: { family: 'Montserrat', size: 10 } }, grid: { color: _chartGrid() } },
                    y: { ticks: { color: _chartTick(), font: { family: 'Montserrat', size: 10 } }, grid: { color: _chartGrid() } }
                }
            }
        });
    }
}

// ── TAB: FLUXO DE CAIXA ───────────────────────────────────────────────────────
function _relFluxoCaixa() {
    const panel = document.getElementById('rel-panel-fluxo-caixa');
    if (!panel) return;

    const caixa = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    const fmt   = v => `R$ ${(Math.abs(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // Build filter options
    const now  = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    panel.innerHTML = `
        <!-- Filters -->
        <div class="card" style="margin-bottom:1.5rem; padding:1rem 1.5rem;">
            <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <select id="rel-cx-mes" onchange="window._relCxMesChange(this.value)" style="padding:0.4rem 0.875rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-size:0.85rem; font-family:var(--font-family);">
                    <option value="">Todos os períodos</option>
                    ${[...new Set(caixa.map(c => c.vencimento.substring(0,7)))].sort().reverse().map(m => `<option value="${m}" ${m===mesAtual?'selected':''}>${m}</option>`).join('')}
                    <option value="__custom__">Período personalizado…</option>
                </select>
                <div id="rel-cx-custom-range" style="display:none; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                    <input type="date" id="rel-cx-from" onchange="_relFluxoCaixaRender()"
                           style="padding:0.35rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.83rem; font-family:var(--font-family);" />
                    <span style="color:var(--text-muted); font-size:0.8rem;">até</span>
                    <input type="date" id="rel-cx-to" onchange="_relFluxoCaixaRender()"
                           style="padding:0.35rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.83rem; font-family:var(--font-family);" />
                </div>
                <select id="rel-cx-tipo" onchange="_relFluxoCaixaRender()" style="padding:0.4rem 0.875rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-size:0.85rem; font-family:var(--font-family);">
                    <option value="">Receitas e Despesas</option>
                    <option value="receita">Apenas Receitas</option>
                    <option value="despesa">Apenas Despesas</option>
                </select>
                <select id="rel-cx-status" onchange="_relFluxoCaixaRender()" style="padding:0.4rem 0.875rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-size:0.85rem; font-family:var(--font-family);">
                    <option value="">Todos os status</option>
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                </select>
                <button onclick="window.exportCaixaCSV()" style="margin-left:auto; padding:0.4rem 1rem; border-radius:var(--radius-sm); border:1px solid rgba(29,158,117,0.3); background:rgba(29,158,117,0.08); color:#1D9E75; font-size:0.8rem; font-weight:700; font-family:var(--font-family); cursor:pointer;">
                    Exportar CSV
                </button>
            </div>
        </div>
        <!-- Summary cards -->
        <div id="rel-cx-summary" style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.5rem;"></div>
        <!-- Table -->
        <div class="card" style="padding:0; overflow:hidden;">
            <div id="rel-cx-table"></div>
        </div>
    `;

    window._relFluxoCaixaRender();
}

window._relCxMesChange = function(val) {
    const rangeDiv = document.getElementById('rel-cx-custom-range');
    if (rangeDiv) rangeDiv.style.display = val === '__custom__' ? 'flex' : 'none';
    if (val !== '__custom__') window._relFluxoCaixaRender();
};

window._relFluxoCaixaRender = function() {
    const mesEl  = document.getElementById('rel-cx-mes');
    const mes    = mesEl?.value || '';
    const tipo   = document.getElementById('rel-cx-tipo')?.value || '';
    const status = document.getElementById('rel-cx-status')?.value || '';
    const fromDate = document.getElementById('rel-cx-from')?.value || '';
    const toDate   = document.getElementById('rel-cx-to')?.value   || '';
    const fmt    = v => `R$ ${(Math.abs(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    let caixa = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    if (mes === '__custom__') {
        if (fromDate) caixa = caixa.filter(c => c.vencimento >= fromDate);
        if (toDate)   caixa = caixa.filter(c => c.vencimento <= toDate);
    } else if (mes) {
        caixa = caixa.filter(c => c.vencimento.startsWith(mes));
    }
    if (tipo)   caixa = caixa.filter(c => c.tipo === tipo);
    if (status) caixa = caixa.filter(c => (c.status || 'pendente') === status);
    caixa.sort((a, b) => b.vencimento.localeCompare(a.vencimento));

    const recPago  = caixa.filter(c => c.tipo === 'receita' && c.status === 'pago').reduce((s,c) => s + c.valor, 0);
    const desPago  = caixa.filter(c => c.tipo === 'despesa' && c.status === 'pago').reduce((s,c) => s + c.valor, 0);
    const recPend  = caixa.filter(c => c.tipo === 'receita' && c.status !== 'pago').reduce((s,c) => s + c.valor, 0);
    const desPend  = caixa.filter(c => c.tipo === 'despesa' && c.status !== 'pago').reduce((s,c) => s + c.valor, 0);

    const sumEl = document.getElementById('rel-cx-summary');
    if (sumEl) {
        sumEl.innerHTML = [
            { label: 'Entradas Pagas',   val: fmt(recPago), color: '#1D9E75' },
            { label: 'Saídas Pagas',     val: fmt(desPago), color: '#E24B4A' },
            { label: 'Saldo Confirmado', val: fmt(recPago - desPago), color: (recPago - desPago) >= 0 ? '#1D9E75' : '#E24B4A' },
            { label: 'Saldo Projetado',  val: fmt(recPago + recPend - desPago - desPend), color: (recPago + recPend - desPago - desPend) >= 0 ? 'var(--color-info)' : 'var(--color-warning)' }
        ].map(k => `
            <div style="padding:1rem; background:${_statBg()}; border:${_statBor()}; border-radius:var(--radius-card); text-align:center;">
                <div style="font-size:0.65rem; font-weight:700; color:var(--text-secondary); margin-bottom:5px; letter-spacing:0.6px; text-transform:uppercase;">${k.label}</div>
                <div style="font-size:1.2rem; font-weight:800; color:${k.color};">${k.val}</div>
            </div>`).join('');
    }

    const tableEl = document.getElementById('rel-cx-table');
    if (!tableEl) return;
    if (caixa.length === 0) {
        tableEl.innerHTML = `<p style="padding:2rem; color:var(--text-secondary); font-size:0.875rem; text-align:center;">Nenhum lançamento encontrado com estes filtros.</p>`;
        return;
    }
    tableEl.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <thead>
                <tr style="border-bottom:1px solid var(--border);">
                    <th style="text-align:left; padding:0.75rem 1rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px;">Descrição</th>
                    <th style="text-align:left; padding:0.75rem 1rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px;">Data</th>
                    <th style="text-align:left; padding:0.75rem 1rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px;">Categoria</th>
                    <th style="text-align:left; padding:0.75rem 1rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px;">Forma</th>
                    <th style="text-align:right; padding:0.75rem 1rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px;">Valor</th>
                    <th style="text-align:center; padding:0.75rem 1rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${caixa.map(c => {
                    const isR  = c.tipo === 'receita';
                    const cor  = isR ? '#1D9E75' : '#E24B4A';
                    const dt   = c.vencimento.split('-').reverse().join('/');
                    return `<tr style="border-bottom:1px solid var(--border);" onmouseover="this.style.background='${_rowBg()}'" onmouseout="this.style.background='transparent'">
                        <td style="padding:0.625rem 1rem; font-weight:600;">${c.descricao}</td>
                        <td style="padding:0.625rem 1rem; color:var(--text-secondary);">${dt}</td>
                        <td style="padding:0.625rem 1rem; color:var(--text-muted); font-size:0.78rem; text-transform:uppercase;">${c.categoria || '—'}</td>
                        <td style="padding:0.625rem 1rem; color:var(--text-muted); font-size:0.78rem;">${c.formaPag || '—'}</td>
                        <td style="padding:0.625rem 1rem; text-align:right; font-weight:800; color:${cor};">${isR ? '+' : '−'} ${fmt(c.valor)}</td>
                        <td style="padding:0.625rem 1rem; text-align:center;">
                            <span style="padding:2px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; text-transform:uppercase; background:${c.status==='pago'?'rgba(29,158,117,0.12)':'rgba(255,149,0,0.1)'}; color:${c.status==='pago'?'#1D9E75':'#ff9500'};">${c.status || 'pendente'}</span>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
};

window.exportCaixaCSV = function() {
    const caixa = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    if (caixa.length === 0) { Utils.showToast('Nenhum lançamento para exportar.', 'warning'); return; }
    const rows = [['Descrição','Data','Tipo','Categoria','Forma Pagamento','Valor','Status']];
    caixa.sort((a,b) => a.vencimento.localeCompare(b.vencimento)).forEach(c => {
        rows.push([c.descricao, c.vencimento, c.tipo, c.categoria||'', c.formaPag||'', c.valor, c.status||'pendente']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'extrato-pave.csv'; a.click();
    URL.revokeObjectURL(url);
    Utils.showToast('CSV exportado com sucesso!', 'success');
};

// ── TAB: DRE ─────────────────────────────────────────────────────────────────
function _relDRE() {
    const panel = document.getElementById('rel-panel-dre');
    if (!panel) return;

    let historico; try { historico = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch { historico = []; }
    const data      = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    const fmt       = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    function dreHtml(d, label) {
        if (!d) return `<p style="color:var(--text-secondary); font-size:0.85rem;">Sem dados para ${label}.</p>`;
        const t = window.calcularTotais ? window.calcularTotais(d) : {};
        const lucro = t.lucroGerencial || 0;
        const fat   = d.faturamento || 1;
        return `
            <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid var(--border);">
                <span style="font-weight:600; color:var(--text-secondary); font-size:0.85rem;">Receita Bruta</span>
                <span style="font-weight:800; color:var(--accent-blue);">${fmt(d.faturamento)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid var(--border);">
                <span style="font-weight:600; color:var(--text-secondary); font-size:0.85rem;">(−) Custos Variáveis</span>
                <span style="font-weight:800; color:var(--color-warning);">${fmt(t.totalVariaveis)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:0.75rem 0.875rem; background:var(--bg-elevated); border-radius:var(--radius-sm); margin:4px 0;">
                <span style="font-weight:700; color:var(--accent-gold); font-size:0.85rem;">(=) Margem Contribuição</span>
                <span style="font-weight:800; color:var(--accent-gold);">${fmt(t.margemContribuicao)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid var(--border);">
                <span style="font-weight:600; color:var(--text-secondary); font-size:0.85rem;">(−) Despesas Fixas</span>
                <span style="font-weight:800; color:#E24B4A;">${fmt(t.totalFixos)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:0.875rem 0 0 0; margin-top:4px; border-top:2px solid var(--border);">
                <span style="font-weight:800; color:var(--text-primary);">(=) Lucro Líquido</span>
                <span style="font-weight:900; font-size:1.05rem; color:${lucro>=0?'#1D9E75':'#E24B4A'};">${fmt(lucro)}</span>
            </div>
            <div style="color:var(--text-secondary); font-size:0.75rem; text-align:right; margin-top:0.625rem;">
                Margem: <strong>${((lucro/fat)*100).toFixed(1)}%</strong>
            </div>`;
    }

    // Get previous period data from history
    const prevEntry = historico.length >= 2 ? historico[historico.length - 2] : null;
    // We don't have full data for prev entry, only faturamento+lucro in history
    // So we can do a simplified DRE for current only, and show comparison as KPIs

    const curLabel  = data?.mesReferencia || 'Atual';
    const prevLabel = prevEntry?.label || prevEntry?.mesRef || 'Anterior';

    panel.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <!-- Current DRE -->
            <div class="card">
                <h3 style="margin-bottom:1rem; font-size:0.95rem; color:var(--text-secondary);">DRE — <span style="color:var(--text-primary);">${curLabel}</span></h3>
                <div id="rel-dre-atual">${dreHtml(data, 'período atual')}</div>
            </div>
            <!-- Comparison card -->
            <div class="card">
                <h3 style="margin-bottom:1rem; font-size:0.95rem; color:var(--text-secondary);">Comparativo vs <span style="color:var(--text-primary);">${prevLabel}</span></h3>
                ${!prevEntry || !data
                    ? `<p style="color:var(--text-secondary); font-size:0.85rem;">Registre ao menos 2 meses para ver o comparativo.</p>`
                    : (() => {
                        const cur   = window.calcularTotais ? window.calcularTotais(data) : {};
                        const delta = (cur, prev) => prev > 0 ? ((cur - prev) / prev * 100).toFixed(1) : null;
                        const arrow = (d, inv=false) => {
                            if (d === null) return '';
                            const pos = inv ? parseFloat(d) < 0 : parseFloat(d) > 0;
                            return `<span style="color:${pos?'#1D9E75':'#E24B4A'}; font-size:0.75rem; font-weight:700;">${parseFloat(d)>0?'▲':'▼'} ${Math.abs(d)}%</span>`;
                        };
                        const rows = [
                            { label: 'Faturamento', cur: cur.faturamento||0,    prev: prevEntry.faturamento||0, inv: false },
                            { label: 'Lucro',       cur: cur.lucroGerencial||0, prev: prevEntry.lucro||0,       inv: false },
                            { label: 'Custos Fixos',cur: cur.totalFixos||0,     prev: (prevEntry.faturamento||0)-(prevEntry.lucro||0), inv: true }
                        ];
                        return rows.map(r => {
                            const d = delta(r.cur, r.prev);
                            return `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.875rem 0; border-bottom:1px solid var(--border);">
                                <span style="color:var(--text-secondary); font-size:0.875rem; font-weight:600;">${r.label}</span>
                                <div style="text-align:right;">
                                    <div style="font-weight:800; font-size:0.95rem;">R$ ${r.cur.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                                    <div style="margin-top:3px;">${arrow(d, r.inv)} <span style="font-size:0.72rem; color:var(--text-muted);">vs R$ ${r.prev.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span></div>
                                </div>
                            </div>`;
                        }).join('');
                    })()
                }
            </div>
        </div>
        <!-- Annual DRE summary -->
        ${historico.length > 0 ? (() => {
            const yr  = new Date().getFullYear().toString();
            const ano = historico.filter(h => h.mesRef?.startsWith(yr));
            const totFat   = ano.reduce((s,h) => s + (h.faturamento||0), 0);
            const totLucro = ano.reduce((s,h) => s + (h.lucro||0), 0);
            return `
            <div class="card" style="margin-top:1.5rem;">
                <h3 style="margin-bottom:1.25rem; font-size:0.95rem;">Consolidado Anual — ${yr}</h3>
                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem;">
                    ${[
                        { label: 'Faturamento Total', val: totFat,          color: 'var(--accent-blue)' },
                        { label: 'Lucro Total',        val: totLucro,        color: totLucro>=0?'#1D9E75':'#E24B4A' },
                        { label: 'Margem Média',       val: totFat>0 ? ((totLucro/totFat)*100).toFixed(1)+'%' : '—', color: 'var(--accent-gold)', isStr: true }
                    ].map(k => `
                        <div style="padding:1.25rem; background:var(--bg-elevated); border-radius:var(--radius-card); text-align:center;">
                            <div style="font-size:0.68rem; font-weight:700; color:var(--text-secondary); margin-bottom:6px; letter-spacing:0.6px; text-transform:uppercase;">${k.label}</div>
                            <div style="font-size:1.5rem; font-weight:800; color:${k.color};">${k.isStr ? k.val : 'R$ '+k.val.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                        </div>`).join('')}
                </div>
            </div>`;
        })() : ''}
    `;
}

// ── TAB: CUSTOS ───────────────────────────────────────────────────────────────
function _relCustos() {
    const panel = document.getElementById('rel-panel-custos');
    if (!panel) return;

    const data   = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    const fmt    = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    if (!data) {
        panel.innerHTML = `<div class="card"><p style="color:var(--text-secondary);">Sem dados de balanço. Acesse Finanças e salve um balanço para ver a análise de custos.</p></div>`;
        return;
    }

    const totais = window.calcularTotais ? window.calcularTotais(data) : {};
    const fat    = data.faturamento || 1;

    const custos = [
        { label: 'Folha de Pagamento',   val: data.folha||0,                  tipo: 'Fixo',     badge: '#E24B4A' },
        { label: 'Aluguel',              val: data.aluguel||0,                tipo: 'Fixo',     badge: '#E24B4A' },
        { label: 'Insumos',               val: data.insumos||0,                tipo: 'Variável', badge: '#ffd60a' },
        { label: 'Impostos',             val: data.impostos||0,               tipo: 'Variável', badge: '#ffd60a' },
        { label: 'Taxas Cartão',         val: data.taxasCartao||0,            tipo: 'Variável', badge: '#ffd60a' },
        { label: 'Marketing',            val: data.marketing||0,              tipo: 'Fixo',     badge: '#E24B4A' },
        { label: 'Sistemas / Software',  val: data.sistemas||0,               tipo: 'Fixo',     badge: '#E24B4A' },
        { label: 'Boletos Fornecedores', val: data.boletosFornecedores||0,    tipo: 'Variável', badge: '#ffd60a' },
        { label: 'Contabilidade',        val: data.contabilidade||0,          tipo: 'Fixo',     badge: '#E24B4A' },
        { label: 'Telecom',              val: data.telecom||0,                tipo: 'Fixo',     badge: '#E24B4A' },
        { label: 'Comissões',            val: data.comissoes||0,              tipo: 'Variável', badge: '#ffd60a' },
        { label: 'Lab Terceirizado',     val: data.labTerceirizado||0,        tipo: 'Variável', badge: '#ffd60a' },
        { label: 'Outros Variáveis',     val: data.outrosVariaveis||0,        tipo: 'Variável', badge: '#ffd60a' },
        { label: 'Outros Fixos',         val: data.outrosFixos||0,            tipo: 'Fixo',     badge: '#E24B4A' },
    ].filter(c => c.val > 0).sort((a, b) => b.val - a.val);

    const top5 = custos.slice(0, 5);
    const pe   = totais.margemContribuicao > 0
        ? (totais.totalFixos / (totais.margemContribuicao / fat)).toFixed(2)
        : 0;

    panel.innerHTML = `
        <!-- Summary -->
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.5rem;">
            ${[
                { label: 'Total Custos Fixos',     val: fmt(totais.totalFixos),     color: '#E24B4A' },
                { label: 'Total Custos Variáveis', val: fmt(totais.totalVariaveis), color: 'var(--color-warning)' },
                { label: 'Custo Total',            val: fmt((totais.totalFixos||0)+(totais.totalVariaveis||0)), color: '#ff9500' },
                { label: 'Ponto de Equilíbrio',    val: fmt(parseFloat(pe)),        color: 'var(--accent-gold)' }
            ].map(k => `
                <div style="padding:1.25rem 1rem; background:${_statBg()}; border:${_statBor()}; border-radius:var(--radius-card); text-align:center;">
                    <div style="font-size:0.65rem; font-weight:700; color:var(--text-secondary); margin-bottom:5px; letter-spacing:0.6px; text-transform:uppercase;">${k.label}</div>
                    <div style="font-size:1.25rem; font-weight:800; color:${k.color};">${k.val}</div>
                </div>`).join('')}
        </div>

        <div style="display:grid; grid-template-columns:2fr 1fr; gap:1.5rem;">
            <!-- Top costs table -->
            <div class="card">
                <h3 style="margin-bottom:1.25rem; font-size:0.95rem;">Ranking de Custos</h3>
                ${custos.length === 0
                    ? `<p style="color:var(--text-secondary);">Nenhum custo registrado.</p>`
                    : `${custos.map((c, i) => {
                        const pct = ((c.val / fat) * 100).toFixed(1);
                        return `
                        <div style="display:flex; align-items:center; gap:0.875rem; padding:0.75rem 0; border-bottom:1px solid var(--border);">
                            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); width:20px; flex-shrink:0; text-align:right;">${i+1}</span>
                            <div style="flex:1; min-width:0;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                    <span style="font-size:0.875rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.label}</span>
                                    <span style="font-size:0.78rem; font-weight:800; color:${c.badge}; margin-left:1rem; flex-shrink:0;">${fmt(c.val)}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <div style="flex:1; height:4px; border-radius:2px; background:var(--border); overflow:hidden;">
                                        <div style="height:100%; width:${Math.min(100,parseFloat(pct))}%; background:${c.badge}; border-radius:2px;"></div>
                                    </div>
                                    <span style="font-size:0.68rem; color:var(--text-muted); flex-shrink:0;">${pct}% fat.</span>
                                    <span style="padding:1px 7px; border-radius:20px; font-size:0.62rem; font-weight:700; text-transform:uppercase; border:1px solid ${c.badge}50; color:${c.badge};">${c.tipo}</span>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}`
                }
            </div>
            <!-- Composition donut -->
            <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <h3 style="margin-bottom:1.25rem; font-size:0.95rem; align-self:flex-start;">Composição</h3>
                <canvas id="rel-chart-custos-donut" style="max-height:200px; max-width:200px;"></canvas>
            </div>
        </div>
    `;

    // Donut chart
    const donutEl = document.getElementById('rel-chart-custos-donut');
    if (donutEl) {
        if (window._relCustosDonut) window._relCustosDonut.destroy();
        window._relCustosDonut = new Chart(donutEl, {
            type: 'doughnut',
            data: {
                labels: ['Custos Fixos', 'Custos Variáveis', 'Lucro'],
                datasets: [{
                    data: [totais.totalFixos||0, totais.totalVariaveis||0, Math.max(0, totais.lucroGerencial||0)],
                    backgroundColor: ['#E24B4A', '#ffd60a', '#1D9E75'],
                    borderWidth: 0, spacing: 3
                }]
            },
            options: {
                cutout: '70%',
                plugins: { legend: { position: 'bottom', labels: { color: _chartTick(), font: { family: 'Montserrat', size: 10 }, padding: 10 } } }
            }
        });
    }
}

// ── TAB: SERVIÇOS ─────────────────────────────────────────────────────────────
function _relServicos() {
    const panel = document.getElementById('rel-panel-servicos');
    if (!panel) return;

    const servicos = JSON.parse(localStorage.getItem('pav_servicos') || '[]');
    const fmt      = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    if (servicos.length === 0) {
        panel.innerHTML = `<div class="card"><div class="pav-empty-state"><h3>Nenhum serviço precificado</h3><p>Acesse a aba <strong>Precificação</strong> e salve serviços para ver a análise aqui.</p></div></div>`;
        return;
    }

    const sorted = [...servicos].sort((a, b) => (b.margem||0) - (a.margem||0));

    panel.innerHTML = `
        <div class="card">
            <h3 style="margin-bottom:1.25rem; font-size:0.95rem;">Ranking por Margem de Lucro</h3>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:0.875rem;">
                    <thead>
                        <tr style="border-bottom:1px solid var(--border);">
                            <th style="text-align:left; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">#</th>
                            <th style="text-align:left; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Serviço</th>
                            <th style="text-align:right; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Preço</th>
                            <th style="text-align:right; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Custo</th>
                            <th style="text-align:right; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Lucro</th>
                            <th style="text-align:center; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Margem</th>
                            <th style="text-align:center; padding:0.625rem 0.875rem; color:var(--text-secondary); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Saúde</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map((s, i) => {
                            const margem  = parseFloat(s.margem) || 0;
                            const health  = margem >= 30 ? { label: 'Ótima',   color: '#1D9E75' }
                                          : margem >= 15 ? { label: 'Regular', color: '#ff9500' }
                                          :                { label: 'Crítica', color: '#E24B4A' };
                            return `<tr style="border-bottom:1px solid var(--border);" onmouseover="this.style.background='${_rowBg()}'" onmouseout="this.style.background='transparent'">
                                <td style="padding:0.625rem 0.875rem; color:var(--text-muted); font-size:0.8rem;">${i+1}</td>
                                <td style="padding:0.625rem 0.875rem; font-weight:700;">${s.nome || '—'}</td>
                                <td style="padding:0.625rem 0.875rem; text-align:right; color:var(--accent-blue); font-weight:700;">${fmt(s.preco)}</td>
                                <td style="padding:0.625rem 0.875rem; text-align:right; color:#E24B4A;">${fmt(s.custoTotal)}</td>
                                <td style="padding:0.625rem 0.875rem; text-align:right; color:#1D9E75; font-weight:700;">${fmt(s.lucro)}</td>
                                <td style="padding:0.625rem 0.875rem; text-align:center; font-weight:800; color:${health.color};">${margem.toFixed(1)}%</td>
                                <td style="padding:0.625rem 0.875rem; text-align:center;">
                                    <span style="padding:2px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; background:${health.color}20; color:${health.color}; border:1px solid ${health.color}50;">${health.label}</span>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Recommendation alerts -->
        ${sorted.filter(s => (s.margem||0) < 15).length > 0 ? `
        <div class="card" style="margin-top:1.5rem; border-left:3px solid #E24B4A;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:1rem;">
                <span style="color:#E24B4A;">${IC.alert}</span>
                <h3 style="margin:0; font-size:0.95rem;">Serviços com Margem Crítica (&lt;15%)</h3>
            </div>
            ${sorted.filter(s => (s.margem||0) < 15).map(s => `
                <div style="padding:0.75rem 1rem; background:rgba(226,75,74,0.06); border-radius:var(--radius-sm); margin-bottom:0.5rem; font-size:0.875rem;">
                    <strong>${s.nome}</strong> — margem de <strong style="color:#E24B4A;">${(s.margem||0).toFixed(1)}%</strong>. Considere revisar o preço ou reduzir custos.
                </div>`).join('')}
        </div>` : ''}
    `;
}

// ── TAB: EXPORTAÇÃO ───────────────────────────────────────────────────────────
function _relExportacao() {
    const panel = document.getElementById('rel-panel-exportacao');
    if (!panel) return;

    panel.innerHTML = `
        <!-- Branding -->
        <div class="card" style="margin-bottom:1.5rem;">
            <h3 class="text-gold" style="margin-bottom:0.5rem; font-size:0.95rem;">Configurações de Marca (Branding)</h3>
            <p style="color:var(--text-secondary); font-size:0.82rem; margin-bottom:1.25rem;">Personalize suas exportações em PDF com os dados da clínica.</p>
            <div class="form-grid">
                <div class="input-group">
                    <label>Nome da Clínica</label>
                    <input type="text" id="config-clinica-nome" placeholder="Ex: P.A.V. Premium Vet" oninput="localStorage.setItem('pav_brand_nome', this.value)">
                </div>
                <div class="input-group">
                    <label>Responsável / Subtítulo</label>
                    <input type="text" id="config-clinica-resp" placeholder="Ex: Dr. Fulano - CRMV: 12345" oninput="localStorage.setItem('pav_brand_resp', this.value)">
                </div>
            </div>
        </div>

        <!-- Export actions -->
        <div class="card">
            <h3 style="margin-bottom:1.25rem; font-size:0.95rem;">Exportar Dados</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:1rem;">
                <div style="padding:1.5rem; background:rgba(226,75,74,0.06); border:1px solid rgba(226,75,74,0.2); border-radius:var(--radius-card); text-align:center;">
                    <div style="font-weight:700; color:#E24B4A; margin-bottom:0.5rem;">Relatório PDF</div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:1rem;">DRE completo + indicadores. Ideal para entregar ao contador.</p>
                    <button onclick="Utils.setLoading(this,true); setTimeout(()=>{Utils.exportPDF(); Utils.setLoading(this,false);},100)"
                        style="padding:0.6rem 1.5rem; border-radius:var(--radius-sm); border:1px solid rgba(226,75,74,0.4); background:rgba(226,75,74,0.12); color:#E24B4A; font-weight:700; font-size:0.85rem; font-family:var(--font-family); cursor:pointer;">
                        Gerar PDF
                    </button>
                </div>
                <div style="padding:1.5rem; background:rgba(29,158,117,0.06); border:1px solid rgba(29,158,117,0.2); border-radius:var(--radius-card); text-align:center;">
                    <div style="font-weight:700; color:#1D9E75; margin-bottom:0.5rem;">Planilha Excel</div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:1rem;">Dados do balanço em formato .xlsx para análise.</p>
                    <button onclick="Utils.setLoading(this,true); setTimeout(()=>{Utils.exportExcel(); Utils.setLoading(this,false);},100)"
                        style="padding:0.6rem 1.5rem; border-radius:var(--radius-sm); border:1px solid rgba(29,158,117,0.4); background:rgba(29,158,117,0.12); color:#1D9E75; font-weight:700; font-size:0.85rem; font-family:var(--font-family); cursor:pointer;">
                        Gerar Excel
                    </button>
                </div>
                <div style="padding:1.5rem; background:rgba(10,132,255,0.06); border:1px solid rgba(10,132,255,0.2); border-radius:var(--radius-card); text-align:center;">
                    <div style="font-weight:700; color:var(--accent-blue); margin-bottom:0.5rem;">Extrato CSV</div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:1rem;">Todas as movimentações de receitas e despesas em .csv.</p>
                    <button onclick="window.exportCaixaCSV()"
                        style="padding:0.6rem 1.5rem; border-radius:var(--radius-sm); border:1px solid rgba(10,132,255,0.4); background:rgba(10,132,255,0.12); color:var(--accent-blue); font-weight:700; font-size:0.85rem; font-family:var(--font-family); cursor:pointer;">
                        Exportar CSV
                    </button>
                </div>
            </div>
        </div>
    `;

    // Restore saved branding values
    const nome = localStorage.getItem('pav_brand_nome') || '';
    const resp = localStorage.getItem('pav_brand_resp') || '';
    const nomeEl = document.getElementById('config-clinica-nome');
    const respEl = document.getElementById('config-clinica-resp');
    if (nomeEl) nomeEl.value = nome;
    if (respEl) respEl.value = resp;
}

// ── LIVE BALANÇO ──────────────────────────────────────────────────────────────
window.updateLiveBalanco = function() {
    const getVal = id => parseFloat(document.getElementById(id)?.value) || 0;
    const dados = {
        faturamento: getVal('faturamento'),
        reembolsoInadimplencia: getVal('reembolsoInadimplencia'), impostos: getVal('impostos'),
        taxasCartao: getVal('taxasCartao'), insumos: getVal('insumos'), boletosFornecedores: getVal('boletosFornecedores'),
        terceirizadosVar: getVal('terceirizadosVar'), labTerceirizado: getVal('labTerceirizado'),
        comissoes: getVal('comissoes'), plantoes: getVal('plantoes'), escritorioLimpezaVar: getVal('escritorioLimpezaVar'),
        estorno: getVal('estorno'), outrosVariaveis: getVal('outrosVariaveis'),
        folha: getVal('folha'), agua: getVal('agua'), luz: getVal('luz'), sistemas: getVal('sistemas'),
        aluguel: getVal('aluguel'), telecom: getVal('telecom'), contabilidade: getVal('contabilidade'),
        marketing: getVal('marketing'), esocial: getVal('esocial'), taxasAdmin: getVal('taxasAdmin'),
        crmv: getVal('crmv'), lixoContaminante: getVal('lixoContaminante'), iptu: getVal('iptu'),
        limpezaFixa: getVal('limpezaFixa'), terceirizadosFixos: getVal('terceirizadosFixos'), outrosFixos: getVal('outrosFixos')
    };
    const totais = window.calcularTotais ? window.calcularTotais(dados) : {};
    if (!totais || !Object.keys(totais).length) return;

    const fat    = totais.faturamento || 1;
    const mc     = totais.margemContribuicao / fat;
    const be     = mc > 0 ? totais.totalFixos / mc : 0;
    const fmt    = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    const lucroEl = document.getElementById('live-lucro');
    const beEl    = document.getElementById('live-breakeven');
    const varEl   = document.getElementById('live-var');
    const fixEl   = document.getElementById('live-fix');

    if (varEl) varEl.innerText = fmt(totais.totalVariaveis);
    if (fixEl) fixEl.innerText = fmt(totais.totalFixos);
    if (lucroEl) { lucroEl.innerText = fmt(totais.lucroGerencial); lucroEl.style.color = totais.lucroGerencial >= 0 ? '#1D9E75' : '#E24B4A'; }
    if (beEl) {
        if (mc <= 0 && totais.totalFixos > 0) { beEl.innerText = 'MARGEM NEGATIVA'; beEl.style.color = '#E24B4A'; beEl.style.fontSize = '0.9rem'; }
        else { beEl.innerText = fmt(be); beEl.style.color = 'var(--accent-gold)'; beEl.style.fontSize = '1.1rem'; }
    }

    // ── Chips de total nas seções colapsíveis ─────────────────────────────────
    const chipVar = document.getElementById('chip-variavel');
    const chipFix = document.getElementById('chip-fixo');
    if (chipVar) {
        if (totais.totalVariaveis > 0) {
            chipVar.textContent = fmt(totais.totalVariaveis);
            chipVar.style.display = 'inline';
        } else {
            chipVar.style.display = 'none';
        }
    }
    if (chipFix) {
        if (totais.totalFixos > 0) {
            chipFix.textContent = fmt(totais.totalFixos);
            chipFix.style.display = 'inline';
        } else {
            chipFix.style.display = 'none';
        }
    }
};

// ============================================================
// FEATURE 1.5 — DRE EM PDF
// Fase 1 — adicionado ao final do arquivo, não altera código existente
// ============================================================

window.generateDREPdf = function(financialData, clinicInfo, period) {
    // financialData: objeto com campos do balanço calculados (window.calcularTotais)
    // clinicInfo: { nome, cnpj, responsavel, regime }
    // period: string legível, ex: 'Março/2025'

    if (typeof window.jspdf === 'undefined') {
        Utils.showToast('Biblioteca PDF não carregada. Recarregue a página.', 'error');
        return;
    }

    const { jsPDF }  = window.jspdf;
    const doc        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW      = doc.internal.pageSize.getWidth();
    const pageH      = doc.internal.pageSize.getHeight();
    const margin     = 14;
    const colW       = pageW - 2 * margin;

    const fmtBRL = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
    const pct    = (v, total) => total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%';

    // ── Calcular linhas do DRE ──────────────────────────────────────────
    const t = window.calcularTotais ? window.calcularTotais(financialData) : {};
    const receitaBruta   = financialData.faturamento    || 0;
    const deducoes       = Math.abs(financialData.deducoes || 0);
    const receitaLiquida = receitaBruta - deducoes;
    const custoVariavel  = t.totalVariaveis             || 0;
    const margemContrib  = t.margemContribuicao         || (receitaLiquida - custoVariavel);
    const custoFixo      = t.totalFixos                 || 0;
    const ebitda         = margemContrib - custoFixo;
    const proLabore      = parseFloat(financialData.proLabore || 0);
    const lucroLiquido   = t.lucroGerencial             || (ebitda - proLabore);
    const qtdAtend       = parseFloat(financialData.qtdAtendimentos) || 0;
    const ticketMedio    = qtdAtend > 0 ? receitaBruta / qtdAtend : 0;
    const pe             = margemContrib > 0 ? (custoFixo / (margemContrib / receitaBruta)) : 0;

    // ── Cabeçalho ──────────────────────────────────────────────────────
    doc.setFillColor(15, 77, 63); // --brand-primary
    doc.rect(0, 0, pageW, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16).setFont('helvetica', 'bold');
    doc.text('PAVE', margin, 11);

    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text('Demonstrativo de Resultado do Exercício (DRE)', margin, 18);
    doc.text(period, margin, 24);

    doc.setFontSize(9);
    doc.text(clinicInfo.nome || '', pageW - margin, 11, { align: 'right' });
    doc.text('CNPJ: ' + (clinicInfo.cnpj || 'Não informado'), pageW - margin, 18, { align: 'right' });
    doc.text('Regime: ' + (clinicInfo.regime || 'Não informado'), pageW - margin, 24, { align: 'right' });

    // ── Tabela DRE ─────────────────────────────────────────────────────
    const rows = [
        { desc: 'Receita Bruta',               val: fmtBRL(receitaBruta),   pctVal: pct(receitaBruta,  receitaBruta), style: 'section'    },
        { desc: '(-) Deduções / Impostos',     val: fmtBRL(deducoes),       pctVal: pct(deducoes,      receitaBruta), style: 'normal'     },
        { desc: '(=) Receita Líquida',         val: fmtBRL(receitaLiquida), pctVal: pct(receitaLiquida, receitaBruta), style: 'total'     },
        { desc: '(-) Custos Variáveis',        val: fmtBRL(custoVariavel),  pctVal: pct(custoVariavel,  receitaBruta), style: 'normal'    },
        { desc: '(=) Margem de Contribuição',  val: fmtBRL(margemContrib),  pctVal: pct(margemContrib,  receitaBruta), style: 'total'     },
        { desc: '(-) Custos Fixos',            val: fmtBRL(custoFixo),      pctVal: pct(custoFixo,      receitaBruta), style: 'normal'    },
        { desc: '(=) EBITDA',                  val: fmtBRL(ebitda),         pctVal: pct(ebitda,         receitaBruta), style: 'total'     },
        { desc: '(-) Pró-labore',              val: fmtBRL(proLabore),      pctVal: pct(proLabore,      receitaBruta), style: 'normal'    },
        { desc: '(=) Lucro Líquido',           val: fmtBRL(lucroLiquido),   pctVal: pct(lucroLiquido,   receitaBruta), style: 'highlight' },
    ];

    doc.autoTable({
        startY: 36,
        head: [['Descrição', 'Valor', '% Receita']],
        body: rows.map(r => [r.desc, r.val, r.pctVal]),
        columnStyles: {
            0: { cellWidth: colW * 0.55 },
            1: { cellWidth: colW * 0.25, halign: 'right' },
            2: { cellWidth: colW * 0.20, halign: 'right' },
        },
        styles:     { fontSize: 10, font: 'helvetica', cellPadding: 4 },
        headStyles: { fillColor: [15, 77, 63], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [244, 247, 245] },
        didParseCell: data => {
            if (data.section !== 'body') return;
            const style = rows[data.row.index]?.style;
            if (style === 'total') {
                data.cell.styles.fontStyle  = 'bold';
                data.cell.styles.fillColor  = [225, 245, 238];
            }
            if (style === 'section') {
                data.cell.styles.fillColor  = [15, 77, 63];
                data.cell.styles.textColor  = 255;
                data.cell.styles.fontStyle  = 'bold';
            }
            if (style === 'highlight') {
                const isPos = lucroLiquido >= 0;
                data.cell.styles.fillColor  = isPos ? [29, 158, 117] : [226, 75, 74];
                data.cell.styles.textColor  = 255;
                data.cell.styles.fontStyle  = 'bold';
                data.cell.styles.fontSize   = 11;
            }
        },
    });

    // ── Indicadores ────────────────────────────────────────────────────
    let nextY = doc.lastAutoTable.finalY + 10;
    if (nextY > pageH - 70) { doc.addPage(); nextY = 20; }
    doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
    doc.text('Indicadores do Período', margin, nextY);

    const metaFat   = parseFloat(financialData.metaFaturamento) || 0;
    const metaLucro = parseFloat(financialData.metaLucro)       || 0;

    doc.autoTable({
        startY: nextY + 4,
        head: [['Indicador', 'Valor', 'Observação']],
        body: [
            ['Margem de Lucro Líquido',  pct(lucroLiquido, receitaBruta),   lucroLiquido >= 0 ? 'Resultado positivo' : 'Resultado negativo — atenção'],
            ['Margem de Contribuição',   pct(margemContrib, receitaBruta),  margemContrib >= custoFixo ? 'Cobre custos fixos' : 'Abaixo dos custos fixos'],
            ['Ponto de Equilíbrio',      fmtBRL(pe),                        receitaBruta > 0 ? (receitaBruta >= pe ? 'Atingido' : 'Não atingido') : '—'],
            ['Ticket Médio',             fmtBRL(ticketMedio),               qtdAtend > 0 ? qtdAtend + ' atendimentos' : 'Sem dados de atendimentos'],
            ['Meta Faturamento',         fmtBRL(metaFat),                   metaFat > 0 ? pct(receitaBruta, metaFat) + ' realizado' : 'Não definida'],
            ['Meta Lucro',               fmtBRL(metaLucro),                 metaLucro > 0 ? pct(lucroLiquido, metaLucro) + ' realizado' : 'Não definida'],
        ],
        columnStyles: {
            0: { cellWidth: colW * 0.35 },
            1: { cellWidth: colW * 0.25, halign: 'right' },
            2: { cellWidth: colW * 0.40 },
        },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 98, 155], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [244, 247, 253] },
    });

    // ── Divisão do Lucro ───────────────────────────────────────────────
    nextY = doc.lastAutoTable.finalY + 10;
    if (nextY > pageH - 60) { doc.addPage(); nextY = 20; }
    doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
    doc.text('Divisão do Lucro', margin, nextY);

    let divConfig = { proLaborePerc: 50, investimentoPerc: 30, reservaPerc: 20 };
    try {
        const saved = JSON.parse(localStorage.getItem('pav_divisao_lucro') || '{}');
        if (saved.proLaborePerc) divConfig = saved;
    } catch(e) {}

    const vlPL  = lucroLiquido * (divConfig.proLaborePerc   / 100);
    const vlInv = lucroLiquido * (divConfig.investimentoPerc / 100);
    const vlRes = lucroLiquido * (divConfig.reservaPerc     / 100);

    doc.autoTable({
        startY: nextY + 4,
        head: [['Destinação', 'Percentual', 'Valor']],
        body: [
            ['Pró-labore',       divConfig.proLaborePerc   + '%', fmtBRL(vlPL)],
            ['Reinvestimento',   divConfig.investimentoPerc + '%', fmtBRL(vlInv)],
            ['Reserva de Caixa', divConfig.reservaPerc     + '%', fmtBRL(vlRes)],
            ['Lucro Líquido',    '100%',                          fmtBRL(lucroLiquido)],
        ],
        columnStyles: {
            0: { cellWidth: colW * 0.45 },
            1: { cellWidth: colW * 0.25, halign: 'center' },
            2: { cellWidth: colW * 0.30, halign: 'right' },
        },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 77, 63], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [244, 247, 245] },
        didParseCell: (d) => {
            if (d.section === 'body' && d.row.index === 3) {
                d.cell.styles.fontStyle = 'bold';
                d.cell.styles.fillColor = lucroLiquido >= 0 ? [29, 158, 117] : [226, 75, 74];
                d.cell.styles.textColor = 255;
            }
        },
    });

    // ── Rodapé em todas as páginas ─────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.line(margin, pageH - 13, pageW - margin, pageH - 13);
        doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(140);
        doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · PAVE Financial`, margin, pageH - 7);
        doc.text('Este documento é informativo. Consulte um contador para fins fiscais.', pageW / 2, pageH - 7, { align: 'center' });
        doc.text(`Pág. ${i}/${pageCount}`, pageW - margin, pageH - 7, { align: 'right' });
    }

    const filename = `DRE_${period.replace('/', '-')}.pdf`;
    doc.save(filename);
    return filename;
};

// ── FEATURE 1.2 — FLUXO DE CAIXA PROJETADO ───────────────────────────────────

window.loadProjectedCashflow = async function() {
    const container = document.getElementById('projected-cashflow-chart');
    if (!container) return;

    const orgId = await OrgAPI.getOrgId();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const deadline = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];

    // Saldo atual a partir dos movimentos locais
    const movimentos = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    const currentBalance = movimentos.reduce((acc, m) => {
        return acc + (m.tipo === 'receita' ? (m.valor || 0) : -(m.valor || 0));
    }, 0);

    // Bills futuros (requer orgId e tabela bills)
    let futureBills = [];
    if (orgId) {
        try {
            const { data } = await _supabase
                .from('bills')
                .select('type, amount, due_date, description')
                .eq('organization_id', orgId)
                .in('status', ['open', 'overdue'])
                .gte('due_date', todayStr)
                .lte('due_date', deadline);
            futureBills = data || [];
        } catch (e) { /* silencioso */ }
    }

    // Recorrências do caixa local
    const recurrents = movimentos.filter(m => m.isRecurring || m.recorrencia === 'mensal');

    const projection = _buildDailyProjection(currentBalance, futureBills, recurrents, 30);
    _renderProjectionChart(container, projection);
};

function _buildDailyProjection(startBalance, bills, recurrents, days) {
    const result = [];
    const today  = new Date();
    let balance  = startBalance;

    for (let i = 0; i <= days; i++) {
        const date    = new Date(today.getTime() + i * 86400000);
        const dateStr = date.toISOString().split('T')[0];
        let dailyDelta = 0;
        const sources  = [];

        // Bills agendados para este dia
        bills.filter(b => b.due_date === dateStr).forEach(b => {
            const sign = b.type === 'receivable' ? 1 : -1;
            dailyDelta += sign * parseFloat(b.amount);
            sources.push({ label: b.description || b.type, amount: sign * parseFloat(b.amount) });
        });

        // Recorrências mensais que caem neste dia do mês
        recurrents.forEach(r => {
            const origDate = new Date(r.vencimento || r.date || '');
            if (!isNaN(origDate) && origDate.getDate() === date.getDate()) {
                const sign = r.tipo === 'receita' ? 1 : -1;
                dailyDelta += sign * (r.valor || 0);
            }
        });

        balance += dailyDelta;
        result.push({ date: dateStr, balance, delta: dailyDelta, sources });
    }
    return result;
}

function _renderProjectionChart(canvas, projection) {
    if (typeof Chart === 'undefined') return;

    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    const fmtBRL = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const labels   = projection.map(p => p.date.slice(5).replace('-', '/'));
    const balances = projection.map(p => p.balance);
    const minValue = Math.min(...balances, 0);
    const hasNeg   = minValue < 0;

    new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Saldo Projetado',
                data: balances,
                borderColor: '#1D9E75',
                backgroundColor: 'rgba(29,158,117,0.08)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: hasNeg ? minValue * 1.15 : 0,
                    grid: { color: _chartGrid() },
                    ticks: {
                        color: 'var(--text-secondary)',
                        callback: v => new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(v),
                    },
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'var(--text-secondary)', maxTicksLimit: 10 },
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: ctx => `${ctx[0].label}`,
                        label: ctx => {
                            const point = projection[ctx.dataIndex];
                            const lines = [`Saldo: ${fmtBRL(ctx.parsed.y)}`];
                            if (point.sources.length) {
                                lines.push('─');
                                point.sources.forEach(s => lines.push(`${s.label}: ${fmtBRL(s.amount)}`));
                            }
                            return lines;
                        }
                    }
                }
            }
        }
    });

    // Alerta de saldo negativo
    const negDays = projection.filter(p => p.balance < 0).length;
    const alertEl = document.getElementById('projected-cashflow-alert');
    if (alertEl) {
        if (negDays > 0) {
            alertEl.textContent = `⚠ Saldo projetado negativo em ${negDays} dia(s) dos próximos 30. Revise as contas a pagar.`;
            alertEl.style.display = 'block';
        } else {
            alertEl.style.display = 'none';
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// FASE 2 — FEATURES 2.1, 2.2, 2.3, 2.4
// ══════════════════════════════════════════════════════════════════════════════

// ── FEATURE 2.1 — SCORE DE SAÚDE FINANCEIRA ──────────────────────────────────

window.renderHealthScore = function() {
    const el = document.getElementById('health-score-widget');
    if (!el) return;

    const data   = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    if (!data) { el.innerHTML = ''; return; }

    const totais = window.calcularTotais ? window.calcularTotais(data) : {};
    const fat    = totais.faturamento || 0;
    if (fat <= 0) { el.innerHTML = ''; return; }

    const lucroPct   = fat > 0 ? (totais.lucroGerencial / fat) * 100 : 0;
    const fixosPct   = fat > 0 ? (totais.totalFixos / fat) * 100 : 100;
    const movs       = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    const saldo      = movs.reduce((a, m) => a + (m.tipo === 'receita' ? (m.valor||0) : -(m.valor||0)), 0);
    let historicoAll; try { historicoAll = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch { historicoAll = []; }

    // Score components (each 0–100):
    // 1. Margem líquida  (≥20% → 100, 0% → 0)
    const scoreMargem = Math.max(0, Math.min(100, lucroPct * 5));
    // 2. Controle de fixos (≤40% → 100, ≥80% → 0)
    const scoreFixos  = Math.max(0, Math.min(100, (80 - fixosPct) * 2.5));
    // 3. Liquidez (saldo ≥ 1 mês de fixos → 100)
    const metaReserva = totais.totalFixos || 1;
    const scoreLiq    = Math.max(0, Math.min(100, (saldo / metaReserva) * 100));
    // 4. Tendência (lucro crescente vs mês anterior → bônus)
    const idxAtual   = data ? historicoAll.findIndex(h => h.mesRef === data.mesReferencia) : -1;
    const anterior   = idxAtual > 0 ? historicoAll[idxAtual - 1] : null;
    const crescimento = anterior ? totais.lucroGerencial - (parseFloat(anterior.lucro) || 0) : 0;
    const scoreTend  = Math.max(0, Math.min(100, 50 + crescimento / (metaReserva * 0.1)));

    const score = Math.round((scoreMargem * 0.35 + scoreFixos * 0.25 + scoreLiq * 0.25 + scoreTend * 0.15));
    const clamp = Math.max(0, Math.min(100, score));

    let grade, color, bg, desc;
    if (clamp >= 80)      { grade = 'A'; color = '#1D9E75'; bg = 'rgba(29,158,117,0.08)'; desc = 'Excelente'; }
    else if (clamp >= 65) { grade = 'B'; color = '#4db6ac'; bg = 'rgba(77,182,172,0.08)'; desc = 'Bom'; }
    else if (clamp >= 50) { grade = 'C'; color = '#ff9500'; bg = 'rgba(255,149,0,0.08)';   desc = 'Regular'; }
    else if (clamp >= 35) { grade = 'D'; color = '#ff6b35'; bg = 'rgba(255,107,53,0.08)';  desc = 'Atenção'; }
    else                  { grade = 'E'; color = '#E24B4A'; bg = 'rgba(226,75,74,0.08)';   desc = 'Crítico'; }

    const arc = clamp / 100;
    const r   = 40;  /* raio — viewBox 110x110, centro em 55,55 */
    const circumference = 2 * Math.PI * r;
    const dash = circumference * arc;

    const components = [
        { label: 'Margem Líquida',  val: Math.round(scoreMargem), detail: `${lucroPct.toFixed(1)}%` },
        { label: 'Controle Fixos',  val: Math.round(scoreFixos),  detail: `${fixosPct.toFixed(1)}% da receita` },
        { label: 'Liquidez',        val: Math.round(scoreLiq),    detail: saldo >= 0 ? `R$ ${saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : 'Negativo' },
        { label: 'Tendência',       val: Math.round(Math.max(0, Math.min(100, scoreTend))), detail: crescimento >= 0 ? '↑ Crescendo' : '↓ Queda' },
    ];

    el.innerHTML = `
    <div style="background:${bg}; border:1px solid ${color}33; border-radius:var(--radius-card); padding:1.25rem 1.5rem; display:flex; align-items:center; gap:1.75rem; flex-wrap:wrap;">
        <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
            <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="${r}" fill="none" stroke="rgba(128,128,128,0.18)" stroke-width="8"/>
                <circle cx="55" cy="55" r="${r}" fill="none" stroke="${color}" stroke-width="8"
                    stroke-dasharray="${dash} ${circumference}"
                    stroke-dashoffset="${circumference * 0.25}"
                    stroke-linecap="round"
                    style="transition: stroke-dasharray 0.6s ease;"/>
                <text x="55" y="51" text-anchor="middle" fill="${color}" font-size="24" font-weight="800" font-family="Montserrat,system-ui,sans-serif">${clamp}</text>
                <text x="55" y="65" text-anchor="middle" fill="${color}" font-size="10" font-weight="700" font-family="Montserrat,system-ui,sans-serif">${grade} · ${desc}</text>
            </svg>
            <span style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">Score de Saúde</span>
        </div>
        <div style="flex:1; min-width:220px;">
            <div style="font-weight:700; color:var(--text-primary); margin-bottom:0.75rem; font-size:0.9rem;">Componentes do Score</div>
            ${components.map(c => {
                const cpct = c.val;
                const cc   = cpct >= 70 ? '#1D9E75' : cpct >= 45 ? '#ff9500' : '#E24B4A';
                return `<div style="margin-bottom:0.7rem;">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:0.75rem; margin-bottom:4px; gap:0.5rem;">
                        <span style="color:var(--text-secondary); white-space:nowrap;">${c.label}</span>
                        <span style="color:${cc}; font-weight:700; white-space:nowrap; flex-shrink:0;">${c.val}/100 <span style="color:var(--text-muted); font-weight:400;">(${c.detail})</span></span>
                    </div>
                    <div style="height:6px; border-radius:4px; background:rgba(128,128,128,0.15); overflow:hidden;">
                        <div style="height:100%; width:${cpct}%; background:${cc}; border-radius:4px; transition:width 0.6s ease;"></div>
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
};

// ── FEATURE 2.2 — ALERTAS INTELIGENTES PROATIVOS ─────────────────────────────

window.renderSmartAlerts = function() {
    const container = document.getElementById('smart-alerts-container');
    if (!container) return;

    const data    = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    const totais  = data && window.calcularTotais ? window.calcularTotais(data) : {};
    const fat     = totais.faturamento || 0;

    const dismissKey = `pav_dismissed_alerts_${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
    const dismissed  = JSON.parse(localStorage.getItem(dismissKey) || '[]');

    const alerts = [];

    // 1. Margem líquida baixa
    if (fat > 0) {
        const lucroPct = (totais.lucroGerencial / fat) * 100;
        if (lucroPct < 10) {
            alerts.push({ id: 'low-margin', type: 'danger',
                title: 'Margem Líquida Crítica',
                msg: `Seu lucro líquido é apenas ${lucroPct.toFixed(1)}% da receita. Revise custos ou reajuste preços.` });
        }
    }

    // 2. Custos fixos elevados
    if (fat > 0) {
        const fixosPct = (totais.totalFixos / fat) * 100;
        if (fixosPct > 60) {
            alerts.push({ id: 'high-fixed', type: 'warning',
                title: 'Custos Fixos Elevados',
                msg: `Custos fixos representam ${fixosPct.toFixed(1)}% da receita (referência: <40%). Avalie cortes.` });
        }
    }

    // 3. Saldo de caixa negativo
    const movs  = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    const saldo = movs.reduce((a, m) => a + (m.tipo === 'receita' ? (m.valor||0) : -(m.valor||0)), 0);
    if (saldo < 0) {
        alerts.push({ id: 'neg-cash', type: 'danger',
            title: 'Saldo de Caixa Negativo',
            msg: `Saldo atual: R$ ${saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}. Revise entradas e saídas pendentes.` });
    }

    // 4. Queda de faturamento vs mês anterior
    let hist; try { hist = JSON.parse(localStorage.getItem('pav_historico') || '[]'); } catch { hist = []; }
    if (data && hist.length >= 2) {
        const idx = hist.findIndex(h => h.mesRef === data.mesReferencia);
        if (idx > 0) {
            const prevFat = parseFloat(hist[idx-1].faturamento) || 0;
            if (prevFat > 0 && fat < prevFat * 0.8) {
                const queda = ((prevFat - fat) / prevFat * 100).toFixed(1);
                alerts.push({ id: 'revenue-drop', type: 'warning',
                    title: 'Queda de Faturamento',
                    msg: `Faturamento caiu ${queda}% em relação ao mês anterior. Avalie estratégias de captação.` });
            }
        }
    }

    // 5. Sem balanço no mês atual
    const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
    const temMesAtual = hist.some(h => h.mesRef && h.mesRef.startsWith(mesAtual));
    if (!temMesAtual && hist.length > 0) {
        alerts.push({ id: 'missing-month', type: 'info',
            title: 'Balanço do Mês Não Lançado',
            msg: 'Nenhum balanço consolidado para o mês atual. Lance os dados para manter as análises atualizadas.' });
    }

    const visible = alerts.filter(a => !dismissed.includes(a.id)).slice(0, 2);
    if (visible.length === 0) { container.innerHTML = ''; return; }

    const colorMap = {
        danger:  { border: '#E24B4A', bg: 'rgba(226,75,74,0.07)', icon: '#E24B4A', iconBg: 'rgba(226,75,74,0.12)' },
        warning: { border: '#ff9500', bg: 'rgba(255,149,0,0.07)',  icon: '#ff9500', iconBg: 'rgba(255,149,0,0.12)' },
        info:    { border: 'var(--accent-blue)', bg: 'rgba(10,132,255,0.07)', icon: 'var(--accent-blue)', iconBg: 'rgba(10,132,255,0.12)' },
    };

    container.innerHTML = visible.map(a => {
        const c = colorMap[a.type];
        return `<div id="smart-alert-${a.id}" style="display:flex; align-items:flex-start; gap:0.875rem; padding:0.875rem 1rem; background:${c.bg}; border:1px solid ${c.border}33; border-left:3px solid ${c.border}; border-radius:var(--radius-md); margin-bottom:0.625rem;">
            <span style="flex-shrink:0; width:28px; height:28px; border-radius:50%; background:${c.iconBg}; display:flex; align-items:center; justify-content:center; color:${c.icon};">${IC.alert}</span>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); margin-bottom:2px;">${a.title}</div>
                <div style="font-size:0.78rem; color:var(--text-secondary);">${a.msg}</div>
            </div>
            <button onclick="window._dismissAlert('${a.id}')" style="flex-shrink:0; background:none; border:none; cursor:pointer; color:var(--text-muted); padding:2px 4px; border-radius:4px; font-size:1rem; line-height:1;" title="Dispensar">✕</button>
        </div>`;
    }).join('');
};

window._dismissAlert = function(id) {
    const dismissKey = `pav_dismissed_alerts_${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
    const dismissed  = JSON.parse(localStorage.getItem(dismissKey) || '[]');
    if (!dismissed.includes(id)) dismissed.push(id);
    localStorage.setItem(dismissKey, JSON.stringify(dismissed));
    document.getElementById('smart-alert-' + id)?.remove();
};

// ── FEATURE 2.4 — RANKING DE SERVIÇOS ────────────────────────────────────────


// ── FEATURE 2.3 — COMPARATIVO DE PERÍODO ─────────────────────────────────────

function _relComparativo() {
    const panel = document.getElementById('rel-panel-comparativo');
    if (!panel) return;

    const historico = _filteredHistorico();
    const data      = JSON.parse(localStorage.getItem('pav_ultimos_dados'));

    if (!data || historico.length < 2) {
        panel.innerHTML = `<div class="card"><p style="color:var(--text-muted); text-align:center; padding:2rem;">Consolidações insuficientes para comparativo. É necessário ter ao menos 2 meses no histórico${window.REL_PERIOD ? ' no período selecionado' : ''}.</p></div>`;
        return;
    }

    const fmt   = v  => `R$ ${(parseFloat(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
    const pct   = v  => `${(parseFloat(v)||0).toFixed(1)}%`;
    const delta = (curr, prev) => {
        if (!prev || parseFloat(prev) === 0) return { txt: '—', color: 'var(--text-muted)' };
        const d = ((parseFloat(curr) - parseFloat(prev)) / Math.abs(parseFloat(prev))) * 100;
        const color = d >= 0 ? '#1D9E75' : '#E24B4A';
        return { txt: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}%`, color };
    };

    // Periods: current, previous month, same month last year
    const sortedHist = [...historico].sort((a, b) => (a.mesRef||'').localeCompare(b.mesRef||''));
    const currMes    = data.mesReferencia;
    const currIdx    = sortedHist.findIndex(h => h.mesRef === currMes);
    const prevEntry  = currIdx > 0 ? sortedHist[currIdx - 1] : null;

    // Same month last year
    let sameMthLastYear = null;
    if (currMes && currMes.length >= 7) {
        const [y, m] = currMes.split('-');
        const prevYear = `${parseInt(y)-1}-${m}`;
        sameMthLastYear = sortedHist.find(h => h.mesRef && h.mesRef.startsWith(prevYear)) || null;
    }

    const totaisCurr  = window.calcularTotais ? window.calcularTotais(data) : {};
    const curr = {
        fat:    totaisCurr.faturamento || 0,
        lucro:  totaisCurr.lucroGerencial || 0,
        fixos:  totaisCurr.totalFixos || 0,
        varCosts: totaisCurr.totalVariaveis || 0,
        margem: totaisCurr.faturamento > 0 ? (totaisCurr.lucroGerencial / totaisCurr.faturamento * 100) : 0,
    };

    const extractHist = h => ({
        fat:    parseFloat(h?.faturamento) || 0,
        lucro:  parseFloat(h?.lucro) || 0,
        fixos:  parseFloat(h?.totalFixos) || 0,
        varCosts: parseFloat(h?.totalVariaveis) || 0,
        margem: parseFloat(h?.faturamento) > 0 ? (parseFloat(h.lucro) / parseFloat(h.faturamento) * 100) : 0,
    });

    const prev  = prevEntry ? extractHist(prevEntry) : null;
    const sameY = sameMthLastYear ? extractHist(sameMthLastYear) : null;

    const fmtMes = m => {
        if (!m || !m.includes('-')) return m || '—';
        const [y, mo] = m.split('-');
        const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return `${meses[parseInt(mo)-1] || mo}/${y}`;
    };

    const rows = [
        { label: 'Faturamento',      curr: fmt(curr.fat),      prev: fmt(prev?.fat),      sameY: fmt(sameY?.fat),      deltaPrev: delta(curr.fat, prev?.fat),      deltaY: delta(curr.fat, sameY?.fat) },
        { label: 'Lucro Gerencial',  curr: fmt(curr.lucro),    prev: fmt(prev?.lucro),    sameY: fmt(sameY?.lucro),    deltaPrev: delta(curr.lucro, prev?.lucro),    deltaY: delta(curr.lucro, sameY?.lucro) },
        { label: 'Custos Fixos',     curr: fmt(curr.fixos),    prev: fmt(prev?.fixos),    sameY: fmt(sameY?.fixos),    deltaPrev: delta(curr.fixos, prev?.fixos),    deltaY: delta(curr.fixos, sameY?.fixos) },
        { label: 'Custos Variáveis', curr: fmt(curr.varCosts), prev: fmt(prev?.varCosts), sameY: fmt(sameY?.varCosts), deltaPrev: delta(curr.varCosts, prev?.varCosts), deltaY: delta(curr.varCosts, sameY?.varCosts) },
        { label: 'Margem Líquida',   curr: pct(curr.margem),   prev: pct(prev?.margem),   sameY: pct(sameY?.margem),   deltaPrev: delta(curr.margem, prev?.margem),   deltaY: delta(curr.margem, sameY?.margem) },
    ];

    panel.innerHTML = `
    <div class="card">
        <h3 style="margin:0 0 0.25rem; color:var(--text-primary);">Comparativo de Período</h3>
        <p style="margin:0 0 1.5rem; font-size:0.8rem; color:var(--text-muted);">Comparação entre o mês consolidado mais recente, o mês anterior e o mesmo mês do ano anterior.</p>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
                <thead>
                    <tr style="border-bottom:2px solid var(--border);">
                        <th style="text-align:left; padding:0.625rem 0.75rem; color:var(--text-muted); font-weight:700;">Indicador</th>
                        <th style="text-align:right; padding:0.625rem 0.75rem; color:var(--accent-blue); font-weight:700;">${fmtMes(currMes)}</th>
                        <th style="text-align:right; padding:0.625rem 0.75rem; color:var(--text-muted); font-weight:700;">${prevEntry ? fmtMes(prevEntry.mesRef) : '—'}</th>
                        <th style="text-align:right; padding:0.625rem 0.75rem; color:var(--text-muted); font-weight:700;">vs Anterior</th>
                        <th style="text-align:right; padding:0.625rem 0.75rem; color:var(--text-muted); font-weight:700;">${sameMthLastYear ? fmtMes(sameMthLastYear.mesRef) : 'Ano Ant.'}</th>
                        <th style="text-align:right; padding:0.625rem 0.75rem; color:var(--text-muted); font-weight:700;">vs Ano Ant.</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => `
                    <tr style="border-bottom:1px solid var(--border); transition:background 0.12s;" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background=''">
                        <td style="padding:0.625rem 0.75rem; font-weight:600; color:var(--text-primary);">${r.label}</td>
                        <td style="padding:0.625rem 0.75rem; text-align:right; font-weight:700; color:var(--text-primary);">${r.curr}</td>
                        <td style="padding:0.625rem 0.75rem; text-align:right; color:var(--text-secondary);">${r.prev || '—'}</td>
                        <td style="padding:0.625rem 0.75rem; text-align:right; font-weight:700; color:${r.deltaPrev.color};">${r.deltaPrev.txt}</td>
                        <td style="padding:0.625rem 0.75rem; text-align:right; color:var(--text-secondary);">${r.sameY || '—'}</td>
                        <td style="padding:0.625rem 0.75rem; text-align:right; font-weight:700; color:${r.deltaY.color};">${r.deltaY.txt}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

// ── renderDashboard — definição canônica (async, com pull de monthly_summaries)
window.renderDashboard = async function(forceData) {
    // Se não há forceData e o Balanço do mês atual está vazio, tenta monthly_summaries
    if (!forceData && window.MonthlySummaryAPI) {
        const currentMes = new Date().toISOString().substring(0, 7);
        const local = (typeof FinancialAPI !== 'undefined') ? FinancialAPI.getUltimosDados() : null;
        if (local?.mesReferencia !== currentMes) {
            try {
                const summary = await MonthlySummaryAPI.getForMonth(currentMes);
                if (summary && summary.movements_count > 0) {
                    forceData = {
                        _fromCaixa:    true,
                        _totalCosts:   parseFloat(summary.total_costs) || 0,
                        _movCount:     summary.movements_count,
                        _lastUpdated:  summary.last_updated,
                        mesReferencia: currentMes,
                        faturamento:   parseFloat(summary.revenue) || 0
                    };
                }
            } catch {}
        }
    }
    clearTimeout(_dashboardDebounce);
    _dashboardDebounce = setTimeout(() => {
        _renderDashboardImpl(forceData || null);
        try { window.renderHealthScore?.(); } catch(e) { /* silencioso */ }
        try { window.renderSmartAlerts?.(); } catch(e) { /* silencioso */ }
    }, 80);
};

// ══════════════════════════════════════════════════════════════════════════════
// FASE 3 — FEATURE 3.5: CARTA PARA O CONTADOR + 3.2: CLIENTES EM RELATÓRIOS
// ══════════════════════════════════════════════════════════════════════════════

// ── TAX RATES ────────────────────────────────────────────────────────────────

const TAX_RATES = {
    simples:          { rate: 0.06,   label: 'Simples Nacional (~6%)' },
    simples_nacional: { rate: 0.06,   label: 'Simples Nacional (~6%)' },
    presumido:        { rate: 0.1150, label: 'Lucro Presumido (~11,5%)' },
    lucro_presumido:  { rate: 0.1150, label: 'Lucro Presumido (~11,5%)' },
    real:             { rate: null,   label: 'Lucro Real' },
    lucro_real:       { rate: null,   label: 'Lucro Real' },
};

// ── FEATURE 3.5 — CARTA PARA O CONTADOR ──────────────────────────────────────

function _relCartaContador() {
    const panel = document.getElementById('rel-panel-carta');
    if (!panel) return;

    const now    = new Date();
    const defMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    panel.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; align-items:start; flex-wrap:wrap;">
        <div>
            <h3 style="margin:0 0 0.5rem; color:var(--text-primary);">Carta para o Contador</h3>
            <p style="margin:0 0 1rem; font-size:0.82rem; color:var(--text-secondary); line-height:1.6;">
                Documento completo com DRE, receitas por categoria, despesas por categoria
                e estimativa de impostos — pronto para enviar ao contador mensalmente.
            </p>
            <ul style="font-size:0.78rem; color:var(--text-muted); list-style:none; padding:0; margin:0; line-height:2;">
                <li>📊 Seção 1: DRE (Demonstrativo de Resultado)</li>
                <li>📈 Seção 2: Receitas por Categoria</li>
                <li>📉 Seção 3: Despesas por Categoria</li>
                <li>🧾 Seção 4: Estimativa de Impostos</li>
                <li>💬 Seção 5: Observações (opcional)</li>
            </ul>
        </div>
        <div style="background:var(--bg-elevated); border-radius:var(--radius-card); border:1px solid var(--border); padding:1.25rem;">
            <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.78rem; color:var(--text-secondary); font-weight:600; margin-bottom:4px;">Mês de referência</label>
                <input type="month" id="carta-period" value="${defMonth}" max="${defMonth}"
                    style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
            </div>
            <div style="margin-bottom:1.25rem;">
                <label style="display:block; font-size:0.78rem; color:var(--text-secondary); font-weight:600; margin-bottom:4px;">Observações para o contador (opcional)</label>
                <textarea id="carta-obs" rows="3"
                    placeholder="Ex: Houve reforma em janeiro — despesas de obra em custo variável..."
                    style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; resize:vertical; box-sizing:border-box;"></textarea>
            </div>
            <div id="carta-error" style="color:var(--color-danger); font-size:0.78rem; margin-bottom:0.75rem; display:none;"></div>
            <button id="btn-generate-carta" style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); border:none; background:var(--accent-blue); color:#fff; font-size:0.9rem; font-weight:700; cursor:pointer; font-family:var(--font-family);">
                ↓ Gerar Carta para o Contador (PDF)
            </button>
        </div>
    </div>`;

    panel.querySelector('#btn-generate-carta').addEventListener('click', async () => {
        const monthValue = panel.querySelector('#carta-period').value;
        const obs        = panel.querySelector('#carta-obs').value;
        const errEl      = panel.querySelector('#carta-error');
        const btn        = panel.querySelector('#btn-generate-carta');
        errEl.style.display = 'none';

        if (!monthValue) return;

        btn.disabled = true;
        btn.textContent = 'Gerando...';

        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) throw new Error('Organização não configurada.');

            // Dados consolidados do mês (financial_entries)
            const { data: entry } = await _supabase
                .from('financial_entries')
                .select('data, totals')
                .eq('organization_id', orgId)
                .eq('reference_date', monthValue + '-01')
                .single();

            if (!entry?.data) {
                // Fallback: pav_ultimos_dados e pav_historico
                const local = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
                if (!local || local.mesReferencia !== monthValue) {
                    throw new Error('Sem dados consolidados para este mês. Finalize o balanço mensal primeiro.');
                }
                _generateCartaPDF(local, monthValue, [], obs, orgId);
                return;
            }

            // Movimentos do período (para categorias)
            const start = monthValue + '-01';
            const end   = new Date(monthValue.slice(0,4), monthValue.slice(5), 0).toISOString().split('T')[0];
            const { data: movs } = await _supabase
                .from('cash_movements')
                .select('type, amount, category, description')
                .eq('organization_id', orgId)
                .gte('due_date', start)
                .lte('due_date', end);

            _generateCartaPDF(entry.data, monthValue, movs || [], obs, orgId);

        } catch (err) {
            errEl.textContent = '⚠ ' + err.message;
            errEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = '↓ Gerar Carta para o Contador (PDF)';
        }
    });
}

async function _generateCartaPDF(financialData, monthValue, movimentos, observacoes, orgId) {
    if (!window.jspdf?.jsPDF) {
        if (window.Utils) Utils.showToast('jsPDF não disponível. Recarregue a página.', 'error');
        return;
    }

    // Org info
    let orgInfo = { name: localStorage.getItem('pav_brand_nome') || 'Clínica', cnpj: '', responsible: '', tax_regime: 'simples' };
    try {
        const { data: org } = await _supabase.from('organizations').select('name,cnpj,responsible,tax_regime').eq('id', orgId).single();
        if (org) orgInfo = org;
    } catch(e) { /* usa defaults */ }

    const { jsPDF } = window.jspdf;
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const margin = 14;
    const colW   = pageW - 2 * margin;

    const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
    const pct = (v, total) => total > 0 ? (((v || 0) / total) * 100).toFixed(1) + '%' : '—';

    // Period label
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const [y, m] = monthValue.split('-');
    const periodLabel = `${meses[parseInt(m)-1]}/${y}`;

    // DRE values from calcularTotais
    const totais        = window.calcularTotais ? window.calcularTotais(financialData) : {};
    const receitaBruta  = totais.faturamento || 0;
    const deducoes      = (financialData.impostos || 0) + (financialData.taxasCartao || 0);
    const receitaLiq    = receitaBruta - deducoes;
    const custoVar      = totais.totalVariaveis || 0;
    const margemContrib = receitaLiq - custoVar;
    const custoFixo     = totais.totalFixos || 0;
    const ebitda        = margemContrib - custoFixo;
    const proLabore     = (financialData.proLabore || 0);
    const lucroLiq      = totais.lucroGerencial || 0;

    // Header
    doc.setFillColor(15, 77, 63);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18).setFont('helvetica', 'bold');
    doc.text('PAVE', margin, 13);
    doc.setFontSize(11).setFont('helvetica', 'normal');
    doc.text('Carta para o Contador', margin, 20);
    doc.text(periodLabel, margin, 26);
    doc.setFontSize(9);
    doc.text(orgInfo.name || '', pageW - margin, 13, { align: 'right' });
    doc.text('CNPJ: ' + (orgInfo.cnpj || 'Não informado'), pageW - margin, 20, { align: 'right' });
    doc.text('Responsável: ' + (orgInfo.responsible || '—'), pageW - margin, 26, { align: 'right' });
    doc.text('Regime: ' + (orgInfo.tax_regime || 'Não informado'), pageW - margin, 32, { align: 'right' });

    // Section 1: DRE
    doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
    doc.text('1. Demonstrativo de Resultado', margin, 44);

    doc.autoTable({
        startY: 48,
        head: [['Descrição', 'Valor', '% Receita']],
        body: [
            ['Receita Bruta',             fmt(receitaBruta),  pct(receitaBruta, receitaBruta)],
            ['(-) Deduções / Impostos',   fmt(deducoes),       pct(deducoes, receitaBruta)],
            ['(=) Receita Líquida',       fmt(receitaLiq),    pct(receitaLiq, receitaBruta)],
            ['(-) Custos Variáveis',      fmt(custoVar),      pct(custoVar, receitaBruta)],
            ['(=) Margem de Contribuição',fmt(margemContrib), pct(margemContrib, receitaBruta)],
            ['(-) Custos Fixos',          fmt(custoFixo),     pct(custoFixo, receitaBruta)],
            ['(=) EBITDA',                fmt(ebitda),        pct(ebitda, receitaBruta)],
            ['(-) Pró-labore',            fmt(proLabore),     pct(proLabore, receitaBruta)],
            ['(=) Lucro Líquido',         fmt(lucroLiq),      pct(lucroLiq, receitaBruta)],
        ],
        columnStyles: {
            0: { cellWidth: colW * 0.55 },
            1: { cellWidth: colW * 0.25, halign: 'right' },
            2: { cellWidth: colW * 0.20, halign: 'right' },
        },
        styles:     { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 77, 63], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [244, 247, 245] },
        didParseCell: (data) => {
            if (data.section !== 'body') return;
            if ([2, 4, 6].includes(data.row.index)) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [220, 235, 228];
            }
            if (data.row.index === 8) {
                data.cell.styles.fillColor  = lucroLiq >= 0 ? [29, 158, 117] : [226, 75, 74];
                data.cell.styles.textColor  = 255;
                data.cell.styles.fontStyle  = 'bold';
            }
        },
    });

    // Section 2: Receitas por categoria
    if (movimentos.length) {
        const recMap = {};
        movimentos.filter(m => m.type === 'receita').forEach(m => {
            const cat = m.category || 'Sem categoria';
            recMap[cat] = (recMap[cat] || 0) + parseFloat(m.amount || 0);
        });
        const recRows = Object.entries(recMap).sort((a,b) => b[1]-a[1]).map(([c,v]) => [c, fmt(v), pct(v, receitaBruta)]);

        if (recRows.length) {
            let nextY = doc.lastAutoTable.finalY + 10;
            if (nextY > pageH - 70) { doc.addPage(); nextY = 20; }
            doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
            doc.text('2. Receitas por Categoria', margin, nextY);
            doc.autoTable({
                startY: nextY + 4,
                head: [['Categoria', 'Total', '% Receita']],
                body: recRows,
                columnStyles: { 0: { cellWidth: colW * 0.55 }, 1: { cellWidth: colW * 0.25, halign: 'right' }, 2: { cellWidth: colW * 0.20, halign: 'right' } },
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [29, 158, 117], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [244, 247, 245] },
            });
        }

        // Section 3: Despesas por categoria
        const desMap = {};
        movimentos.filter(m => m.type === 'despesa').forEach(m => {
            const cat = m.category || 'Sem categoria';
            desMap[cat] = (desMap[cat] || 0) + parseFloat(m.amount || 0);
        });
        const desRows = Object.entries(desMap).sort((a,b) => b[1]-a[1]).map(([c,v]) => [c, fmt(v), pct(v, receitaBruta)]);

        if (desRows.length) {
            let nextY = doc.lastAutoTable.finalY + 10;
            if (nextY > pageH - 70) { doc.addPage(); nextY = 20; }
            doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
            doc.text('3. Despesas por Categoria', margin, nextY);
            doc.autoTable({
                startY: nextY + 4,
                head: [['Categoria', 'Total', '% Receita']],
                body: desRows,
                columnStyles: { 0: { cellWidth: colW * 0.55 }, 1: { cellWidth: colW * 0.25, halign: 'right' }, 2: { cellWidth: colW * 0.20, halign: 'right' } },
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [226, 75, 74], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [253, 244, 244] },
            });
        }
    }

    // Section 4: Impostos
    let nextY = (doc.lastAutoTable?.finalY || 120) + 10;
    if (nextY > pageH - 60) { doc.addPage(); nextY = 20; }
    doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
    doc.text('4. Estimativa de Impostos', margin, nextY);

    const regime    = (orgInfo.tax_regime || '').toLowerCase().replace(' ', '_');
    const taxConfig = TAX_RATES[regime];

    if (taxConfig?.rate != null) {
        const imposto = receitaLiq * taxConfig.rate;
        doc.autoTable({
            startY: nextY + 4,
            head: [['Regime', 'Base de Cálculo', 'Alíquota Est.', 'Imposto Est.']],
            body: [[taxConfig.label, fmt(receitaLiq), (taxConfig.rate * 100).toFixed(1) + '%', fmt(imposto)]],
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        });
    } else {
        doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
        doc.text('Lucro Real: o cálculo requer análise contábil detalhada. Consulte seu contador.', margin, nextY + 8);
    }

    // Section 5: Observações
    if (observacoes?.trim()) {
        nextY = (doc.lastAutoTable?.finalY || nextY) + 10;
        if (nextY > pageH - 50) { doc.addPage(); nextY = 20; }
        doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
        doc.text('5. Observações', margin, nextY);
        doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(50);
        doc.text(observacoes.trim(), margin, nextY + 8, { maxWidth: colW });
    }

    // Disclaimer + footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.line(margin, pageH - 13, pageW - margin, pageH - 13);
        doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(140);
        doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · PAVE Financial`, margin, pageH - 7);
        doc.text('Documento informativo. Consulte um contador para fins fiscais e legais.', pageW / 2, pageH - 7, { align: 'center' });
        doc.text(`Pág. ${i}/${pageCount}`, pageW - margin, pageH - 7, { align: 'right' });
    }

    doc.save(`Carta_Contador_${periodLabel.replace('/', '-')}.pdf`);
    if (window.Utils) Utils.showToast('PDF gerado com sucesso!', 'success');
}

// ── PATCH switchRelTab to include carta ──────────────────────────────────────

const _origSwitchRelTab = window.switchRelTab;
window.switchRelTab = function(tab) {
    const extraTabs = ['carta'];
    const isExtra = extraTabs.includes(tab);

    // Always reset extra-tab visual state
    extraTabs.forEach(t => {
        const btn   = document.getElementById('rel-tab-' + t);
        const panel = document.getElementById('rel-panel-' + t);
        if (btn)   { btn.style.background = 'transparent'; btn.style.color = 'var(--text-secondary)'; }
        if (panel) panel.style.display = 'none';
    });

    if (!isExtra) {
        _origSwitchRelTab(tab);
    } else {
        // Hide all known panels
        ['visao-geral','fluxo-caixa','dre','custos','servicos','exportacao','comparativo'].forEach(t => {
            const btn   = document.getElementById('rel-tab-' + t);
            const panel = document.getElementById('rel-panel-' + t);
            if (btn)   { btn.style.background = 'transparent'; btn.style.color = 'var(--text-secondary)'; }
            if (panel) panel.style.display = 'none';
        });
        // Activate the selected extra tab
        const activeBtn   = document.getElementById('rel-tab-' + tab);
        const activePanel = document.getElementById('rel-panel-' + tab);
        if (activeBtn)   { activeBtn.style.background = 'var(--accent-blue)'; activeBtn.style.color = '#fff'; }
        if (activePanel) activePanel.style.display = '';
        if (tab === 'carta') _relCartaContador();
    }
};

// ── EVENT BUS LISTENERS ───────────────────────────────────────────────────────
if (window.PaveEvents) {
    // Atualiza Dashboard automaticamente quando Caixa muda
    PaveEvents.on('pave:caixa-updated', function() {
        const dash = document.getElementById('aba-dashboard');
        if (dash && dash.style.display !== 'none') {
            window.renderDashboard();
        }
        // Invalida Relatórios se estiver aberto (força re-leitura no próximo render)
        const rel = document.getElementById('aba-relatorios');
        if (rel && rel.style.display !== 'none' && window.renderRelatorios) {
            window.renderRelatorios();
        }
    });
}
