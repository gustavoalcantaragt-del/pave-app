// configuracoes-premium.js — Página de Configurações + Notificação de Resumo

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

    // Card de assinatura
    _renderSubscriptionCard();

    // Card de categorias
    _renderCategoriasCard();
};

// ── CATEGORIAS PERSONALIZADAS ────────────────────────────────────────────────
async function _renderCategoriasCard() {
    const listEl = document.getElementById('cfg-cat-list');
    const btnNew = document.getElementById('cfg-cat-btn-new');
    const formWrap = document.getElementById('cfg-cat-form-wrap');
    if (!listEl || !btnNew || !formWrap) return;

    if (typeof CategoriesAPI === 'undefined') {
        listEl.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">CategoriesAPI indisponível.</p>`;
        return;
    }

    // Listener uma única vez
    if (!btnNew.dataset.wired) {
        btnNew.dataset.wired = '1';
        btnNew.addEventListener('click', () => _showCategoriaForm(null));
    }

    await _refreshCategoriasList();
}

async function _refreshCategoriasList() {
    const listEl = document.getElementById('cfg-cat-list');
    if (!listEl) return;
    listEl.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">Carregando…</p>`;

    try {
        const tree = await CategoriesAPI.listTree();
        if (!tree.length) {
            listEl.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; padding:0.75rem 0;">Nenhuma categoria criada. Use "+ Nova categoria" para começar.</p>`;
            return;
        }

        const renderItem = (cat, depth) => {
            const indent = depth * 1.5;
            const typeLabel = { income: 'Receita', expense: 'Despesa', both: 'Ambos' }[cat.type] || 'Ambos';
            const typeColor = { income: '#1D9E75', expense: '#E24B4A', both: 'var(--text-muted)' }[cat.type] || 'var(--text-muted)';
            return `
            <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0.85rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:6px; margin-left:${indent}rem;" data-cat-id="${cat.id}">
                <span style="font-weight:600; color:var(--text-primary); flex:1;">${cat.name}</span>
                <span style="font-size:0.7rem; padding:0.15rem 0.5rem; border-radius:10px; background:${typeColor}22; color:${typeColor}; font-weight:700;">${typeLabel}</span>
                <button class="cfg-cat-btn-add-sub" data-parent="${cat.id}" title="Adicionar subcategoria" style="background:none; border:none; cursor:pointer; color:var(--accent-blue); font-size:0.85rem; font-family:var(--font-family);">+ sub</button>
                <button class="cfg-cat-btn-edit"  data-id="${cat.id}" title="Editar" style="background:none; border:none; cursor:pointer; color:var(--text-secondary); font-size:0.9rem;">✎</button>
                <button class="cfg-cat-btn-del"   data-id="${cat.id}" title="Excluir" style="background:none; border:none; cursor:pointer; color:var(--color-danger); font-size:0.9rem;">✕</button>
            </div>
            ${(cat.children || []).map(ch => renderItem(ch, depth + 1)).join('')}`;
        };

        listEl.innerHTML = tree.map(c => renderItem(c, 0)).join('');

        // Wire actions (event delegation única)
        if (!listEl.dataset.wired) {
            listEl.dataset.wired = '1';
            listEl.addEventListener('click', async e => {
                const t = e.target;
                if (t.matches('.cfg-cat-btn-add-sub')) {
                    _showCategoriaForm(null, t.dataset.parent);
                } else if (t.matches('.cfg-cat-btn-edit')) {
                    const flat = await CategoriesAPI.list();
                    const cat = flat.find(c => c.id === t.dataset.id);
                    if (cat) _showCategoriaForm(cat);
                } else if (t.matches('.cfg-cat-btn-del')) {
                    const id = t.dataset.id;
                    if (!confirm('Excluir esta categoria?')) return;
                    try {
                        await CategoriesAPI.remove(id);
                        Utils.showToast('Categoria excluída.', 'success');
                        _refreshCategoriasList();
                    } catch (err) {
                        Utils.showToast(err.message || 'Erro ao excluir', 'error');
                    }
                }
            });
        }
    } catch (e) {
        listEl.innerHTML = `<p style="color:var(--color-danger); font-size:0.85rem;">Erro ao carregar: ${e.message}</p>`;
    }
}

