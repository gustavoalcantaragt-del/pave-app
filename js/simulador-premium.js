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
            <div style="grid-column: 1 / -1; padding:1.2rem; background:rgba(255,69,58,0.1); border:1px solid rgba(255,69,58,0.4); border-radius:12px; margin-bottom:1rem; display:flex; align-items:flex-start; gap:15px; color:#ff453a;">
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
        const cardStyle = (color) => `padding:1.5rem 1rem; background:rgba(0,0,0,0.3); border-radius:12px; text-align:center; border-top:3px solid ${color};`;
        resultEl.innerHTML = riskAlertHTML + `
            <div style="${cardStyle('#5ac8fa')}">
                <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">MARGEM CONTRIBUIÇÃO</div>
                <div style="font-size:1.3rem; font-weight:800; color:#5ac8fa; margin-top:0.5rem;">R$ ${margem.toLocaleString('pt-BR')}</div>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${margemPct}%</div>
            </div>
            <div style="${cardStyle(lucro >= 0 ? '#30d158' : '#ff453a')}">
                <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700;">LUCRO PROJETADO</div>
                <div style="font-size:1.3rem; font-weight:800; color:${lucro >= 0 ? '#30d158' : '#ff453a'}; margin-top:0.5rem;">R$ ${lucro.toLocaleString('pt-BR')}</div>
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
                    { label: 'Projetado', data: [fat, fix, vari, lucro], backgroundColor: ['rgba(0,122,255,0.7)', 'rgba(255,69,58,0.7)', 'rgba(255,214,10,0.7)', lucro >= 0 ? 'rgba(48,209,88,0.7)' : 'rgba(255,69,58,0.7)'], borderRadius: 8 }
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
        <div style="margin-top:1rem; font-size:0.75rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
           <i>Nota: Este é o custo efetivo <b>médio mensal</b>. Não estão inclusos V.T., V.R. ou convênios.</i>
        </div>
    `;
    
    descEl.innerHTML = html;
};
