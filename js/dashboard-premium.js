// dashboard-premium.js

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

window.renderDashboard = function(forceData = null) {
    const statsContainer  = document.getElementById('dashboard-stats');
    const chartsContainer = document.getElementById('dashboard-charts');
    if (!statsContainer || !chartsContainer) return;

    const data      = forceData || JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    const hasData   = !!data;
    const totais    = hasData
        ? (window.calcularTotais ? window.calcularTotais(data) : ZERO_DATA)
        : ZERO_DATA;

    const fat       = totais.faturamento || 1;
    const pctFix    = ((totais.totalFixos / fat) * 100).toFixed(1);
    const margemPct = totais.margemContribuicao / fat;
    const lucroPct  = ((totais.lucroGerencial / fat) * 100).toFixed(1);
    const pe        = margemPct > 0 ? (totais.totalFixos / margemPct).toFixed(2) : 0;
    const metaLucro = data?.metaLucro || 0;
    const metaFat   = data?.metaFaturamento || 0;
    const qtdAtend  = parseFloat(data?.qtdAtendimentos) || 0;
    const ticketMed = qtdAtend > 0 ? (totais.faturamento / qtdAtend) : 0;

    // ── PERÍODO ──────────────────────────────────────────────────────────────
    let dataLabel = data?.mesReferencia || '';
    if (dataLabel?.includes('-')) {
        const p = dataLabel.split('-');
        dataLabel = p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : `${p[1]}/${p[0]}`;
    }
    const chipContainer = document.getElementById('period-chip-container');
    if (chipContainer) {
        chipContainer.innerHTML = dataLabel
            ? `<span class="period-chip">${IC.calendar} ${dataLabel}</span>`
            : '';
    }

    // ── YTD ──────────────────────────────────────────────────────────────────
    const historicoAll       = JSON.parse(localStorage.getItem('pav_historico') || '[]');
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

    const calcDelta = (atual, prev) => (!prev || prev === 0) ? null : ((atual - prev) / Math.abs(prev)) * 100;

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

    const infoBanner = !hasData ? `
        <div style="grid-column:1/-1; padding:1rem 1.5rem; background:rgba(10,132,255,0.06); border:1px solid rgba(10,132,255,0.2); border-radius:var(--radius-card); display:flex; align-items:center; gap:12px; margin-bottom:0.5rem;">
            <span style="color:var(--accent-blue); flex-shrink:0;">${IC.info}</span>
            <span style="font-size:0.875rem; color:var(--text-secondary);">Preencha seu primeiro balanço financeiro para ativar os indicadores.</span>
            <button onclick="document.getElementById('tab-balanco').click()" class="btn-primary" style="margin-left:auto; padding:0.45rem 1rem; font-size:0.8rem; flex-shrink:0;">Ir para Finanças</button>
        </div>` : '';

    // ── KPI CARDS ─────────────────────────────────────────────────────────────
    const ticketIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>`;
    const cards = [
        { label: 'Receita Operacional', value: totais.faturamento,    color: 'var(--accent-blue)', icon: IC.revenue,  delta: dFat,   inverter: false },
        { label: 'Margem Líquida',      value: totais.lucroGerencial, color: totais.lucroGerencial >= 0 ? '#1D9E75' : '#E24B4A', icon: IC.profit, delta: dLucro, inverter: false },
        { label: 'Custos Fixos',        value: totais.totalFixos,     color: '#E24B4A',            icon: IC.fixed,    delta: dFix,   inverter: true  },
        { label: 'Custos Variáveis',    value: totais.totalVariaveis, color: '#ffd60a',            icon: IC.variable, delta: dVar,   inverter: true  },
        { label: 'Ticket Médio',        value: ticketMed,             color: '#5ac8fa',            icon: ticketIcon,  delta: null,   inverter: false,
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
    let healthDesc  = 'Estrutura de custos fixos controlada. Operação sustentável.';
    if (healthScore > 35 && healthScore <= 50) {
        healthColor = '#ffd60a'; healthLabel = 'Atenção';
        healthDesc  = 'Custos fixos elevados. Monitore o faturamento para evitar déficits.';
    } else if (healthScore > 50) {
        healthColor = '#E24B4A'; healthLabel = 'Risco Crítico';
        healthDesc  = 'Mais de 50% do faturamento comprometido com estrutura fixa.';
    }

    chartsContainer.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:2rem;">

            <!-- Termômetro -->
            <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
                <h3 style="margin-bottom:1.5rem; color:var(--text-secondary); display:flex; align-items:center; gap:6px; justify-content:center;" data-tooltip="Percentual do faturamento comprometido com custos fixos. Abaixo de 35%: saudável · 35–50%: atenção · Acima de 50%: crítico.">Índice de Custo Fixo <span style="opacity:0.6; color:var(--text-muted);">${IC.info}</span></h3>
                <div style="position:relative; width:150px; height:150px; border-radius:50%; background:conic-gradient(${healthColor} ${healthScore}%, rgba(255,255,255,0.05) 0%); display:flex; align-items:center; justify-content:center;">
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
                    <div class="kpi-row" style="border-left-color:#5ac8fa;">
                        <span class="kpi-row-label">Margem de Contribuição</span>
                        <span class="kpi-row-value" style="color:#5ac8fa;">${hasData ? ((totais.margemContribuicao / fat) * 100).toFixed(1) + '%' : '—'}</span>
                    </div>
                    <div class="kpi-row">
                        <span class="kpi-row-label">Margem de Contribuição (R$)</span>
                        <span class="kpi-row-value" style="color:#5ac8fa;">${hasData ? fmt(totais.margemContribuicao) : '—'}</span>
                    </div>
                    <div class="kpi-row" style="border-left-color:var(--accent-gold);">
                        <span class="kpi-row-label">Ponto de Equilíbrio</span>
                        <span class="kpi-row-value" style="color:var(--accent-gold);">${hasData ? fmt(parseFloat(pe)) : '—'}</span>
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
                    { label: 'Pró-Labore',   val: divisao.proLabore,     ref: '40–60%', color: '#fff' },
                    { label: `Empréstimos (${empPct}%)`, val: emp, ref: '0–20%', color: emp > 0 ? '#ff9500' : '#fff' },
                    { label: 'Reinvestimento', val: divisao.investimentos, ref: '20–40%', color: '#fff' },
                    { label: 'Reserva de Caixa', val: divisao.reserva, ref: '20–40%', color: '#fff' }
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
    const top5       = expenses.slice(0, 5).filter(e => e.val > 0);
    const remaining  = expenses.slice(5).reduce((a, b) => a + b.val, 0);
    if (remaining > 0) top5.push({ name: 'Demais', val: remaining });
    top5.push({ name: 'Lucro', val: Math.max(0, totais.lucroGerencial) });

    const chartEl = document.getElementById('chart-costs-deep');
    if (chartEl) {
        if (!hasData) {
            // Placeholder chart with neutral data
            window.chartCostsDeepObj = new Chart(chartEl, {
                type: 'doughnut',
                data: {
                    labels: ['Aguardando dados'],
                    datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.05)'], borderWidth: 0 }]
                },
                options: { plugins: { legend: { labels: { color: '#8e8e93', font: { family: 'Montserrat' } } } }, cutout: '72%' }
            });
        } else {
            window.chartCostsDeepObj = new Chart(chartEl, {
                type: 'doughnut',
                data: {
                    labels: top5.map(e => e.name),
                    datasets: [{ data: top5.map(e => e.val), backgroundColor: ['#E24B4A','#ff9f0a','#ffd60a','#ffb340','#ffc67b','#b0b0b5','#1D9E75'].slice(0, top5.length), borderWidth: 0, spacing: 4 }]
                },
                options: { plugins: { legend: { position: 'bottom', labels: { color: '#8e8e93', font: { family: 'Montserrat', weight: '600' }, padding: 12 } } }, cutout: '72%' }
            });
        }
    }

    // ── GRÁFICO DE EVOLUÇÃO ───────────────────────────────────────────────────
    const historico = JSON.parse(localStorage.getItem('pav_historico') || '[]');
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
                plugins: { legend: { labels: { color: '#8e8e93', font: { family: 'Montserrat' } } } },
                scales: {
                    x: { ticks: { color: '#8e8e93', font: { family: 'Montserrat' } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { ticks: { color: '#8e8e93', font: { family: 'Montserrat' } }, grid: { color: 'rgba(255,255,255,0.04)' } }
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
        if (totais.totalVariaveis > fat * 0.6)
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
};

// ── HISTÓRICO ──────────────────────────────────────────────────────────────
window.deleteHistorico = function(idx) {
    Utils.confirm('Este registro será removido do histórico de consolidações.', 'Remover consolidação?', () => {
        const hist = JSON.parse(localStorage.getItem('pav_historico') || '[]');
        hist.splice(idx, 1);
        localStorage.setItem('pav_historico', JSON.stringify(hist));
        window.renderDashboard();
    });
};

// ── SUBMIT DO BALANÇO ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (window.renderDashboard) window.renderDashboard();

    const balancoForm = document.getElementById('balancoForm');
    if (!balancoForm) return;

    balancoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = balancoForm.querySelector('[type="submit"]');
        if (submitBtn) Utils.setLoading(submitBtn, true);

        const getVal = id => parseFloat(document.getElementById(id)?.value) || 0;
        const mesStr = document.getElementById('mesReferencia')?.value || 'N/A';

        const dados = {
            mesReferencia: mesStr,
            faturamento: getVal('faturamento'), qtdAtendimentos: getVal('qtdAtendimentos'),
            metaFaturamento: getVal('metaFaturamento'), metaLucro: getVal('metaLucro'),
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

        localStorage.setItem('pav_ultimos_dados', JSON.stringify(dados));

        const totais  = window.calcularTotais ? window.calcularTotais(dados) : {};
        const historico = JSON.parse(localStorage.getItem('pav_historico') || '[]');
        let label = mesStr;
        if (label?.includes('-')) { const p = label.split('-'); label = p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : label; }
        historico.push({ mesRef: mesStr, label, faturamento: dados.faturamento, lucro: totais.lucroGerencial || 0, date: new Date().toISOString() });
        localStorage.setItem('pav_historico', JSON.stringify(historico));

        if (submitBtn) Utils.setLoading(submitBtn, false);
        Utils.showToast('Balanço consolidado com sucesso!', 'success');
        window.renderDashboard(dados);
        document.getElementById('tab-dashboard').click();
        window.scrollTo(0, 0);
    });
});

// ── RELATÓRIOS — TAB SYSTEM ───────────────────────────────────────────────────
let _relActiveTab = 'visao-geral';

window.switchRelTab = function(tab) {
    _relActiveTab = tab;
    const tabs = ['visao-geral','fluxo-caixa','dre','custos','servicos','exportacao'];
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
        case 'visao-geral':  _relVisaoGeral();  break;
        case 'fluxo-caixa': _relFluxoCaixa();  break;
        case 'dre':         _relDRE();          break;
        case 'custos':      _relCustos();       break;
        case 'servicos':    _relServicos();     break;
        case 'exportacao':  _relExportacao();   break;
    }
}

window.renderRelatorios = function() {
    // Ensure first tab is shown on initial open
    window.switchRelTab(_relActiveTab);
};

// ── TAB: VISÃO GERAL ──────────────────────────────────────────────────────────
function _relVisaoGeral() {
    const panel = document.getElementById('rel-panel-visao-geral');
    if (!panel) return;

    const historico   = JSON.parse(localStorage.getItem('pav_historico') || '[]');
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
                <div style="padding:1.25rem 1rem; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:var(--radius-card); text-align:center;">
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
                                return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
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
                plugins: { legend: { labels: { color: '#8e8e93', font: { family: 'Montserrat', size: 11 } } } },
                scales: {
                    x: { ticks: { color: '#8e8e93', font: { family: 'Montserrat', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { ticks: { color: '#8e8e93', font: { family: 'Montserrat', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
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
                    x: { ticks: { color: '#8e8e93', font: { family: 'Montserrat', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { ticks: { color: '#8e8e93', font: { family: 'Montserrat', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
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
                <select id="rel-cx-mes" onchange="_relFluxoCaixaRender()" style="padding:0.4rem 0.875rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-size:0.85rem; font-family:var(--font-family);">
                    <option value="">Todos os períodos</option>
                    ${[...new Set(caixa.map(c => c.vencimento.substring(0,7)))].sort().reverse().map(m => `<option value="${m}" ${m===mesAtual?'selected':''}>${m}</option>`).join('')}
                </select>
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

window._relFluxoCaixaRender = function() {
    const mes    = document.getElementById('rel-cx-mes')?.value || '';
    const tipo   = document.getElementById('rel-cx-tipo')?.value || '';
    const status = document.getElementById('rel-cx-status')?.value || '';
    const fmt    = v => `R$ ${(Math.abs(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    let caixa = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    if (mes)    caixa = caixa.filter(c => c.vencimento.startsWith(mes));
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
            { label: 'Saldo Projetado',  val: fmt(recPago + recPend - desPago - desPend), color: (recPago + recPend - desPago - desPend) >= 0 ? '#5ac8fa' : '#ff9500' }
        ].map(k => `
            <div style="padding:1rem; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:var(--radius-card); text-align:center;">
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
                    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
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
    const a    = document.createElement('a'); a.href = url; a.download = 'caixa-pave.csv'; a.click();
    URL.revokeObjectURL(url);
    Utils.showToast('CSV exportado com sucesso!', 'success');
};

// ── TAB: DRE ─────────────────────────────────────────────────────────────────
function _relDRE() {
    const panel = document.getElementById('rel-panel-dre');
    if (!panel) return;

    const historico = JSON.parse(localStorage.getItem('pav_historico') || '[]');
    const data      = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    const fmt       = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    function dreHtml(d, label) {
        if (!d) return `<p style="color:var(--text-secondary); font-size:0.85rem;">Sem dados para ${label}.</p>`;
        const t = window.calcularTotais ? window.calcularTotais(d) : {};
        const lucro = t.lucroGerencial || 0;
        const fat   = d.faturamento || 1;
        return `
            <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid rgba(255,255,255,0.07);">
                <span style="font-weight:600; color:var(--text-secondary); font-size:0.85rem;">Receita Bruta</span>
                <span style="font-weight:800; color:var(--accent-blue);">${fmt(d.faturamento)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid rgba(255,255,255,0.07);">
                <span style="font-weight:600; color:var(--text-secondary); font-size:0.85rem;">(−) Custos Variáveis</span>
                <span style="font-weight:800; color:#ffd60a;">${fmt(t.totalVariaveis)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:0.75rem 0.875rem; background:var(--bg-elevated); border-radius:var(--radius-sm); margin:4px 0;">
                <span style="font-weight:700; color:var(--accent-gold); font-size:0.85rem;">(=) Margem Contribuição</span>
                <span style="font-weight:800; color:var(--accent-gold);">${fmt(t.margemContribuicao)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid rgba(255,255,255,0.07);">
                <span style="font-weight:600; color:var(--text-secondary); font-size:0.85rem;">(−) Despesas Fixas</span>
                <span style="font-weight:800; color:#E24B4A;">${fmt(t.totalFixos)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:0.875rem 0 0 0; margin-top:4px; border-top:2px solid var(--border);">
                <span style="font-weight:800; color:#fff;">(=) Lucro Líquido</span>
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
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.875rem 0; border-bottom:1px solid rgba(255,255,255,0.06);">
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
        { label: 'Insumos / Estoque',    val: data.insumos||0,                tipo: 'Variável', badge: '#ffd60a' },
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
                { label: 'Total Custos Variáveis', val: fmt(totais.totalVariaveis), color: '#ffd60a' },
                { label: 'Custo Total',            val: fmt((totais.totalFixos||0)+(totais.totalVariaveis||0)), color: '#ff9500' },
                { label: 'Ponto de Equilíbrio',    val: fmt(parseFloat(pe)),        color: 'var(--accent-gold)' }
            ].map(k => `
                <div style="padding:1.25rem 1rem; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:var(--radius-card); text-align:center;">
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
                        <div style="display:flex; align-items:center; gap:0.875rem; padding:0.75rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); width:20px; flex-shrink:0; text-align:right;">${i+1}</span>
                            <div style="flex:1; min-width:0;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                    <span style="font-size:0.875rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.label}</span>
                                    <span style="font-size:0.78rem; font-weight:800; color:${c.badge}; margin-left:1rem; flex-shrink:0;">${fmt(c.val)}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <div style="flex:1; height:4px; border-radius:2px; background:rgba(255,255,255,0.06); overflow:hidden;">
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
                plugins: { legend: { position: 'bottom', labels: { color: '#8e8e93', font: { family: 'Montserrat', size: 10 }, padding: 10 } } }
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
                            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
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
                    <div style="font-weight:700; color:var(--accent-blue); margin-bottom:0.5rem;">Extrato CSV (Caixa)</div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:1rem;">Todos os lançamentos do Caixa em .csv.</p>
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
