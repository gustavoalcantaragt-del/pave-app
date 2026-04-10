// configuracoes-premium.js — Página de Configurações + Demo + Notificação de Resumo

// ── 1. RENDERIZAR CONFIGURAÇÕES ─────────────────────────────────────────────
window.renderConfig = function() {
    // Preencher campos de perfil
    const clinica = JSON.parse(localStorage.getItem('pav_clinica') || '{}');
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('cfg-nome',   localStorage.getItem('pav_brand_nome') || clinica.nome        || '');
    setVal('cfg-resp',   localStorage.getItem('pav_brand_resp') || clinica.responsavel || '');
    setVal('cfg-cnpj',   clinica.cnpj    || '');
    setVal('cfg-crmv',   clinica.crmv    || '');
    setVal('cfg-tel',    clinica.tel     || '');
    setVal('cfg-end',    clinica.end     || '');
    const regimeEl = document.getElementById('cfg-regime');
    if (regimeEl) regimeEl.value = clinica.regime || 'simples';

    // Preencher sliders de divisão do lucro
    const div = JSON.parse(localStorage.getItem('pav_divisao_lucro') || '{}');
    const setRange = (id, val, def) => { const el = document.getElementById(id); if (el) el.value = val || def; };
    setRange('cfg-proLabore', div.proLabore,    50);
    setRange('cfg-invest',    div.investimentos, 30);
    setRange('cfg-reserva',   div.reserva,       20);
    window.updateDivisaoPreview();

    // Banner de demo
    const demoEl = document.getElementById('config-demo-banner');
    if (demoEl) demoEl.style.display = localStorage.getItem('pav_demo_mode') === 'true' ? 'flex' : 'none';

    // Card de assinatura
    _renderSubscriptionCard();
};

// ── SUBSCRIPTION CARD (Configurações) ────────────────────────────────────────
async function _renderSubscriptionCard() {
    const elPlan   = document.getElementById('cfg-sub-plan');
    const elStatus = document.getElementById('cfg-sub-status');
    const elDays   = document.getElementById('cfg-sub-days');
    const elBtn    = document.getElementById('cfg-sub-upgrade-btn');
    if (!elPlan) return;

    // Usar cache do paveInit se disponível, senão buscar
    const sub = window._pavSubStatus || await SubscriptionAPI.getStatus();

    const STATUS_LABELS = {
        trial:    { label: 'Trial',        color: '#ff9500' },
        active:   { label: 'Ativo',        color: '#30d158' },
        past_due: { label: 'Em Atraso',    color: '#ff453a' },
        canceled: { label: 'Cancelado',    color: '#ff453a' },
        expired:  { label: 'Expirado',     color: '#ff453a' },
        none:     { label: 'Sem Plano',    color: 'var(--text-muted)' },
        pending:  { label: 'Aguardando',   color: '#5ac8fa' },
    };

    const statusInfo = STATUS_LABELS[sub.status] ?? STATUS_LABELS.none;
    const planName   = sub.plan?.display_name ?? (sub.status === 'trial' ? 'PRO (Trial)' : '—');

    elPlan.textContent   = planName;
    elStatus.textContent = statusInfo.label;
    elStatus.style.color = statusInfo.color;

    if (sub.status === 'trial' && sub.daysLeft !== undefined) {
        elDays.textContent = sub.daysLeft > 0 ? `${sub.daysLeft} dia${sub.daysLeft !== 1 ? 's' : ''}` : 'Expirado';
        elDays.style.color = sub.daysLeft > 3 ? '#30d158' : '#ff453a';
    } else if (sub.status === 'active') {
        elDays.textContent = '—';
        elDays.style.color = 'var(--text-muted)';
    } else {
        elDays.textContent = '—';
    }

    // Mostrar botão de upgrade quando não está ativo
    if (elBtn && sub.status !== 'active') {
        elBtn.style.display = 'inline-block';
        if (sub.status === 'past_due') elBtn.textContent = 'Regularizar Pagamento';
        else if (sub.status === 'canceled' || sub.status === 'expired') elBtn.textContent = 'Reativar Assinatura';
        else elBtn.textContent = 'Fazer Upgrade';
    }
}

