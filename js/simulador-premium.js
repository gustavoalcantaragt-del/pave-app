// ============================================================
// simulador-premium.js — Simulador Financeiro PAVE v2
// Módulos: What-If · Regime Tributário · Crescimento · CLT
// ============================================================

// ── HELPERS INTERNOS ───────────────────────────────────────
const _sfmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const _spct = (v, dec = 1) => `${(parseFloat(v) || 0).toFixed(dec)}%`;

// ── CÁLCULO DE IMPOSTOS (compartilhado entre módulos) ──────
function _calcImpostos(fat, regime) {
    if (!fat || fat <= 0) return 0;
    const SIMPLES = [
        { lim: 180000,  al: 0.060,  pd: 0 },
        { lim: 360000,  al: 0.112,  pd: 9360 },
        { lim: 720000,  al: 0.132,  pd: 17640 },
        { lim: 1800000, al: 0.160,  pd: 35640 },
        { lim: 3600000, al: 0.210,  pd: 125640 },
        { lim: 4800000, al: 0.330,  pd: 648000 },
    ];
    switch (regime) {
        case 'mei': {
            return fat * 12 <= 81000 ? 75.90 : fat * 0.06; // acima do limite, cálculo estimado
        }
        case 'simples': {
            const rbt12 = fat * 12;
            const f = SIMPLES.find(x => rbt12 <= x.lim) || SIMPLES[SIMPLES.length - 1];
            return fat * ((rbt12 * f.al - f.pd) / rbt12);
        }
        case 'lucro_presumido': {
            const base = fat * 0.32;
            const irpj   = base * 0.15 + Math.max(0, (base * 12 - 240000) / 12) * 0.10;
            const csll   = base * 0.09;
            return irpj + csll + fat * 0.0065 + fat * 0.03 + fat * 0.03;
        }
        case 'lucro_real': {
            return fat * 0.0165 + fat * 0.076 + fat * 0.03; // PIS/COFINS/ISS (IRPJ/CSLL sobre lucro calculado separado)
        }
        default: return 0;
    }
}

// ══════════════════════════════════════════════════════════════
// MÓDULO 1 — ANÁLISE WHAT-IF
// ══════════════════════════════════════════════════════════════

window.adjustSimValue = function(id, type, amount) {
    const el = document.getElementById(id);
    if (!el) return;
    let val = parseFloat(el.value) || 0;
    if (type === 'abs') {
        val += amount;
    } else if (type === 'pct') {
        if (val === 0) val = Math.abs(amount) * 100 * Math.sign(amount);
        else val = val * (1 + amount / 100);
    }
    if (val < 0) val = 0;
    el.value = Math.round(val);
    window.runSimulation();
};

