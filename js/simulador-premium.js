// simulador-premium.js — What-If Scenario Simulator

window.adjustSimValue = function(id, type, amount) {
    const el = document.getElementById(id);
    if (!el) return;
    let val = parseFloat(el.value) || 0;
    if (type === 'abs') {
        val += amount;
    } else if (type === 'pct') {
        if (val === 0) val = 1000 * Math.sign(amount); // Arbitrary start if 0
        else val = val * (1 + (amount / 100));
    }
    if (val < 0) val = 0; // Prevent negative costs/revenue manually
    el.value = Math.round(val);
    window.runSimulation();
};

window.runSimulation = function() {
    const fatEl = document.getElementById('sim-fat');
    const fixEl = document.getElementById('sim-fix');
    const varEl = document.getElementById('sim-var');
    if (!fatEl || !fixEl || !varEl) return;

    const simResultsEl = document.getElementById('sim-results');

    // Initialize from last data if fields are empty or 0
    const data = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    if (!data && simResultsEl && parseFloat(fatEl.value) === 0) {
        simResultsEl.innerHTML = `
            <div class="pav-empty-state" style="grid-column:1/-1;">
                <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                <h3>Simulador aguardando base</h3>
                <p>Consolide um <strong style="color:var(--accent-blue)">Balanço Financeiro</strong> primeiro para que o simulador use seus dados reais como ponto de partida.</p>
                <button class="btn-primary" style="margin-top:0.5rem;" onclick="document.getElementById('tab-balanco').click()">Ir para Finanças</button>
            </div>`;
        return;
    }
    if (data && (!fatEl.value || parseFloat(fatEl.value) === 0) && (!fixEl.value || parseFloat(fixEl.value) === 0) && (!varEl.value || parseFloat(varEl.value) === 0)) {
        const totais = window.calcularTotais ? window.calcularTotais(data) : {};
        fatEl.value = Math.round(data.faturamento || 0);
        fixEl.value = Math.round(totais.totalFixos || 0);
        varEl.value = Math.round(totais.totalVariaveis || 0);
    }

    const fat = parseFloat(fatEl.value) || 0;
    const fix = parseFloat(fixEl.value) || 0;
    const vari = parseFloat(varEl.value) || 0;

    const margem = fat - vari;
    const lucro = margem - fix;
    const margemPct = fat > 0 ? ((margem / fat) * 100).toFixed(1) : '0.0';
    const lucroPct = fat > 0 ? ((lucro / fat) * 100).toFixed(1) : '0.0';
    const pe = margem > 0 ? (fix / (margem / fat)).toFixed(2) : 0;
    
    // Risk Alert logic
    let riskAlertHTML = '';
    if (lucro < 0) {
        const deficit = Math.abs(lucro);
        riskAlertHTML = `
            <div style="grid-column: 1 / -1; padding:1.2rem; background:rgba(226,75,74,0.1); border:1px solid rgba(226,75,74,0.4); border-radius:12px; margin-bottom:1rem; display:flex; align-items:flex-start; gap:15px; color:#E24B4A;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:3px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div style="text-align:left;">
                    <h4 style="margin:0 0 5px 0;">Déficit de Operação!</h4>
                    <span style="font-size:0.9rem; color:var(--text-secondary); line-height:1.4;">Este cenário indica <b>R$ ${deficit.toLocaleString('pt-BR', {minimumFractionDigits:2})}</b> de Prejuízo. Para que a clínica cubra todos os custos, sua meta de faturamento exata é o <b>Ponto de Equilíbrio (R$ ${parseFloat(pe).toLocaleString('pt-BR', {minimumFractionDigits:2})})</b>.</span>
                </div>
            </div>`;
    }

    // Result cards
    const resultEl = document.getElementById('sim-result');
    if (resultEl) {
        const cardStyle = (color) => `padding:1.5rem 1rem; background:var(--bg-elevated); border-radius:12px; text-align:center; border-top:3px solid ${color};`;
        resultEl.innerHTML = riskAlertHTML + `
            <div style="${cardStyle('#5ac8fa')}">
                <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">MARGEM CONTRIBUIÇÃO</div>
                <div style="font-size:1.3rem; font-weight:800; color:#5ac8fa; margin-top:0.5rem;">R$ ${margem.toLocaleString('pt-BR')}</div>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${margemPct}%</div>
            </div>
            <div style="${cardStyle(lucro >= 0 ? '#1D9E75' : '#E24B4A')}">
                <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">LUCRO PROJETADO</div>
                <div style="font-size:1.3rem; font-weight:800; color:${lucro >= 0 ? '#1D9E75' : '#E24B4A'}; margin-top:0.5rem;">R$ ${lucro.toLocaleString('pt-BR')}</div>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${lucroPct}%</div>
            </div>
            <div style="${cardStyle('var(--accent-blue)')}">
                <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">PONTO DE EQUILÍBRIO</div>
                <div style="font-size:1.3rem; font-weight:800; color:var(--accent-blue); margin-top:0.5rem;">R$ ${parseFloat(pe).toLocaleString('pt-BR')}</div>
                <div style="font-size:0.7rem; color:var(--text-secondary);">Faturamento mínimo</div>
            </div>
        `;
    }

    // Chart comparing current vs projected
    const chartEl = document.getElementById('sim-chart');
    if (chartEl) {
        if (window.simChartObj) window.simChartObj.destroy();

        const currentData = data ? window.calcularTotais(data) : null;
        const currentLucro = currentData ? currentData.lucroGerencial : 0;
        const currentFat = currentData ? currentData.faturamento : 0;

        window.simChartObj = new Chart(chartEl, {
            type: 'bar',
            data: {
                labels: ['Faturamento', 'Custos Fixos', 'Custos Variáveis', 'Lucro'],
                datasets: [
                    { label: 'Atual', data: [currentFat, currentData?.totalFixos || 0, currentData?.totalVariaveis || 0, currentLucro], backgroundColor: 'rgba(142,142,147,0.5)', borderRadius: 8 },
                    { label: 'Projetado', data: [fat, fix, vari, lucro], backgroundColor: ['rgba(0,122,255,0.7)', 'rgba(226,75,74,0.7)', 'rgba(255,214,10,0.7)', lucro >= 0 ? 'rgba(29,158,117,0.7)' : 'rgba(226,75,74,0.7)'], borderRadius: 8 }
                ]
            },
            options: {
                plugins: { legend: { labels: { color: '#8e8e93', font: { family: 'Montserrat' } } } },
                scales: { x: { ticks: { color: '#8e8e93' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#8e8e93' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
            }
        });
    }
};

window.simularRH = function() {
    const salario = parseFloat(document.getElementById('rh-salario')?.value) || 0;
    const descEl = document.getElementById('rh-detalhes');
    const totalEl = document.getElementById('rh-custo-total');

    if (!descEl || !totalEl) return;

    if (salario <= 0) {
        totalEl.innerText = 'R$ 0,00';
        descEl.innerText = 'Aguardando valor do salário base...';
        return;
    }

    const trib = document.getElementById('rh-tributacao')?.value || 'simples';
    
    const fgtsMensal = salario * 0.08;
    const ferias1_3 = (salario / 12) * 1.3333; // 1/12 avos + 1/3 de férias
    const decimoTerceiro = salario / 12;
    const provisaoMultaFGTS = fgtsMensal * 0.40; 
    
    let inssPatronal = 0;
    let sistS = 0;

    if (trib === 'lucro') {
        inssPatronal = salario * 0.20; // 20% INSS Patronal
        sistS = salario * 0.058; // Sistema S e Terceiros Aprox 5.8%
    }

    const custoTotal = salario + fgtsMensal + ferias1_3 + decimoTerceiro + provisaoMultaFGTS + inssPatronal + sistS;

    totalEl.innerText = `R$ ${custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    
    const fmt = v => `R$ ${v.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    
    let html = `
        <table style="width:100%; font-size:0.85rem; color:var(--text-secondary); text-align:left;">
            <tr><td style="padding:4px 0;">Salário Base:</td><td style="text-align:right;">${fmt(salario)}</td></tr>
            <tr><td style="padding:4px 0;">Provisão Mensal 13º:</td><td style="text-align:right;">${fmt(decimoTerceiro)}</td></tr>
            <tr><td style="padding:4px 0;">Provisão Férias + 1/3:</td><td style="text-align:right;">${fmt(ferias1_3)}</td></tr>
            <tr><td style="padding:4px 0;">FGTS + Mensal Multa (40%):</td><td style="text-align:right;">${fmt(fgtsMensal + provisaoMultaFGTS)}</td></tr>
    `;
    
    if (trib === 'lucro') {
        html += `<tr><td style="padding:4px 0;">INSS Patronal + Terceiros (25.8%):</td><td style="text-align:right;">${fmt(inssPatronal + sistS)}</td></tr>`;
    } else {
        html += `<tr><td style="padding:4px 0;">INSS Patronal (Simples Nacional):</td><td style="text-align:right;">Isento / Incluso no DAS</td></tr>`;
    }
    
    html += `
            <tr style="font-weight:700; color:var(--accent-gold);">
                <td style="padding-top:12px;">Custo Multiplicador:</td>
                <td style="text-align:right; padding-top:12px;">${(custoTotal / salario).toFixed(2)}x o Salário</td>
            </tr>
        </table>
        <div style="margin-top:1rem; font-size:0.75rem; border-top:1px solid var(--border); padding-top:10px;">
           <i>Nota: Este é o custo efetivo <b>médio mensal</b>. Não estão inclusos V.T., V.R. ou convênios.</i>
        </div>
    `;
    
    descEl.innerHTML = html;
};

// ============================================================
// SimuladorCrescimentoModule — Feature 4.2
// 4 cenários de crescimento + projeção 12 meses + PDF
// ============================================================

const SimuladorCrescimentoModule = (() => {

    const SCENARIOS = [
        {
            id: 'contratar_vet',
            icon: '👨‍⚕️',
            title: 'Contratar Veterinário',
            desc: 'Simula o impacto de contratar um novo profissional na equipe.',
            params: [
                { id: 'cv_salario',   label: 'Salário bruto do vet',  default: 4500,  min: 1000, step: 500, prefix: 'R$' },
                { id: 'cv_atend',     label: 'Atendimentos extras/mês', default: 60,    min: 0,    step: 5    },
                { id: 'cv_ticket',    label: 'Ticket médio extra',    default: 150,   min: 0,    step: 10, prefix: 'R$' },
                { id: 'cv_ramp',      label: 'Meses para atingir 100%', default: 3,   min: 1,    step: 1    }
            ],
            compute: (base, p) => {
                const custo = p.cv_salario * 1.68; // encargos estimados
                const receitaMes = p.cv_atend * p.cv_ticket;
                return Array.from({ length: 12 }, (_, i) => {
                    const ramp = Math.min(1, (i + 1) / p.cv_ramp);
                    return {
                        fat:   base.faturamento + receitaMes * ramp,
                        fix:   base.totalFixos  + custo,
                        vari:  base.totalVariaveis * (base.faturamento > 0 ? (base.faturamento + receitaMes * ramp) / base.faturamento : 1)
                    };
                });
            }
        },
        {
            id: 'aumentar_preco',
            icon: '💰',
            title: 'Aumentar Preços',
            desc: 'Simula o impacto de reajustar preços com possível redução de demanda.',
            params: [
                { id: 'ap_pct',      label: 'Reajuste de preço (%)', default: 10,  min: 1,   step: 1, suffix: '%' },
                { id: 'ap_churn',    label: 'Perda de clientes (%)', default: 5,   min: 0,   step: 1, suffix: '%' }
            ],
            compute: (base, p) => {
                const fatNovo = base.faturamento * (1 + p.ap_pct / 100) * (1 - p.ap_churn / 100);
                return Array.from({ length: 12 }, () => ({
                    fat:  fatNovo,
                    fix:  base.totalFixos,
                    vari: base.totalVariaveis * (base.faturamento > 0 ? fatNovo / base.faturamento : 1)
                }));
            }
        },
        {
            id: 'segunda_unidade',
            icon: '🏥',
            title: 'Segunda Unidade',
            desc: 'Simula abertura de uma filial com custos fixos adicionais e nova receita.',
            params: [
                { id: 'su_aluguel',  label: 'Aluguel da nova unidade', default: 3000,  min: 0, step: 500, prefix: 'R$' },
                { id: 'su_fat_pct',  label: '% do faturamento atual projetado', default: 60, min: 10, step: 5, suffix: '%' },
                { id: 'su_ramp',     label: 'Meses para atingir 100%', default: 6, min: 1, step: 1 }
            ],
            compute: (base, p) => {
                const fixExtra = p.su_aluguel + base.totalFixos * 0.45; // 45% dos fixos replicados
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
            icon: '✂️',
            title: 'Reduzir Custos',
            desc: 'Simula o ganho de margem ao cortar despesas fixas e variáveis.',
            params: [
                { id: 'rc_fix_pct',  label: 'Redução em fixos (%)',    default: 10, min: 1, step: 1, suffix: '%' },
                { id: 'rc_var_pct',  label: 'Redução em variáveis (%)', default: 5,  min: 0, step: 1, suffix: '%' }
            ],
            compute: (base, p) => {
                const fixNovo  = base.totalFixos      * (1 - p.rc_fix_pct  / 100);
                const variNovo = base.totalVariaveis  * (1 - p.rc_var_pct  / 100);
                return Array.from({ length: 12 }, () => ({
                    fat:  base.faturamento,
                    fix:  fixNovo,
                    vari: variNovo
                }));
            }
        }
    ];

    let _activeScenario = SCENARIOS[0].id;
    let _crescChart = null;

    // ── DADOS BASE ─────────────────────────────────────────────
    function _getBase() {
        const data   = JSON.parse(localStorage.getItem('pav_ultimos_dados') || 'null');
        const totais = (data && window.calcularTotais) ? window.calcularTotais(data) : {};
        return {
            faturamento:    totais.faturamento     || 0,
            totalFixos:     totais.totalFixos      || 0,
            totalVariaveis: totais.totalVariaveis  || 0,
            lucroGerencial: totais.lucroGerencial  || 0
        };
    }

    // ── RENDER PRINCIPAL ───────────────────────────────────────
    function render(container) {
        if (!container) return;
        container.innerHTML = `
        <div class="card" style="margin-bottom:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:.75rem;">
                <h3 style="margin:0;">Simulador de Crescimento</h3>
                <button class="btn-primary" id="btn-crescimento-pdf" style="font-size:0.8rem; padding:0.5rem 1rem;">
                    ↓ Exportar Projeção (PDF)
                </button>
            </div>

            <!-- Seleção de Cenário -->
            <div class="sim-scenarios-grid" id="sim-cresc-scenarios"></div>

            <!-- Parâmetros do Cenário Ativo -->
            <div class="sim-params-panel" id="sim-cresc-params"></div>

            <!-- Resultados -->
            <div class="sim-result-bar" id="sim-cresc-results"></div>

            <!-- Gráfico 12 Meses -->
            <div style="position:relative; height:260px; margin-top:0.5rem;">
                <canvas id="sim-cresc-chart"></canvas>
            </div>
            <p style="font-size:0.72rem; color:var(--text-muted); margin-top:8px; text-align:center;">
                * Projeção baseada no último balanço consolidado. Valores estimados para fins de planejamento.
            </p>
        </div>`;

        _renderScenarios();
        _selectScenario(_activeScenario);

        document.getElementById('btn-crescimento-pdf')
            ?.addEventListener('click', exportPDF);
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

        const base  = _getBase();
        const hasBase = base.faturamento > 0;
        if (!hasBase) {
            panel.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">
                Consolide um Balanço Financeiro para usar os dados reais como ponto de partida.
            </p>`;
            return;
        }

        panel.innerHTML = `
            <h4>${scenario.icon} ${scenario.title} — Parâmetros</h4>
            <div class="sim-params-grid">
                ${scenario.params.map(p => `
                    <div class="input-group">
                        <label style="font-size:0.8rem;">${p.label}</label>
                        <div style="display:flex; align-items:center; gap:6px;">
                            ${p.prefix ? `<span style="font-size:0.85rem; color:var(--text-secondary);">${p.prefix}</span>` : ''}
                            <input type="number"
                                id="sc-${p.id}"
                                value="${p.default}"
                                min="${p.min}"
                                step="${p.step}"
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

        const params   = _getParams();
        const months   = scenario.compute(base, params);
        const labels   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const fmt      = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        // Resultado no mês 12
        const last     = months[11];
        const lucro12  = last.fat - last.fix - last.vari;
        const lucroAtu = base.faturamento - base.totalFixos - base.totalVariaveis;
        const ganho    = lucro12 - lucroAtu;

        const resultsEl = document.getElementById('sim-cresc-results');
        if (resultsEl) {
            resultsEl.innerHTML = `
                <div class="sim-result-item">
                    <span class="sim-result-label">Faturamento (mês 12)</span>
                    <span class="sim-result-value">${fmt(last.fat)}</span>
                </div>
                <div class="sim-result-item">
                    <span class="sim-result-label">Lucro Projetado (mês 12)</span>
                    <span class="sim-result-value ${lucro12 < 0 ? 'negative' : ''}">${fmt(lucro12)}</span>
                </div>
                <div class="sim-result-item">
                    <span class="sim-result-label">Ganho vs Atual</span>
                    <span class="sim-result-value ${ganho < 0 ? 'negative' : ''}">${ganho >= 0 ? '+' : ''}${fmt(ganho)}</span>
                </div>
                <div class="sim-result-item">
                    <span class="sim-result-label">Lucro Acumulado 12m</span>
                    <span class="sim-result-value">${fmt(months.reduce((s, m) => s + (m.fat - m.fix - m.vari), 0))}</span>
                </div>`;
        }

        // Gráfico
        const canvas = document.getElementById('sim-cresc-chart');
        if (!canvas) return;

        if (_crescChart) { _crescChart.destroy(); _crescChart = null; }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#64748b';
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim()       || 'rgba(0,0,0,0.08)';

        _crescChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Faturamento',
                        data: months.map(m => Math.round(m.fat)),
                        borderColor: '#234e70',
                        backgroundColor: 'rgba(35,78,112,0.1)',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'Custos Totais',
                        data: months.map(m => Math.round(m.fix + m.vari)),
                        borderColor: '#E24B4A',
                        backgroundColor: 'rgba(226,75,74,0.08)',
                        borderWidth: 2,
                        pointRadius: 3,
                        fill: false,
                        tension: 0.3,
                        borderDash: [5, 4]
                    },
                    {
                        label: 'Lucro',
                        data: months.map(m => Math.round(m.fat - m.fix - m.vari)),
                        borderColor: '#2f9c77',
                        backgroundColor: 'rgba(47,156,119,0.12)',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: textColor, font: { family: 'Montserrat', size: 11 }, boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
                    y: {
                        ticks: {
                            color: textColor,
                            font: { size: 10 },
                            callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
                        },
                        grid: { color: gridColor }
                    }
                }
            }
        });

        return { months, scenario, base, params };
    }

    // ── EXPORT PDF ─────────────────────────────────────────────
    function exportPDF() {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) { Utils.showToast('jsPDF não carregado.', 'error'); return; }

        const base      = _getBase();
        if (!base.faturamento) { Utils.showToast('Consolide um Balanço antes de exportar.', 'error'); return; }

        const scenario  = SCENARIOS.find(s => s.id === _activeScenario);
        const params    = _getParams();
        const months    = scenario.compute(base, params);
        const clinica   = JSON.parse(localStorage.getItem('pav_clinica') || '{}');
        const orgName   = clinica.nome || localStorage.getItem('pav_brand_nome') || 'Clínica';
        const fmt       = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
        const labels    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const today     = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

        const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 0;

        // ── Cabeçalho ──
        doc.setFillColor(35, 78, 112);
        doc.rect(0, 0, pageW, 38, 'F');
        doc.setFillColor(47, 156, 119);
        doc.rect(0, 35, pageW, 3, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('PAVE', 14, 14);
        doc.setFontSize(11);
        doc.text('Simulador de Crescimento — Projeção 12 Meses', 14, 22);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(orgName, 14, 30);
        doc.text(`Cenário: ${scenario.icon} ${scenario.title}`, pageW / 2, 30, { align: 'center' });
        doc.text(`Emitido em ${today}`, pageW - 14, 30, { align: 'right' });

        y = 50;

        // ── Base Atual ──
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(35, 78, 112);
        doc.text('BASE ATUAL (último balanço)', 14, y);
        y += 6;

        doc.autoTable({
            startY: y,
            head: [['Faturamento', 'Custos Fixos', 'Custos Variáveis', 'Lucro']],
            body: [[
                fmt(base.faturamento),
                fmt(base.totalFixos),
                fmt(base.totalVariaveis),
                fmt(base.faturamento - base.totalFixos - base.totalVariaveis)
            ]],
            theme: 'grid',
            headStyles:  { fillColor: [35, 78, 112], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles:  { fontSize: 9, textColor: [24, 24, 24] },
            styles:      { cellPadding: 3 },
            margin:      { left: 14, right: 14 }
        });
        y = doc.lastAutoTable.finalY + 10;

        // ── Projeção Mensal ──
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(35, 78, 112);
        doc.text('PROJEÇÃO MENSAL — 12 MESES', 14, y);
        y += 6;

        doc.autoTable({
            startY: y,
            head: [['Mês', 'Faturamento', 'Custos Totais', 'Lucro', 'Margem %']],
            body: months.map((m, i) => {
                const lucro  = m.fat - m.fix - m.vari;
                const margem = m.fat > 0 ? (lucro / m.fat * 100).toFixed(1) + '%' : '0.0%';
                return [
                    labels[i],
                    fmt(m.fat),
                    fmt(m.fix + m.vari),
                    fmt(lucro),
                    margem
                ];
            }),
            theme: 'striped',
            headStyles:  { fillColor: [35, 78, 112], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles:  { fontSize: 9, textColor: [24, 24, 24] },
            alternateRowStyles: { fillColor: [240, 245, 250] },
            columnStyles: {
                3: { textColor: months.map(m => m.fat - m.fix - m.vari).some(l => l < 0) ? [226, 75, 74] : [47, 156, 119] }
            },
            styles:      { cellPadding: 3 },
            margin:      { left: 14, right: 14 },
            didDrawPage: (data) => {
                // Rodapé em todas as páginas
                const pg = doc.getNumberOfPages();
                for (let i = 1; i <= pg; i++) {
                    doc.setPage(i);
                    doc.setDrawColor(200, 200, 200);
                    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(150);
                    doc.text('PAVE — Gestão Financeira Veterinária · Simulação para fins gerenciais', 14, pageH - 8);
                    doc.text(`Página ${i} de ${pg}`, pageW - 14, pageH - 8, { align: 'right' });
                }
            }
        });
        y = doc.lastAutoTable.finalY + 10;

        // ── Resumo ──
        if (y + 40 < pageH - 20) {
            const lucroAcum = months.reduce((s, m) => s + (m.fat - m.fix - m.vari), 0);
            const last      = months[11];
            const lucro12   = last.fat - last.fix - last.vari;
            const lucroAtu  = base.faturamento - base.totalFixos - base.totalVariaveis;
            const ganho     = lucro12 - lucroAtu;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(35, 78, 112);
            doc.text('SUMÁRIO DO CENÁRIO', 14, y);
            y += 6;

            doc.autoTable({
                startY: y,
                head: [['Indicador', 'Valor']],
                body: [
                    ['Lucro acumulado em 12 meses',     fmt(lucroAcum)],
                    ['Lucro no mês 12',                 fmt(lucro12)],
                    ['Lucro atual (base)',               fmt(lucroAtu)],
                    ['Ganho vs. atual (mês 12)',         (ganho >= 0 ? '+' : '') + fmt(ganho)],
                    ['Crescimento de faturamento',       base.faturamento > 0 ? ((last.fat - base.faturamento) / base.faturamento * 100).toFixed(1) + '%' : 'N/A']
                ],
                theme: 'grid',
                headStyles: { fillColor: [47, 156, 119], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                bodyStyles: { fontSize: 9, textColor: [24, 24, 24] },
                styles:     { cellPadding: 3 },
                margin:     { left: 14, right: 14 }
            });
        }

        // Rodapé página 1
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setDrawColor(200, 200, 200);
            doc.line(14, pageH - 14, pageW - 14, pageH - 14);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text('PAVE — Gestão Financeira Veterinária · Simulação para fins gerenciais', 14, pageH - 8);
            doc.text(`Página ${i} de ${totalPages}`, pageW - 14, pageH - 8, { align: 'right' });
        }

        const fileName = `PAVE-Simulacao-${scenario.title.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,7)}.pdf`;
        doc.save(fileName);
        Utils.showToast('PDF exportado com sucesso!', 'success');
    }

    return {
        render,
        run:    () => _runProjection(),
        select: (id) => _selectScenario(id)
    };

})();

window.SimuladorCrescimentoModule = SimuladorCrescimentoModule;