// ── 2. PREVIEW LIVE DOS SLIDERS ─────────────────────────────────────────────
window.updateDivisaoPreview = function() {
    const pL = parseInt(document.getElementById('cfg-proLabore')?.value) || 0;
    const pI = parseInt(document.getElementById('cfg-invest')?.value)    || 0;
    const pR = parseInt(document.getElementById('cfg-reserva')?.value)   || 0;
    const total = pL + pI + pR;

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val + '%'; };
    setText('lbl-proLabore', pL); setText('prev-proLabore', pL);
    setText('lbl-invest',    pI); setText('prev-invest',    pI);
    setText('lbl-reserva',   pR); setText('prev-reserva',   pR);

    const statusEl = document.getElementById('divisao-status');
    const saveBtn  = document.getElementById('btn-salvar-divisao');
    if (!statusEl) return;

    if (total === 100) {
        statusEl.style.background = 'rgba(48,209,88,0.1)';
        statusEl.style.border     = '1px solid rgba(48,209,88,0.3)';
        statusEl.style.color      = '#30d158';
        statusEl.textContent      = 'Total: 100% — Distribuição válida';
        if (saveBtn) saveBtn.disabled = false;
    } else {
        statusEl.style.background = 'rgba(255,69,58,0.1)';
        statusEl.style.border     = '1px solid rgba(255,69,58,0.3)';
        statusEl.style.color      = '#ff453a';
        statusEl.textContent      = `Total: ${total}% — Precisa somar 100%`;
        if (saveBtn) saveBtn.disabled = true;
    }
};

// ── 3. SALVAR PERFIL DA CLÍNICA ──────────────────────────────────────────────
window.salvarConfiguracoes = function(btn) {
    Utils.setLoading(btn, true);

    const nome   = document.getElementById('cfg-nome')?.value.trim()   || '';
    const resp   = document.getElementById('cfg-resp')?.value.trim()   || '';
    const cnpj   = document.getElementById('cfg-cnpj')?.value.trim()   || '';
    const crmv   = document.getElementById('cfg-crmv')?.value.trim()   || '';
    const tel    = document.getElementById('cfg-tel')?.value.trim()    || '';
    const end    = document.getElementById('cfg-end')?.value.trim()    || '';
    const regime = document.getElementById('cfg-regime')?.value        || 'simples';

    if (!nome) {
        Utils.setLoading(btn, false);
        return Utils.showToast('Informe o nome da clínica', 'error');
    }

    const clinicaData = { nome, responsavel: resp, cnpj, crmv, tel, end, regime };
    localStorage.setItem('pav_clinica',    JSON.stringify(clinicaData));
    localStorage.setItem('pav_brand_nome', nome);
    localStorage.setItem('pav_brand_resp', resp);

    // Atualizar sidebar e topbar imediatamente
    const elClinic = document.getElementById('sidebar-clinic-name');
    if (elClinic) elClinic.textContent = nome;
    const elTopbar = document.getElementById('topbar-clinic-name');
    if (elTopbar) elTopbar.textContent = nome;

    const elUser = document.getElementById('user-display');
    if (elUser) {
        const inicial = (resp || nome || 'U').charAt(0).toUpperCase();
        const user = JSON.parse(localStorage.getItem('pav_user') || '{}');
        elUser.innerHTML = `
            <div class="sidebar-user-info">
                <div class="sidebar-user-avatar">${inicial}</div>
                <div style="overflow:hidden;">
                    <div class="sidebar-user-name">${resp || nome}</div>
                    <div class="sidebar-user-email">${user.email || ''}</div>
                </div>
            </div>`;
    }

    // Tentar sincronizar com backend (não bloqueia)
    const token = localStorage.getItem('pav_token');
    if (token && typeof PAV_CONFIG !== 'undefined') {
        fetch(PAV_CONFIG.API_URL + '/clinica', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(clinicaData)
        }).catch(() => {}); // silencia erros de backend offline
    }

    setTimeout(() => {
        Utils.setLoading(btn, false);
        Utils.showToast('Perfil da clínica salvo!', 'success');
    }, 400);
};