window.runSimulation = function() {
    const fatEl    = document.getElementById('sim-fat');
    const fixEl    = document.getElementById('sim-fix');
    const varEl    = document.getElementById('sim-var');
    const regimeEl = document.getElementById('sim-regime');
    if (!fatEl || !fixEl || !varEl) return;

    const resultEl = document.getElementById('sim-result');

    // Carrega dados base se campos estão zerados
    const data = JSON.parse(localStorage.getItem('pav_ultimos_dados') || 'null');
    if (resultEl && !data && parseFloat(fatEl.value) === 0) {
        resultEl.innerHTML = `
            <div class="pav-empty-state" style="grid-column:1/-1;">
                <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                <h3>Simulador aguardando base</h3>
                <p>Consolide um <strong style="color:var(--pave-blue)">Balanço Financeiro</strong> para que o simulador use seus dados reais como ponto de partida.</p>
                <button class="btn-primary" style="margin-top:0.5rem;" onclick="document.getElementById('tab-balanco').click()">Ir para Finanças</button>
            </div>`;
        return;
    }
    if (data && !parseFloat(fatEl.value) && !parseFloat(fixEl.value) && !parseFloat(varEl.value)) {
        const totais = window.calcularTotais ? window.calcularTotais(data) : {};
        fatEl.value = Math.round(data.faturamento || 0);
        fixEl.value = Math.round(totais.totalFixos || 0);
        varEl.value = Math.round(totais.totalVariaveis || 0);
    }

    const fat    = parseFloat(fatEl.value) || 0;
    const fix    = parseFloat(fixEl.value) || 0;
    const vari   = parseFloat(varEl.value) || 0;
    const regime = regimeEl?.value || 'simples';

    const impostos    = _calcImpostos(fat, regime);
    const custoTotal  = fix + vari;
    const lucroBruto  = fat - custoTotal;
    const lucroLiq    = lucroBruto - impostos;
    const margemBruta = fat > 0 ? (lucroBruto / fat) * 100 : 0;
    const margemLiq   = fat > 0 ? (lucroLiq / fat) * 100 : 0;
    const mc          = fat - vari; // margem de contribuição
    const pe          = mc > 0 ? (fix / (mc / fat)) : 0;

    // Alert de risco
    let alertHTML = '';
    if (lucroLiq < 0) {
        alertHTML = `
        <div class="sim-risk-alert" style="grid-column:1/-1;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
                <h4>Déficit de Operação</h4>
                <p>Este cenário gera <strong>${_sfmt(Math.abs(lucroLiq))}</strong> de prejuízo líquido. O ponto de equilíbrio mínimo é <strong>${_sfmt(pe)}</strong>.</p>
            </div>
        </div>`;
    }

    if (resultEl) {
        resultEl.className = 'sim-kpi-strip';
        resultEl.innerHTML = alertHTML + `
            <div class="sim-kpi-card blue">
                <span class="sim-kpi-label">Faturamento</span>
                <div class="sim-kpi-value">${_sfmt(fat)}</div>
                <div class="sim-kpi-sub">Receita bruta do período</div>
            </div>
            <div class="sim-kpi-card amber">
                <span class="sim-kpi-label">Impostos Estimados</span>
                <div class="sim-kpi-value">${_sfmt(impostos)}</div>
                <div class="sim-kpi-sub">${fat > 0 ? _spct((impostos / fat) * 100) + ' do faturamento' : '—'}</div>
            </div>
            <div class="sim-kpi-card ${lucroBruto >= 0 ? 'green' : 'red'}">
                <span class="sim-kpi-label">Lucro Bruto</span>
                <div class="sim-kpi-value ${lucroBruto < 0 ? 'danger' : 'success'}">${_sfmt(lucroBruto)}</div>
                <div class="sim-kpi-sub">${_spct(margemBruta)} de margem bruta</div>
            </div>
            <div class="sim-kpi-card ${lucroLiq >= 0 ? 'green' : 'red'}">
                <span class="sim-kpi-label">Lucro Líquido</span>
                <div class="sim-kpi-value ${lucroLiq < 0 ? 'danger' : 'success'}">${_sfmt(lucroLiq)}</div>
                <div class="sim-kpi-sub">${_spct(margemLiq)} de margem líquida</div>
            </div>
            <div class="sim-kpi-card gray">
                <span class="sim-kpi-label">Ponto de Equilíbrio</span>
                <div class="sim-kpi-value">${_sfmt(pe)}</div>
                <div class="sim-kpi-sub">Faturamento mínimo</div>
            </div>
        `;
    }

    // Gráfico comparativo Atual vs Cenário
    const chartEl = document.getElementById('sim-chart');
    if (chartEl) {
        if (window.simChartObj) { window.simChartObj.destroy(); window.simChartObj = null; }

        const cur       = data ? (window.calcularTotais ? window.calcularTotais(data) : {}) : null;
        const curFat    = cur?.faturamento   || 0;
        const curFix    = cur?.totalFixos    || 0;
        const curVar    = cur?.totalVariaveis || 0;
        const curImp    = curFat ? _calcImpostos(curFat, regime) : 0;
        const curLucro  = curFat - curFix - curVar - curImp;

        const tc = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#64748b';
        const gc = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(0,0,0,0.08)';

        window.simChartObj = new Chart(chartEl, {
            type: 'bar',
            data: {
                labels: ['Faturamento', 'Custos Fixos', 'C. Variáveis', 'Impostos', 'Lucro Líq.'],
                datasets: [
                    {
                        label: 'Atual',
                        data: [curFat, curFix, curVar, curImp, curLucro],
                        backgroundColor: 'rgba(142,142,147,0.4)',
                        borderRadius: 6, borderSkipped: false,
                    },
                    {
                        label: 'Cenário',
                        data: [fat, fix, vari, impostos, lucroLiq],
                        backgroundColor: [
                            'rgba(35,78,112,0.75)',
                            'rgba(226,75,74,0.7)',
                            'rgba(239,159,39,0.7)',
                            'rgba(100,116,139,0.6)',
                            lucroLiq >= 0 ? 'rgba(47,156,119,0.75)' : 'rgba(226,75,74,0.75)',
                        ],
                        borderRadius: 6, borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: tc, font: { family: 'Montserrat', size: 11 }, boxWidth: 10, padding: 14 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${_sfmt(ctx.raw)}` } }
                },
                scales: {
                    x: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gc } },
                    y: {
                        ticks: { color: tc, font: { size: 10 }, callback: v => 'R$' + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) },
                        grid: { color: gc }
                    }
                }
            }
        });
    }
};

// ══════════════════════════════════════════════════════════════
// MÓDULO 2 — COMPARATIVO DE REGIME TRIBUTÁRIO
// ══════════════════════════════════════════════════════════════

const SimuladorTributarioModule = (() => {

    const SIMPLES_ANEXO3 = [
        { lim: 180000,  al: 0.060,  pd: 0,      faixa: 'Até R$ 180k/ano' },
        { lim: 360000,  al: 0.112,  pd: 9360,   faixa: 'Até R$ 360k/ano' },
        { lim: 720000,  al: 0.132,  pd: 17640,  faixa: 'Até R$ 720k/ano' },
        { lim: 1800000, al: 0.160,  pd: 35640,  faixa: 'Até R$ 1,8M/ano' },
        { lim: 3600000, al: 0.210,  pd: 125640, faixa: 'Até R$ 3,6M/ano' },
        { lim: 4800000, al: 0.330,  pd: 648000, faixa: 'Até R$ 4,8M/ano' },
    ];

    let _taxChart = null;

    function _calcAll(fat, custos) {
        const rbt12 = fat * 12;

        // MEI
        const meiEleg = rbt12 <= 81000;
        const meiImp  = 75.90; // DAS fixo serviços 2024
        const meiAliq = fat > 0 ? meiImp / fat : 0;

        // Simples Nacional (Anexo III)
        const fSN = SIMPLES_ANEXO3.find(x => rbt12 <= x.lim) || SIMPLES_ANEXO3[SIMPLES_ANEXO3.length - 1];
        const aliqSN   = rbt12 > 0 ? (rbt12 * fSN.al - fSN.pd) / rbt12 : 0;
        const snImp    = fat * aliqSN;

        // Lucro Presumido
        const base  = fat * 0.32;
        const lpIrpj = base * 0.15 + Math.max(0, (base * 12 - 240000) / 12) * 0.10;
        const lpCsll = base * 0.09;
        const lpPis  = fat * 0.0065;
        const lpCof  = fat * 0.03;
        const lpIss  = fat * 0.03;
        const lpImp  = lpIrpj + lpCsll + lpPis + lpCof + lpIss;
        const lpAliq = fat > 0 ? lpImp / fat : 0;

        // Lucro Real
        const lrPis    = fat * 0.0165;
        const lrCof    = fat * 0.076;
        const lrIss    = fat * 0.03;
        const lucroTrib = Math.max(0, fat - custos - lrPis - lrCof - lrIss);
        const lrIrpj   = lucroTrib * 0.15 + Math.max(0, (lucroTrib * 12 - 240000) / 12) * 0.10;
        const lrCsll   = lucroTrib * 0.09;
        const lrImp    = lrPis + lrCof + lrIss + lrIrpj + lrCsll;
        const lrAliq   = fat > 0 ? lrImp / fat : 0;

        return {
            mei: {
                imp: meiImp, aliq: meiAliq,
                lucro: meiEleg ? fat - custos - meiImp : null,
                elegivel: meiEleg,
                nota: meiEleg ? `DAS fixo mensal — faixa: R$ 81k/ano` : `Faturamento acima do limite MEI (R$ 81.000/ano)`,
                bd: [{ l: 'DAS fixo (serviços)', v: meiImp }]
            },
            simples: {
                imp: snImp, aliq: aliqSN,
                lucro: fat - custos - snImp,
                elegivel: true,
                nota: `Faixa: ${fSN.faixa} — alíquota nominal ${(fSN.al * 100).toFixed(1)}%`,
                bd: [{ l: `Alíquota efetiva ${_spct(aliqSN * 100, 2)}`, v: snImp }]
            },
            lp: {
                imp: lpImp, aliq: lpAliq,
                lucro: fat - custos - lpImp,
                elegivel: true,
                nota: `Presunção de lucro 32% — serviços`,
                bd: [
                    { l: 'IRPJ (15% + adic. 10%)', v: lpIrpj },
                    { l: 'CSLL (9% × 32%)',         v: lpCsll },
                    { l: 'PIS (0,65%)',              v: lpPis  },
                    { l: 'COFINS (3%)',              v: lpCof  },
                    { l: 'ISS (3%)',                 v: lpIss  },
                ]
            },
            lr: {
                imp: lrImp, aliq: lrAliq,
                lucro: fat - custos - lrImp,
                elegivel: true,
                nota: `Baseado no lucro real — PIS/COFINS não-cumulativo`,
                bd: [
                    { l: 'PIS (1,65% n.c.)',         v: lrPis   },
                    { l: 'COFINS (7,6% n.c.)',        v: lrCof   },
                    { l: 'IRPJ + adicional',          v: lrIrpj  },
                    { l: 'CSLL (9%)',                 v: lrCsll  },
                    { l: 'ISS (3%)',                  v: lrIss   },
                ]
            }
        };
    }

    function render(container) {
        if (!container) return;
        const data   = JSON.parse(localStorage.getItem('pav_ultimos_dados') || 'null');
        const totais = data && window.calcularTotais ? window.calcularTotais(data) : {};
        const defFat = Math.round(data?.faturamento || totais?.faturamento || 0);
        const defCus = Math.round((totais?.totalFixos || 0) + (totais?.totalVariaveis || 0));
        // Se não há dados, sugere valores de exemplo para o usuário explorar
        const exFat = defFat || '';
        const exCus = defCus || '';

        container.innerHTML = `
        <div class="card">
            <div class="sim-panel-header">
                <div>
                    <h3>Comparativo de Regimes Tributários</h3>
                    <p>Insira o faturamento e os custos mensais para comparar a carga tributária de cada regime e identificar a melhor opção.</p>
                </div>
            </div>
            <div class="sim-tax-inputs">
                <div class="input-group">
                    <label>Faturamento Mensal (R$)</label>
                    <input type="number" id="tax-fat" min="0" value="${defFat || ''}" placeholder="Ex: 30.000"
                           oninput="window.SimuladorTributarioModule.run()"
                           style="font-size:1.3rem; font-weight:800; color:var(--pave-blue);">
                </div>
                <div class="input-group">
                    <label>Custos Operacionais Mensais (R$)</label>
                    <input type="number" id="tax-cus" min="0" value="${defCus || ''}" placeholder="Ex: 18.000"
                           oninput="window.SimuladorTributarioModule.run()"
                           style="font-size:1.3rem; font-weight:800; color:var(--color-danger);">
                </div>
            </div>
            <div class="sim-regime-grid" id="tax-regime-cards"></div>
            <div id="tax-recom"></div>
            <div class="sim-tax-chart-wrap">
                <canvas id="tax-chart"></canvas>
            </div>
            <p style="font-size:0.72rem; color:var(--text-muted); margin-top:10px; text-align:center;">
                Estimativa para serviços (Simples Anexo III / presunção LP 32%). Consulte um contador para análise definitiva.
            </p>
        </div>`;

        _run();
    }

    function _run() {
        const fat = parseFloat(document.getElementById('tax-fat')?.value) || 0;
        const cus = parseFloat(document.getElementById('tax-cus')?.value) || 0;
        const cardsEl = document.getElementById('tax-regime-cards');

        if (!fat) {
            if (cardsEl) cardsEl.innerHTML = `
                <div style="grid-column:1/-1; padding:2rem; text-align:center; color:var(--text-muted); font-size:0.9rem;">
                    Informe o faturamento mensal para calcular e comparar os regimes.
                </div>`;
            const recomEl = document.getElementById('tax-recom');
            if (recomEl) recomEl.innerHTML = '';
            return;
        }

        const R = _calcAll(fat, cus);

        const DEFS = [
            { key: 'mei',     name: 'MEI',              sub: 'Microempreendedor Individual',  color: '#7c3aed' },
            { key: 'simples', name: 'Simples Nacional',  sub: 'Anexo III — Serviços',          color: 'var(--pave-blue)' },
            { key: 'lp',      name: 'Lucro Presumido',   sub: 'Presunção 32% — serviços',      color: 'var(--color-warning)' },
            { key: 'lr',      name: 'Lucro Real',        sub: 'Baseado no lucro efetivo',      color: 'var(--color-danger)' },
        ];

        // Determina melhor opção (menor imposto, entre os elegíveis)
        const eligibles = DEFS.filter(d => R[d.key].elegivel).map(d => ({ key: d.key, imp: R[d.key].imp }));
        const best = eligibles.length ? eligibles.reduce((a, b) => a.imp < b.imp ? a : b).key : null;

        // Cards
        if (cardsEl) {
            cardsEl.innerHTML = DEFS.map(d => {
                const r = R[d.key];
                const isBest  = d.key === best;
                const inelig  = !r.elegivel;
                return `
                <div class="sim-regime-card ${isBest ? 'best' : ''} ${inelig ? 'not-eligible' : ''}">
                    ${isBest  ? `<span class="sim-regime-best-badge">Melhor Opção</span>` : ''}
                    ${inelig  ? `<span class="sim-regime-ineligible-badge">Não Elegível</span>` : ''}
                    <div style="width:32px;height:3px;border-radius:2px;margin-bottom:12px;background:${d.color};"></div>
                    <div class="sim-regime-name-main">${d.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px;">${d.sub}</div>
                    ${inelig ? `<p style="font-size:0.8rem;color:var(--text-muted);">${r.nota}</p>` : `
                    <div class="sim-regime-imposto">${_sfmt(r.imp)}</div>
                    <div class="sim-regime-aliq">Alíq. efetiva: ${_spct(r.aliq * 100, 2)} · ${r.nota}</div>
                    <div class="sim-regime-lucro">Lucro líq.: ${_sfmt(r.lucro)}</div>
                    <div style="margin-top:10px; border-top:1px solid var(--border); padding-top:8px;">
                        ${r.bd.map(b => `
                        <div class="sim-regime-bd-row">
                            <span>${b.l}</span>
                            <span>${_sfmt(b.v)}</span>
                        </div>`).join('')}
                    </div>`}
                </div>`;
            }).join('');
        }

        // Recomendação
        const recomEl = document.getElementById('tax-recom');
        if (recomEl && best) {
            const bestR   = R[best];
            const bestN   = DEFS.find(d => d.key === best)?.name || best;
            const maxImp  = Math.max(...DEFS.filter(d => R[d.key].elegivel).map(d => R[d.key].imp));
            const eco     = maxImp - bestR.imp;
            recomEl.innerHTML = `
            <div class="sim-recom-bar">
                <div class="sim-recom-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="sim-recom-text">
                    Para este perfil, <strong>${bestN}</strong> é o regime com menor carga tributária (${_sfmt(bestR.imp)}/mês).
                    ${eco > 1 ? `Economia de até <strong>${_sfmt(eco)}/mês</strong> em relação às demais opções elegíveis.` : ''}
                </div>
            </div>`;
        } else if (recomEl) {
            recomEl.innerHTML = '';
        }

        // Gráfico
        const canvas = document.getElementById('tax-chart');
        if (!canvas) return;
        if (_taxChart) { _taxChart.destroy(); _taxChart = null; }

        const tc = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#64748b';
        const gc = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(0,0,0,0.08)';

        _taxChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: DEFS.map(d => d.name),
                datasets: [
                    {
                        label: 'Imposto/mês',
                        data: DEFS.map(d => R[d.key].elegivel ? Math.round(R[d.key].imp) : 0),
                        backgroundColor: 'rgba(226,75,74,0.7)',
                        borderRadius: 6, borderSkipped: false,
                    },
                    {
                        label: 'Lucro Líquido',
                        data: DEFS.map(d => R[d.key].elegivel && R[d.key].lucro !== null ? Math.round(Math.max(0, R[d.key].lucro)) : 0),
                        backgroundColor: 'rgba(47,156,119,0.65)',
                        borderRadius: 6, borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: tc, font: { family: 'Montserrat', size: 11 }, boxWidth: 10, padding: 12 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${_sfmt(ctx.raw)}` } }
                },
                scales: {
                    x: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gc } },
                    y: {
                        ticks: { color: tc, font: { size: 10 }, callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) },
                        grid: { color: gc }
                    }
                }
            }
        });
    }

    return { render, run: _run };
})();