function _showCategoriaForm(cat, parentId = null) {
    const wrap = document.getElementById('cfg-cat-form-wrap');
    if (!wrap) return;
    const isEdit = !!cat;
    wrap.style.display = 'block';
    wrap.innerHTML = `
        <h4 style="margin:0 0 0.75rem; font-size:0.95rem;">${isEdit ? 'Editar categoria' : (parentId ? 'Nova subcategoria' : 'Nova categoria')}</h4>
        <form id="cfg-cat-form" style="display:flex; flex-direction:column; gap:0.75rem;">
            <input type="hidden" name="id"        value="${cat?.id || ''}" />
            <input type="hidden" name="parent_id" value="${parentId || cat?.parent_id || ''}" />
            <div>
                <label style="font-size:0.78rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">Nome *</label>
                <input type="text" name="name" value="${cat?.name || ''}" required
                    style="width:100%; padding:0.55rem 0.75rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-family:var(--font-family); font-size:0.88rem;" />
            </div>
            <div>
                <label style="font-size:0.78rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">Aplicar em</label>
                <select name="type" style="width:100%; padding:0.55rem 0.75rem; border-radius:6px; border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-family:var(--font-family); font-size:0.88rem;">
                    <option value="both"    ${(cat?.type || 'both') === 'both'    ? 'selected' : ''}>Receitas e Despesas</option>
                    <option value="income"  ${cat?.type === 'income'  ? 'selected' : ''}>Apenas Receitas</option>
                    <option value="expense" ${cat?.type === 'expense' ? 'selected' : ''}>Apenas Despesas</option>
                </select>
            </div>
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button type="button" id="cfg-cat-form-cancel" class="btn-secondary" style="padding:0.45rem 1rem; font-size:0.85rem;">Cancelar</button>
                <button type="submit" class="btn-primary" style="padding:0.45rem 1rem; font-size:0.85rem;">${isEdit ? 'Salvar' : 'Criar'}</button>
            </div>
        </form>
    `;

    document.getElementById('cfg-cat-form-cancel').addEventListener('click', () => {
        wrap.style.display = 'none';
        wrap.innerHTML = '';
    });

    document.getElementById('cfg-cat-form').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const id        = fd.get('id') || null;
        const parent_id = fd.get('parent_id') || null;
        const payload = {
            name: fd.get('name'),
            type: fd.get('type'),
            parent_id: parent_id || null
        };
        const submitBtn = e.target.querySelector('[type="submit"]');
        Utils.setLoading(submitBtn, true);
        try {
            if (id) await CategoriesAPI.update(id, { name: payload.name, type: payload.type });
            else    await CategoriesAPI.create(payload);
            wrap.style.display = 'none';
            wrap.innerHTML = '';
            Utils.showToast(id ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
            _refreshCategoriasList();
        } catch (err) {
            Utils.setLoading(submitBtn, false);
            Utils.showToast(err.message || 'Erro ao salvar', 'error');
        }
    });
}

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
        active:   { label: 'Ativo',        color: '#1D9E75' },
        past_due: { label: 'Em Atraso',    color: '#E24B4A' },
        canceled: { label: 'Cancelado',    color: '#E24B4A' },
        expired:  { label: 'Expirado',     color: '#E24B4A' },
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
        elDays.style.color = sub.daysLeft > 3 ? '#1D9E75' : '#E24B4A';
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
let _divisaoRafPending = false;
window.updateDivisaoPreview = function() {
    if (_divisaoRafPending) return;
    _divisaoRafPending = true;
    requestAnimationFrame(() => { _divisaoRafPending = false; _doDivisaoPreview(); });
};
function _doDivisaoPreview() {
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
        statusEl.style.background = 'rgba(29,158,117,0.1)';
        statusEl.style.border     = '1px solid rgba(29,158,117,0.3)';
        statusEl.style.color      = '#1D9E75';
        statusEl.textContent      = 'Total: 100% — Distribuição válida';
        if (saveBtn) saveBtn.disabled = false;
    } else {
        statusEl.style.background = 'rgba(226,75,74,0.1)';
        statusEl.style.border     = '1px solid rgba(226,75,74,0.3)';
        statusEl.style.color      = '#E24B4A';
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
        let userEmail = '';
        try { userEmail = JSON.parse(localStorage.getItem('pav_user') || '{}').email || ''; } catch { userEmail = ''; }
        // Monta com textContent para evitar XSS
        elUser.innerHTML = '<div class="sidebar-user-info"><div class="sidebar-user-avatar"></div><div style="overflow:hidden;"><div class="sidebar-user-name"></div><div class="sidebar-user-email"></div></div></div>';
        elUser.querySelector('.sidebar-user-avatar').textContent = inicial;
        elUser.querySelector('.sidebar-user-name').textContent   = resp || nome;
        elUser.querySelector('.sidebar-user-email').textContent  = userEmail;
    }

    // Sincronizar com Supabase (OrgAPI) — não bloqueia
    if (typeof OrgAPI !== 'undefined') {
        OrgAPI.update({
            nome,
            cnpj,
            crmv,
            responsavel: resp,
            telefone:    tel,
            endereco:    end,
            regime
        }).catch(e => console.warn('[CONFIG] OrgAPI.update falhou:', e?.message));
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

// ── 5. LIMPAR DADOS ──────────────────────────────────────────────────────────
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