// ── 4. SALVAR DIVISÃO DO LUCRO ───────────────────────────────────────────────
window.salvarDivisao = function(btn) {
    const pL = parseInt(document.getElementById('cfg-proLabore')?.value) || 0;
    const pI = parseInt(document.getElementById('cfg-invest')?.value)    || 0;
    const pR = parseInt(document.getElementById('cfg-reserva')?.value)   || 0;
    if (pL + pI + pR !== 100) return;

    Utils.setLoading(btn, true);
    localStorage.setItem('pav_divisao_lucro', JSON.stringify({ proLabore: pL, investimentos: pI, reserva: pR }));

    setTimeout(() => {
        Utils.setLoading(btn, false);
        Utils.showToast('Divisão do lucro salva! O dashboard foi atualizado.', 'success');
        if (window.renderDashboard) window.renderDashboard();
    }, 300);
};

// ── 5. DADOS DE DEMONSTRAÇÃO ─────────────────────────────────────────────────
const DEMO_DATA = {
    clinica: {
        nome: 'Clínica Vet Exemplo', responsavel: 'Dr. Tiago Alemão',
        cnpj: '12.345.678/0001-99', crmv: 'CRMV-BA 9876', tel: '(71) 98888-7777',
        end: 'Av. Paralela, 1000 – Salvador, BA', regime: 'simples'
    },
    balanco: {
        faturamento: 42000, metaFaturamento: 45000, metaLucro: 8000,
        reembolsoInadimplencia: 500, impostos: 2100, taxasCartao: 840,
        insumos: 3500, boletosFornecedores: 1200, terceirizadosVar: 0,
        labTerceirizado: 2200, comissoes: 1800, plantoes: 800,
        escritorioLimpezaVar: 300, estorno: 100, outrosVariaveis: 200,
        folha: 9500, agua: 200, luz: 600, sistemas: 350, aluguel: 3500,
        telecom: 250, contabilidade: 600, marketing: 800, esocial: 180,
        taxasAdmin: 120, crmv: 90, lixoContaminante: 150, iptu: 300,
        limpezaFixa: 400, terceirizadosFixos: 0, outrosFixos: 500
    },
    historico: [
        { mes: 'Jan/25', faturamento: 38000, lucroGerencial: 5200, margemContribuicao: 28100, totalFixos: 22900, totalVariaveis: 9900 },
        { mes: 'Fev/25', faturamento: 35000, lucroGerencial: 3800, margemContribuicao: 25800, totalFixos: 22000, totalVariaveis: 9200 },
        { mes: 'Mar/25', faturamento: 41000, lucroGerencial: 6500, margemContribuicao: 29600, totalFixos: 23100, totalVariaveis: 11400 },
        { mes: 'Abr/25', faturamento: 42000, lucroGerencial: 7120, margemContribuicao: 30800, totalFixos: 23680, totalVariaveis: 11200 },
    ]
};

window.loadDemoData = function(btn) {
    Utils.confirm(
        'Isso irá substituir qualquer dado existente com dados fictícios da "Clínica Vet Exemplo". Use para explorar o sistema.',
        'Carregar dados de demonstração?',
        () => {
            if (btn) Utils.setLoading(btn, true);

            localStorage.setItem('pav_clinica',       JSON.stringify(DEMO_DATA.clinica));
            localStorage.setItem('pav_brand_nome',    DEMO_DATA.clinica.nome);
            localStorage.setItem('pav_brand_resp',    DEMO_DATA.clinica.responsavel);
            localStorage.setItem('pav_ultimos_dados', JSON.stringify(DEMO_DATA.balanco));
            localStorage.setItem('pav_historico',     JSON.stringify(DEMO_DATA.historico));
            localStorage.setItem('pav_demo_mode',     'true');

            setTimeout(() => {
                if (btn) Utils.setLoading(btn, false);
                Utils.showToast('Dados de demonstração carregados! Explore à vontade.', 'success');
                window.renderConfig();
                if (window.renderDashboard) window.renderDashboard();
            }, 400);
        }
    );
};