window.SimuladorTributarioModule = SimuladorTributarioModule;

// ══════════════════════════════════════════════════════════════
// MÓDULO 3 — CUSTO DE CONTRATAÇÃO CLT
// ══════════════════════════════════════════════════════════════

window.simularCLT = function() {
    const salario = parseFloat(document.getElementById('clt-salario')?.value) || 0;
    const qtd     = Math.max(1, parseInt(document.getElementById('clt-quantidade')?.value) || 1);
    const trib    = document.getElementById('clt-tributacao')?.value || 'simples';
    const vtDia   = parseFloat(document.getElementById('clt-vt')?.value) || 0;
    const vrDia   = parseFloat(document.getElementById('clt-vr')?.value) || 0;
    const dias    = parseInt(document.getElementById('clt-dias')?.value) || 22;
    const saude   = parseFloat(document.getElementById('clt-saude')?.value) || 0;

    const totalEl  = document.getElementById('clt-custo-total');
    const multEl   = document.getElementById('clt-multiplicador');
    const detEl    = document.getElementById('clt-detalhes');
    const equipeEl = document.getElementById('clt-custo-equipe');
    const equipeV  = document.getElementById('clt-equipe-valor');
    const equipeL  = document.getElementById('clt-equipe-label');

    if (!totalEl) return;

    if (salario <= 0) {
        totalEl.textContent = 'R$ 0,00';
        if (multEl) multEl.textContent = 'Aguardando salário base...';
        if (detEl) detEl.innerHTML = '';
        if (equipeEl) equipeEl.style.display = 'none';
        return;
    }

    // Encargos trabalhistas
    const fgts         = salario * 0.08;
    const fgtsMulta    = fgts * 0.40;       // provisão multa rescisória 40% FGTS
    const decimo       = salario / 12;       // provisão 13º
    const ferias       = (salario / 12) * 1.3333; // provisão férias + 1/3

    // Encargos previdenciários por regime
    let inss = 0, sistS = 0;
    if (trib === 'lucro') {
        inss  = salario * 0.20;   // INSS Patronal 20%
        sistS = salario * 0.058;  // RAT + Sistema S ~5,8%
    } else if (trib === 'mei') {
        inss  = salario * 0.03;   // MEI: INSS Patronal 3%
        sistS = 0;
    }
    // Simples: INSS incluso no DAS, sem custo patronal adicional

    // Benefícios
    const vtMes = vtDia * dias;
    const vrMes = vrDia * dias;

    const subtotal   = salario + fgts + fgtsMulta + decimo + ferias + inss + sistS;
    const custoTotal = subtotal + vtMes + vrMes + saude;
    const mult       = custoTotal / salario;

    if (totalEl) totalEl.textContent = _sfmt(custoTotal);
    if (multEl)  multEl.textContent  = `${mult.toFixed(2)}× o salário bruto`;

    // Tabela de detalhamento
    if (detEl) {
        const rows = [
            { l: 'Salário Bruto',                           v: salario,   highlight: false },
            { l: 'Provisão 13º Salário (1/12)',             v: decimo,    highlight: false },
            { l: 'Provisão Férias + 1/3 (1/12 × 4/3)',     v: ferias,    highlight: false },
            { l: 'FGTS Mensal (8%)',                        v: fgts,      highlight: false },
            { l: 'Provisão Multa Rescisória (40% do FGTS)', v: fgtsMulta, highlight: false },
        ];

        if (trib === 'lucro') {
            rows.push({ l: 'INSS Patronal (20%)',             v: inss,  highlight: false });
            rows.push({ l: 'RAT + Sistema S (~5,8%)',         v: sistS, highlight: false });
        } else if (trib === 'mei') {
            rows.push({ l: 'INSS Patronal MEI (3%)',          v: inss,  highlight: false });
        } else {
            rows.push({ l: 'INSS Patronal — incluso no DAS (Simples)', v: null, info: true });
        }
        if (vtMes  > 0) rows.push({ l: `Vale-Transporte (${dias}d × R$${vtDia.toFixed(2)})`,  v: vtMes,  highlight: false });
        if (vrMes  > 0) rows.push({ l: `Vale-Refeição (${dias}d × R$${vrDia.toFixed(2)})`,    v: vrMes,  highlight: false });
        if (saude  > 0) rows.push({ l: 'Plano de Saúde',                                       v: saude,  highlight: false });

        detEl.innerHTML = `
        <table class="sim-clt-breakdown">
            <tbody>
            ${rows.map(r => `
            <tr ${r.info ? 'style="opacity:0.55;"' : ''}>
                <td>${r.l}</td>
                <td>${r.info ? '—' : _sfmt(r.v)}</td>
            </tr>`).join('')}
            </tbody>
            <tfoot>
            <tr class="total">
                <td>Custo Total Mensal por Funcionário</td>
                <td>${_sfmt(custoTotal)}</td>
            </tr>
            </tfoot>
        </table>`;
    }

    // Custo da equipe
    if (qtd > 1 && equipeEl && equipeV) {
        equipeEl.style.display = '';
        equipeV.textContent = _sfmt(custoTotal * qtd);
        if (equipeL) equipeL.textContent = `Custo Total — ${qtd} Funcionário${qtd > 1 ? 's' : ''}`;
    } else if (equipeEl) {
        equipeEl.style.display = 'none';
    }
};

// Alias retrocompatibilidade
window.simularRH = window.simularCLT;

// ══════════════════════════════════════════════════════════════
// MÓDULO 4 — PROJEÇÃO DE CRESCIMENTO (12 meses)
// ══════════════════════════════════════════════════════════════

const SimuladorCrescimentoModule = (() => {

    // Ícones SVG profissionais (sem emojis)
    const ICON_VET      = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    const ICON_PRECO    = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
    const ICON_UNIDADE  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8"/><path d="M18 9h2a2 2 0 0 1 2 2v11"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
    const ICON_CORTE    = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`;

    const SCENARIOS = [
        {
            id: 'contratar_vet',
            icon: ICON_VET,
            title: 'Contratar Profissional',
            desc: 'Simula o impacto de adicionar um novo profissional à equipe.',
            params: [
                { id: 'cv_salario', label: 'Salário bruto (R$)',       default: 4500, min: 1000, step: 500, prefix: 'R$' },
                { id: 'cv_atend',   label: 'Atendimentos extras/mês',  default: 60,   min: 0,    step: 5    },
                { id: 'cv_ticket',  label: 'Ticket médio extra (R$)',   default: 150,  min: 0,    step: 10,  prefix: 'R$' },
                { id: 'cv_ramp',    label: 'Meses para 100% da curva', default: 3,    min: 1,    step: 1    }
            ],
            compute: (base, p) => {
                const custo     = p.cv_salario * 1.68;
                const receitaMes = p.cv_atend * p.cv_ticket;
                return Array.from({ length: 12 }, (_, i) => {
                    const ramp = Math.min(1, (i + 1) / p.cv_ramp);
                    return {
                        fat:  base.faturamento + receitaMes * ramp,
                        fix:  base.totalFixos  + custo,
                        vari: base.totalVariaveis * (base.faturamento > 0 ? (base.faturamento + receitaMes * ramp) / base.faturamento : 1)
                    };
                });
            }
        },
        {
            id: 'aumentar_preco',
            icon: ICON_PRECO,
            title: 'Reajustar Preços',
            desc: 'Simula o impacto de aumentar preços com possível redução de demanda.',
            params: [
                { id: 'ap_pct',   label: 'Reajuste de preço (%)',         default: 10, min: 1, step: 1, suffix: '%' },
                { id: 'ap_churn', label: 'Perda estimada de clientes (%)', default: 5,  min: 0, step: 1, suffix: '%' },
                { id: 'ap_ramp',  label: 'Meses para estabilizar',         default: 2,  min: 1, step: 1 }
            ],
            compute: (base, p) => {
                const fatFinal = base.faturamento * (1 + p.ap_pct / 100) * (1 - p.ap_churn / 100);
                return Array.from({ length: 12 }, (_, i) => {
                    const ramp = Math.min(1, (i + 1) / p.ap_ramp);
                    const fat  = base.faturamento + (fatFinal - base.faturamento) * ramp;
                    return {
                        fat,
                        fix:  base.totalFixos,
                        vari: base.totalVariaveis * (base.faturamento > 0 ? fat / base.faturamento : 1)
                    };
                });
            }
        },
        {
            id: 'segunda_unidade',
            icon: ICON_UNIDADE,
            title: 'Segunda Unidade',
            desc: 'Simula a abertura de uma filial com custos adicionais e nova receita.',
            params: [
                { id: 'su_aluguel', label: 'Aluguel da nova unidade (R$)',      default: 3000, min: 0,  step: 500, prefix: 'R$' },
                { id: 'su_fat_pct', label: '% do faturamento atual projetado',  default: 60,   min: 10, step: 5,   suffix: '%'  },
                { id: 'su_ramp',    label: 'Meses para atingir 100%',           default: 6,    min: 1,  step: 1    }
            ],
            compute: (base, p) => {
                const fixExtra = p.su_aluguel + base.totalFixos * 0.45;
                const fatMeta  = base.faturamento * (p.su_fat_pct / 100);
                return Array.from({ length: 12 }, (_, i) => {
                    const ramp = Math.min(1, (i + 1) / p.su_ramp);
                    return {
                        fat:  base.faturamento + fatMeta * ramp,
                        fix:  base.totalFixos  + fixExtra,
                        vari: base.totalVariaveis + (base.totalVariaveis * (p.su_fat_pct / 100)) * ramp
                    };
                });
            }
        },
        {
            id: 'reduzir_custos',
            icon: ICON_CORTE,
            title: 'Reduzir Custos',
            desc: 'Simula o ganho de margem ao cortar despesas fixas e variáveis.',
            params: [
                { id: 'rc_fix_pct', label: 'Redução em custos fixos (%)',     default: 10, min: 1, step: 1, suffix: '%' },
                { id: 'rc_var_pct', label: 'Redução em custos variáveis (%)', default: 5,  min: 0, step: 1, suffix: '%' },
                { id: 'rc_ramp',    label: 'Meses para implementar cortes',   default: 3,  min: 1, step: 1 }
            ],
            compute: (base, p) => {
                const fixFinal  = base.totalFixos     * (1 - p.rc_fix_pct  / 100);
                const variFinal = base.totalVariaveis * (1 - p.rc_var_pct  / 100);
                return Array.from({ length: 12 }, (_, i) => {
                    const ramp = Math.min(1, (i + 1) / p.rc_ramp);
                    return {
                        fat:  base.faturamento,
                        fix:  base.totalFixos     - (base.totalFixos     - fixFinal)  * ramp,
                        vari: base.totalVariaveis - (base.totalVariaveis - variFinal) * ramp
                    };
                });
            }
        }
    ];

    let _activeScenario = SCENARIOS[0].id;
    let _crescChart = null;

    function _getBase() {
        const data   = JSON.parse(localStorage.getItem('pav_ultimos_dados') || 'null');
        const totais = data && window.calcularTotais ? window.calcularTotais(data) : {};
        return {
            faturamento:    totais.faturamento    || 0,
            totalFixos:     totais.totalFixos     || 0,
            totalVariaveis: totais.totalVariaveis || 0,
            lucroGerencial: totais.lucroGerencial || 0
        };
    }

    function render(container) {
        if (!container) return;
        container.innerHTML = `
        <div class="card">
            <div class="sim-panel-header">
                <div>
                    <h3>Projeção de Crescimento — 12 Meses</h3>
                    <p>Selecione um cenário estratégico e ajuste os parâmetros para ver a projeção financeira nos próximos 12 meses.</p>
                </div>
                <button class="btn-primary" id="btn-crescimento-pdf" style="font-size:0.8rem; padding:0.5rem 1rem; flex-shrink:0;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Exportar PDF
                </button>
            </div>
            <div class="sim-scenarios-grid" id="sim-cresc-scenarios"></div>
            <div class="sim-params-panel" id="sim-cresc-params"></div>
            <div class="sim-result-bar" id="sim-cresc-results"></div>
            <div style="position:relative; height:200px; margin-top:0.5rem;">
                <canvas id="sim-cresc-chart"></canvas>
            </div>
            <p style="font-size:0.72rem; color:var(--text-muted); margin-top:8px; text-align:center;">
                Projeção baseada no último balanço consolidado. Valores estimados para fins de planejamento.
            </p>
        </div>`;

        _renderScenarios();
        _selectScenario(_activeScenario);
        document.getElementById('btn-crescimento-pdf')?.addEventListener('click', exportPDF);
    }

    function _renderScenarios() {
        const el = document.getElementById('sim-cresc-scenarios');
        if (!el) return;
        el.innerHTML = SCENARIOS.map(s => `
            <div class="sim-scenario-card ${s.id === _activeScenario ? 'active' : ''}"
                 data-scenario="${s.id}" onclick="SimuladorCrescimentoModule.select('${s.id}')">
                <div class="sim-scenario-icon">${s.icon}</div>
                <h4>${s.title}</h4>
                <p>${s.desc}</p>
                ${s.id === _activeScenario ? '<span class="sim-active-badge">Ativo</span>' : ''}
            </div>`).join('');
    }

    function _selectScenario(id) {
        _activeScenario = id;
        _renderScenarios();
        _renderParams();
        _runProjection();
    }

    function _renderParams() {
        const panel = document.getElementById('sim-cresc-params');
        if (!panel) return;
        const scenario = SCENARIOS.find(s => s.id === _activeScenario);
        if (!scenario) return;

        const base = _getBase();
        if (!base.faturamento) {
            panel.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">
                Consolide um Balanço Financeiro para usar os dados reais como base de projeção.
            </p>`;
            return;
        }

        panel.innerHTML = `
            <h4>${scenario.title} — Parâmetros</h4>
            <div class="sim-params-grid">
                ${scenario.params.map(p => `
                <div class="input-group">
                    <label style="font-size:0.8rem;">${p.label}</label>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${p.prefix ? `<span style="font-size:0.85rem; color:var(--text-secondary);">${p.prefix}</span>` : ''}
                        <input type="number" id="sc-${p.id}" value="${p.default}" min="${p.min}" step="${p.step}"
                               oninput="SimuladorCrescimentoModule.run()"
                               style="width:100%; padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.88rem;">
                        ${p.suffix ? `<span style="font-size:0.85rem; color:var(--text-secondary);">${p.suffix}</span>` : ''}
                    </div>
                </div>`).join('')}
            </div>`;
    }

    function _getParams() {
        const scenario = SCENARIOS.find(s => s.id === _activeScenario);
        if (!scenario) return {};
        const out = {};
        scenario.params.forEach(p => {
            out[p.id] = parseFloat(document.getElementById(`sc-${p.id}`)?.value) || p.default;
        });
        return out;
    }

    function _runProjection() {
        const base     = _getBase();
        if (!base.faturamento) return;
        const scenario = SCENARIOS.find(s => s.id === _activeScenario);
        if (!scenario) return;

        const params  = _getParams();
        const months  = scenario.compute(base, params);
        const labels  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const last    = months[11];
        const lucro12 = last.fat - last.fix - last.vari;
        const lucroAt = base.faturamento - base.totalFixos - base.totalVariaveis;
        const ganho   = lucro12 - lucroAt;

        const resultsEl = document.getElementById('sim-cresc-results');
        if (resultsEl) {
            resultsEl.innerHTML = `
                <div class="sim-result-item">
                    <span class="sim-result-label">Faturamento (mês 12)</span>
                    <span class="sim-result-value">${_sfmt(last.fat)}</span>
                </div>
                <div class="sim-result-item">
                    <span class="sim-result-label">Lucro Projetado (mês 12)</span>
                    <span class="sim-result-value ${lucro12 < 0 ? 'negative' : ''}">${_sfmt(lucro12)}</span>
                </div>
                <div class="sim-result-item">
                    <span class="sim-result-label">Ganho vs. Atual</span>
                    <span class="sim-result-value ${ganho < 0 ? 'negative' : ''}">${ganho >= 0 ? '+' : ''}${_sfmt(ganho)}</span>
                </div>
                <div class="sim-result-item">
                    <span class="sim-result-label">Lucro Acumulado 12m</span>
                    <span class="sim-result-value">${_sfmt(months.reduce((s, m) => s + (m.fat - m.fix - m.vari), 0))}</span>
                </div>`;
        }

        const canvas = document.getElementById('sim-cresc-chart');
        if (!canvas) return;
        if (_crescChart) { _crescChart.destroy(); _crescChart = null; }

        const tc = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#64748b';
        const gc = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(0,0,0,0.08)';

        _crescChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Faturamento', data: months.map(m => Math.round(m.fat)), borderColor: '#234e70', backgroundColor: 'rgba(35,78,112,0.08)', borderWidth: 2.5, pointRadius: 4, fill: false, tension: 0.3 },
                    { label: 'Custos Totais', data: months.map(m => Math.round(m.fix + m.vari)), borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.06)', borderWidth: 2, pointRadius: 3, fill: false, tension: 0.3, borderDash: [5, 4] },
                    { label: 'Lucro', data: months.map(m => Math.round(m.fat - m.fix - m.vari)), borderColor: '#2f9c77', backgroundColor: 'rgba(47,156,119,0.10)', borderWidth: 2.5, pointRadius: 4, fill: true, tension: 0.3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: tc, font: { family: 'Montserrat', size: 11 }, boxWidth: 12, padding: 12 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${_sfmt(ctx.raw)}` } }
                },
                scales: {
                    x: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gc } },
                    y: {
                        ticks: { color: tc, font: { size: 10 }, callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) },
                        grid: { color: gc }
                    }
                }
            }
        });

        return { months, scenario, base, params };
    }

    function exportPDF() {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) { if (window.Utils) Utils.showToast('jsPDF não carregado.', 'error'); return; }
        const base     = _getBase();
        if (!base.faturamento) { if (window.Utils) Utils.showToast('Consolide um Balanço antes de exportar.', 'error'); return; }
        const scenario = SCENARIOS.find(s => s.id === _activeScenario);
        const params   = _getParams();
        const months   = scenario.compute(base, params);
        const clinica  = JSON.parse(localStorage.getItem('pav_clinica') || '{}');
        const orgName  = clinica.nome || localStorage.getItem('pav_brand_nome') || 'Clínica';
        const today    = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
        const labels   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

        const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 0;

        doc.setFillColor(35, 78, 112); doc.rect(0, 0, pageW, 38, 'F');
        doc.setFillColor(47, 156, 119); doc.rect(0, 35, pageW, 3, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
        doc.text('PAVE', 14, 14);
        doc.setFontSize(11); doc.text('Simulador de Crescimento — Projeção 12 Meses', 14, 22);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.text(orgName, 14, 30);
        doc.text(`Cenário: ${scenario.title}`, pageW / 2, 30, { align: 'center' });
        doc.text(`Emitido em ${today}`, pageW - 14, 30, { align: 'right' });
        y = 50;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(35, 78, 112);
        doc.text('BASE ATUAL', 14, y); y += 6;
        doc.autoTable({
            startY: y,
            head: [['Faturamento', 'Custos Fixos', 'Custos Variáveis', 'Lucro']],
            body: [[_sfmt(base.faturamento), _sfmt(base.totalFixos), _sfmt(base.totalVariaveis), _sfmt(base.faturamento - base.totalFixos - base.totalVariaveis)]],
            theme: 'grid',
            headStyles: { fillColor: [35, 78, 112], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9 }, styles: { cellPadding: 3 }, margin: { left: 14, right: 14 }
        });
        y = doc.lastAutoTable.finalY + 10;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(35, 78, 112);
        doc.text('PROJEÇÃO MENSAL — 12 MESES', 14, y); y += 6;
        doc.autoTable({
            startY: y,
            head: [['Mês', 'Faturamento', 'Custos Totais', 'Lucro', 'Margem %']],
            body: months.map((m, i) => {
                const lucro = m.fat - m.fix - m.vari;
                return [labels[i], _sfmt(m.fat), _sfmt(m.fix + m.vari), _sfmt(lucro), m.fat > 0 ? (lucro / m.fat * 100).toFixed(1) + '%' : '0.0%'];
            }),
            theme: 'striped',
            headStyles: { fillColor: [35, 78, 112], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: [240, 245, 250] },
            styles: { cellPadding: 3 }, margin: { left: 14, right: 14 }
        });

        const totalPgs = doc.getNumberOfPages();
        for (let i = 1; i <= totalPgs; i++) {
            doc.setPage(i);
            doc.setDrawColor(200, 200, 200); doc.line(14, pageH - 14, pageW - 14, pageH - 14);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150);
            doc.text('PAVE — Gestão Financeira Veterinária · Simulação para fins gerenciais', 14, pageH - 8);
            doc.text(`Página ${i} de ${totalPgs}`, pageW - 14, pageH - 8, { align: 'right' });
        }

        doc.save(`PAVE-Simulacao-${scenario.title.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 7)}.pdf`);
        if (window.Utils) Utils.showToast('PDF exportado com sucesso!', 'success');
    }

    return {
        render,
        run:    () => _runProjection(),
        select: (id) => _selectScenario(id)
    };
})();

window.SimuladorCrescimentoModule = SimuladorCrescimentoModule;