window.clearDemoData = function() {
    Utils.confirm(
        'Todos os dados salvos (balanço, caixa, serviços, configurações) serão apagados permanentemente.',
        'Limpar todos os dados?',
        () => {
            const keysToRemove = [
                'pav_ultimos_dados', 'pav_historico', 'pav_clinica',
                'pav_brand_nome', 'pav_brand_resp', 'pav_demo_mode',
                'pav_servicos', 'pav_caixa_movimentos', 'pav_divisao_lucro', 'pav_balanco_draft'
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));
            Utils.showToast('Dados limpos. O sistema está em branco.', 'success');
            window.renderConfig();
            if (window.renderDashboard) window.renderDashboard();
        }
    );
};

// ── 6. NOTIFICAÇÃO DE RESUMO AO ABRIR ───────────────────────────────────────
(function checkResumoBanner() {
    // Só exibe uma vez por sessão
    if (sessionStorage.getItem('pav_resumo_shown')) return;
    sessionStorage.setItem('pav_resumo_shown', 'true');

    const data      = JSON.parse(localStorage.getItem('pav_ultimos_dados') || 'null');
    const historico = JSON.parse(localStorage.getItem('pav_historico')     || '[]');
    const banner    = document.getElementById('resumo-banner');
    if (!banner) return;

    let title = '', body = '', ctaText = '', ctaAction = '';

    if (!data) {
        // Nunca lançou um balanço
        title     = 'Bem-vindo ao P.A.V.!';
        body      = 'Você ainda não consolidou nenhum balanço este mês. Comece agora para ter sua visão financeira completa.';
        ctaText   = 'Ir para Finanças';
        ctaAction = "document.getElementById('tab-balanco').click(); document.getElementById('resumo-banner').style.display='none';";
    } else if (historico.length >= 2) {
        // Compara último com penúltimo
        const atual  = historico[historico.length - 1];
        const prev   = historico[historico.length - 2];
        const delta  = prev.lucro !== 0
            ? ((atual.lucro - prev.lucro) / Math.abs(prev.lucro) * 100)
            : null;

        if (delta !== null && delta < -10) {
            title   = `Lucro caiu ${Math.abs(delta).toFixed(0)}% no último mês`;
            body    = `Em ${atual.label || atual.mesRef} o lucro foi R$ ${(atual.lucro || 0).toLocaleString('pt-BR')}. No mês anterior (${prev.label || prev.mesRef}) foi R$ ${(prev.lucro || 0).toLocaleString('pt-BR')}. Vale investigar os custos.`;
            ctaText = 'Ver Dashboard';
            ctaAction = "document.getElementById('tab-dashboard').click(); document.getElementById('resumo-banner').style.display='none';";
        } else if (delta !== null && delta > 15) {
            title   = `Lucro cresceu ${delta.toFixed(0)}% em ${atual.label || atual.mesRef}!`;
            body    = `Ótimo resultado! Lucro de R$ ${(atual.lucro || 0).toLocaleString('pt-BR')} — ${delta.toFixed(0)}% acima do mês anterior.`;
            ctaText = 'Ver Dashboard';
            ctaAction = "document.getElementById('tab-dashboard').click(); document.getElementById('resumo-banner').style.display='none';";
        } else {
            return; // Sem variação significativa — não exibe o banner
        }
    } else {
        return; // Poucos dados históricos — não exibe
    }

    const titleEl = document.getElementById('resumo-banner-title');
    const bodyEl  = document.getElementById('resumo-banner-body');
    const ctaEl   = document.getElementById('resumo-banner-cta');
    if (!titleEl || !bodyEl || !ctaEl) return;

    titleEl.textContent        = title;
    bodyEl.textContent         = body;
    ctaEl.textContent          = ctaText;
    ctaEl.setAttribute('onclick', ctaAction);

    // Exibe após pequeno delay
    setTimeout(() => { banner.style.display = 'block'; }, 1500);
})();
