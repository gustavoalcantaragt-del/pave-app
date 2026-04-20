// catalogo-premium.js — Pricing Calculator + Save

// ── CAMPOS DE INSUMO QUE O COMBO SUBSTITUI ─────────────────────────────────
// Apenas estes ficam desabilitados no modo combo.
// Comissões e Extras SEMPRE permanecem ativos.
const COMBO_REPLACED_FIELDS = ['calc-ins-prin', 'calc-ins-med', 'calc-ins-geral', 'calc-ali-det'];

// ── TOGGLE MODO COMISSÃO (R$ / %) ───────────────────────────────────────────
window.calcComModo = function(campo, modo) {
    // campo: 'vet' | 'ext'
    const modoEl  = document.getElementById(`com-${campo}-modo`);
    const btnRS   = document.getElementById(`com-${campo}-btn-rs`);
    const btnPct  = document.getElementById(`com-${campo}-btn-pct`);
    const input   = document.getElementById(`calc-com-${campo}`);
    const hint    = document.getElementById(`com-${campo}-hint`);
    if (!modoEl) return;

    modoEl.value = modo;
    if (modo === 'pct') {
        btnRS.style.background  = 'transparent';
        btnRS.style.color       = 'var(--text-muted)';
        btnPct.style.background = 'var(--brand-cta)';
        btnPct.style.color      = '#fff';
        if (input) { input.step = '0.1'; input.max = '100'; input.placeholder = '0%'; }
        if (hint) hint.style.display = 'inline';
    } else {
        btnRS.style.background  = 'var(--brand-cta)';
        btnRS.style.color       = '#fff';
        btnPct.style.background = 'transparent';
        btnPct.style.color      = 'var(--text-muted)';
        if (input) { input.step = '0.01'; input.removeAttribute('max'); input.placeholder = '0,00'; }
        if (hint) { hint.style.display = 'none'; hint.textContent = ''; }
    }
    window.updateCat();
};

// ── CALCULADOR COMPARTILHADO ────────────────────────────────────────────────
// Usado tanto por updateCat() quanto por salvarServico() para evitar
// duplicação e o bug de variáveis fora de escopo.
function _calcCosts() {
    const getVal  = id => parseFloat(document.getElementById(id)?.value) || 0;
    const preco   = getVal('calc-preco');
    const isCombo = !!document.getElementById('calc-is-combo')?.checked;

    // Custos percentuais (aplicados sobre o preço)
    const cfRS   = preco * (getVal('calc-cf-pct')  / 100);
    const taxaRS = preco * (getVal('calc-taxa-pct') / 100);
    const impRS  = preco * (getVal('calc-imp-pct')  / 100);

    // Insumos/materiais:
    //   - Modo combo  → soma dos itens do combo (custo × qtd)
    //   - Modo normal → campos individuais de insumo
    const insumos = isCombo
        ? (window.comboItems || []).reduce((sum, i) => sum + (parseFloat(i.custo) || 0) * (parseInt(i.qtd) || 1), 0)
        : getVal('calc-ins-prin') + getVal('calc-ins-med') + getVal('calc-ins-geral') + getVal('calc-ali-det');

    // Comissões — SEMPRE incluídas, com suporte a % do preço
    const vetModo  = document.getElementById('com-vet-modo')?.value || 'rs';
    const extModo  = document.getElementById('com-ext-modo')?.value || 'rs';
    const comVetRS = vetModo === 'pct' ? preco * (getVal('calc-com-vet') / 100) : getVal('calc-com-vet');
    const comExtRS = extModo === 'pct' ? preco * (getVal('calc-com-ext') / 100) : getVal('calc-com-ext');
    const comissoes = comVetRS + comExtRS;

    // Extras — SEMPRE incluídos, independente do modo combo
    const extras = getVal('calc-ext-des') + getVal('calc-ext-kit') + getVal('calc-ext-out');

    const custoTotal = cfRS + taxaRS + impRS + insumos + comissoes + extras;
    const lucroRS    = preco - custoTotal;
    const lucroPct   = preco > 0 ? (lucroRS / preco) * 100 : 0;

    return { preco, cfRS, taxaRS, impRS, insumos, comissoes, extras, custoTotal, lucroRS, lucroPct, isCombo };
}

// ── ATUALIZA DISPLAY DA CALCULADORA ────────────────────────────────────────
window.updateCat = function() {
    const c = _calcCosts();

    if (c.preco <= 0) {
        document.getElementById('calc-lucro-val').innerText    = '0%';
        document.getElementById('calc-lucro-status').innerText = 'AGUARDANDO VALORES';
        document.getElementById('calc-lucro-status').style.color = 'var(--text-secondary)';
        document.getElementById('calc-lucro-rs').innerText     = 'Lucro: R$ 0,00';
        return;
    }

    const fmt          = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const concorrencia = parseFloat(document.getElementById('calc-concorrencia')?.value) || 0;

    // Detalhamento combo
    let comboHintHtml = '';
    if (c.isCombo) {
        const nomes = (window.comboItems || []).map(i => i.nome).filter(Boolean).join(' + ');
        const breakdown = c.comissoes > 0 || c.extras > 0
            ? `<span style="font-size:0.78rem; color:var(--text-muted); margin-left:6px;">(insumos combo: ${fmt(c.insumos)} · comissões: ${fmt(c.comissoes)} · extras: ${fmt(c.extras)})</span>`
            : '';
        comboHintHtml = nomes
            ? `<div style="margin-top:0.5rem; color:var(--accent-gold); font-size:0.8rem; font-weight:700;">Itens: ${nomes}</div>${breakdown}`
            : `<div style="margin-top:0.5rem; color:var(--text-muted); font-size:0.8rem;">Adicione os itens do pacote na seção acima.</div>`;
    }

    // Benchmark de concorrência
    let benchmarkHtml = '';
    if (concorrencia > 0) {
        const dif = ((c.preco - concorrencia) / concorrencia) * 100;
        if (dif > 15)
            benchmarkHtml = `<div style="margin-top:1rem; padding:10px; border-radius:8px; background:rgba(255,149,0,0.1); border:1px solid rgba(255,149,0,0.3); color:#ff9500; font-size:0.85rem;"><b>Atenção:</b> Seu preço está ${dif.toFixed(1)}% <b>acima</b> da média de mercado (R$ ${concorrencia.toFixed(2)}). Garanta que o cliente perceba o valor premium.</div>`;
        else if (dif < -15)
            benchmarkHtml = `<div style="margin-top:1rem; padding:10px; border-radius:8px; background:rgba(255,214,10,0.1); border:1px solid rgba(255,214,10,0.3); color:#ffd60a; font-size:0.85rem;"><b>Oportunidade:</b> Seu preço está ${Math.abs(dif).toFixed(1)}% <b>abaixo</b> do mercado (R$ ${concorrencia.toFixed(2)}). Há espaço para aumentar a margem!</div>`;
        else
            benchmarkHtml = `<div style="margin-top:1rem; padding:10px; border-radius:8px; background:rgba(29,158,117,0.1); border:1px solid rgba(29,158,117,0.3); color:#1D9E75; font-size:0.85rem;">Seu preço está altamente competitivo e alinhado com o mercado (R$ ${concorrencia.toFixed(2)}).</div>`;
    }

    document.getElementById('calc-lucro-val').innerText = c.lucroPct.toFixed(1) + '%';
    document.getElementById('calc-lucro-rs').innerHTML  = `
        Lucro Limpo: ${fmt(c.lucroRS)} | Custos Totais: ${fmt(c.custoTotal)}
        ${comboHintHtml}${benchmarkHtml}
    `;

    const statusEl = document.getElementById('calc-lucro-status');
    if (c.lucroRS > 0)      { statusEl.innerText = 'POSITIVA';   statusEl.style.color = '#1D9E75'; }
    else if (c.lucroRS < 0) { statusEl.innerText = 'NEGATIVA';   statusEl.style.color = '#E24B4A'; }
    else                    { statusEl.innerText = 'BREAK-EVEN'; statusEl.style.color = '#ffd60a'; }

    // Atualiza hint de R$ calculado quando comissões estão em modo %
    _updateComHint('vet', c.preco);
    _updateComHint('ext', c.preco);
};

function _updateComHint(campo, preco) {
    const modo  = document.getElementById(`com-${campo}-modo`)?.value || 'rs';
    const hint  = document.getElementById(`com-${campo}-hint`);
    if (!hint) return;
    if (modo === 'pct' && preco > 0) {
        const pct = parseFloat(document.getElementById(`calc-com-${campo}`)?.value) || 0;
        const rs  = preco * (pct / 100);
        hint.textContent = `= R$ ${rs.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
        hint.style.display = 'inline';
    } else {
        hint.style.display = 'none';
        hint.textContent = '';
    }
}

// ── SALVAR SERVIÇO NO CATÁLOGO ──────────────────────────────────────────────
window.salvarServico = function() {
    const nome = document.getElementById('calc-nome')?.value?.trim();
    if (!nome) return Utils.showToast('Preencha o nome do serviço', 'error');

    const c = _calcCosts();
    if (c.preco <= 0) return Utils.showToast('Informe o preço do serviço', 'error');

    const labelNome = c.isCombo ? `${nome} (Pacote)` : nome;
    const goalQty   = parseInt(document.getElementById('goal-qty')?.value) || null;
    const goalRev   = parseFloat(document.getElementById('goal-revenue')?.value) || null;
    const servicos  = JSON.parse(localStorage.getItem('pav_servicos') || '[]');
    servicos.push({
        id:          (typeof _genUUID !== 'undefined' ? _genUUID() : crypto.randomUUID()),
        nome:        labelNome,
        preco:       c.preco,
        custoTotal:  c.custoTotal.toFixed(2),
        lucro:       c.lucroRS.toFixed(2),
        margem:      c.lucroPct.toFixed(1),
        isCombo:     c.isCombo,
        comboItens:  c.isCombo ? (window.comboItems || []).map(i => i.nome).filter(Boolean) : [],
        goalQty:     goalQty,
        goalRevenue: goalRev
    });
    const novoServico = servicos[servicos.length - 1];
    localStorage.setItem('pav_servicos', JSON.stringify(servicos));

    // Sincronizar com Supabase
    if (typeof ServicesAPI !== 'undefined') {
        ServicesAPI.save(novoServico).catch(e =>
            console.warn('[SYNC] salvarServico falhou para', novoServico.id, e?.message)
        );
    }

    Utils.showToast(`"${labelNome}" salvo no catálogo!`, 'success');
    renderServicosSalvos();
};

// ── EXCLUSÃO DE SERVIÇO ─────────────────────────────────────────────────────
window.deleteServico = function(id) {
    Utils.confirm('Este serviço será removido do catálogo.', 'Remover serviço?', () => {
        const servicos = JSON.parse(localStorage.getItem('pav_servicos') || '[]').filter(s => s.id !== id);
        localStorage.setItem('pav_servicos', JSON.stringify(servicos));
        window.renderCatalogo();
    });
};

// ── ESTADO DE BUSCA/ORDENAÇÃO DO CATÁLOGO ────────────────────────────────────
let _catBusca  = '';
let _catOrdem  = 'margem-desc'; // 'margem-desc' | 'margem-asc' | 'nome'

// ── CATÁLOGO SALVO ──────────────────────────────────────────────────────────
function renderServicosSalvos() {
    const container = document.getElementById('servicos-salvos');
    if (!container) return;
    const servicos = JSON.parse(localStorage.getItem('pav_servicos') || '[]');

    if (servicos.length === 0) {
        container.innerHTML = `
            <div class="pav-empty-state">
                <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
                <h3>Nenhum serviço no catálogo</h3>
                <p>Calcule o preço de um serviço e clique em "Salvar no Catálogo" para criar sua lista de preços.</p>
            </div>`;
        return;
    }

    // ── Filtro de busca + ordenação ────────────────────────────────────────────
    let lista = [...servicos];
    if (_catBusca) {
        const q = _catBusca.toLowerCase();
        lista = lista.filter(s => (s.nome || '').toLowerCase().includes(q));
    }
    lista.sort((a, b) => {
        if (_catOrdem === 'margem-desc') return parseFloat(b.margem) - parseFloat(a.margem);
        if (_catOrdem === 'margem-asc')  return parseFloat(a.margem) - parseFloat(b.margem);
        return (a.nome || '').localeCompare(b.nome || '');
    });

    const fmt = v => `R$ ${parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // ── Health badge helper ────────────────────────────────────────────────────
    function healthBadge(margem) {
        const m = parseFloat(margem) || 0;
        if (m >= 30) return { label: 'Ótima',   color: '#1D9E75', bg: 'rgba(29,158,117,0.1)',   border: 'rgba(29,158,117,0.3)' };
        if (m >= 15) return { label: 'Regular', color: '#ff9500', bg: 'rgba(255,149,0,0.1)',   border: 'rgba(255,149,0,0.3)' };
        return        { label: 'Crítica', color: '#E24B4A', bg: 'rgba(226,75,74,0.1)',    border: 'rgba(226,75,74,0.3)' };
    }

    const controls = `
        <div style="display:flex; gap:0.75rem; margin-bottom:1rem; flex-wrap:wrap; align-items:center;">
            <div style="flex:1; min-width:180px; position:relative;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-muted); pointer-events:none;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Buscar serviço..." value="${_catBusca}"
                    oninput="_catBusca=this.value; renderServicosSalvos()"
                    style="width:100%; padding:0.5rem 0.75rem 0.5rem 2rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
            </div>
            <select onchange="_catOrdem=this.value; renderServicosSalvos()"
                style="padding:0.5rem 0.875rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-secondary); font-size:0.82rem; font-family:var(--font-family); cursor:pointer;">
                <option value="margem-desc" ${_catOrdem==='margem-desc'?'selected':''}>Margem ↓ (maior)</option>
                <option value="margem-asc"  ${_catOrdem==='margem-asc' ?'selected':''}>Margem ↑ (menor)</option>
                <option value="nome"        ${_catOrdem==='nome'       ?'selected':''}>Nome A–Z</option>
            </select>
            <span style="font-size:0.78rem; color:var(--text-muted);">${lista.length} serviço${lista.length !== 1 ? 's' : ''}</span>
        </div>`;

    if (lista.length === 0) {
        container.innerHTML = controls + `
            <div class="pav-empty-state">
                <h3>Nenhum resultado</h3>
                <p>Tente outro termo de busca.</p>
            </div>`;
        return;
    }

    container.innerHTML = controls + lista.map(s => {
        const lucro  = parseFloat(s.lucro) || 0;
        const health = healthBadge(s.margem);
        const borderColor = lucro >= 0 ? health.color : '#E24B4A';
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.875rem 1rem; background:var(--bg-elevated); border-radius:10px; margin-bottom:0.5rem; border-left:3px solid ${borderColor}; transition:background 0.15s;"
             onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--bg-elevated)'">
            <div style="min-width:0; flex:1;">
                <div style="font-weight:700; font-size:0.9rem; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">${s.nome}</span>
                    ${s.isCombo ? `<span style="font-size:0.62rem; background:rgba(212,175,55,0.12); color:var(--accent-gold); padding:2px 7px; border-radius:20px; border:1px solid rgba(212,175,55,0.3); font-weight:700; flex-shrink:0;">PACOTE</span>` : ''}
                    <span style="font-size:0.62rem; padding:2px 8px; border-radius:20px; font-weight:700; background:${health.bg}; color:${health.color}; border:1px solid ${health.border}; flex-shrink:0;">${health.label}</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px;">
                    Preço: <strong style="color:var(--accent-blue);">${fmt(s.preco)}</strong>
                    &nbsp;·&nbsp; Margem: <strong style="color:${health.color};">${parseFloat(s.margem||0).toFixed(1)}%</strong>
                    &nbsp;·&nbsp; Custo: ${fmt(s.custoTotal)}
                </div>
                ${s.comboItens && s.comboItens.length > 0 ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:3px;">${s.comboItens.join(' + ')}</div>` : ''}
                ${_renderGoalProgress(s)}
            </div>
            <div style="text-align:right; flex-shrink:0; margin-left:1rem;">
                <div style="font-weight:800; color:${lucro >= 0 ? '#1D9E75' : '#E24B4A'}; font-size:0.95rem;">${fmt(lucro)}</div>
                <div style="font-size:0.65rem; color:var(--text-muted); margin-top:1px;">lucro</div>
                ${s.goalQty ? `<button onclick="window.registerServiceSale(${s.id})" style="background:rgba(29,158,117,0.1); border:1px solid rgba(29,158,117,0.3); color:#1D9E75; padding:2px 8px; border-radius:6px; cursor:pointer; font-size:0.68rem; font-weight:700; margin-top:4px; display:block; margin-left:auto;" title="Registrar 1 atendimento">+1</button>` : ''}
                <button onclick="window.deleteServico(${s.id})" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.7rem; margin-top:4px; display:block; margin-left:auto;" onmouseover="this.style.color='#E24B4A'" onmouseout="this.style.color='var(--text-muted)'">remover</button>
            </div>
        </div>`;
    }).join('');
}

// ── AUTO-PREENCHE CUSTO FIXO DO BALANÇO ────────────────────────────────────
function autoApplyCustoFixo() {
    const data = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    if (!data) return;
    const totais = window.calcularTotais ? window.calcularTotais(data) : {};
    const fat    = data.faturamento || 0;
    if (fat > 0 && totais.totalFixos > 0) {
        const pctReal = ((totais.totalFixos / fat) * 100).toFixed(2);
        const cfField = document.getElementById('calc-cf-pct');
        if (cfField) {
            cfField.value = pctReal;
            const badge = document.getElementById('cf-auto-badge');
            if (badge) { badge.style.display = 'inline'; badge.textContent = `• ${pctReal}% (do balanço)`; }
        }
        window.updateCat();
    }
}

// ── MODO COMBO ──────────────────────────────────────────────────────────────
window.comboItems = [];

window.toggleComboMode = function(isCombo) {
    // Exibe/oculta o builder de itens
    document.getElementById('calc-combo-builder').style.display = isCombo ? 'block' : 'none';

    // Apenas os campos de insumo/material ficam desabilitados no modo combo.
    // Comissões e extras continuam ativos normalmente.
    COMBO_REPLACED_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el?.parentElement) {
            el.disabled = isCombo;
            el.parentElement.style.opacity = isCombo ? '0.3' : '1';
            el.parentElement.title = isCombo ? 'Substituído pelos itens do combo acima' : '';
        }
    });

    // Badge visual no cabeçalho da seção "Custos Diretos"
    const dirHeader = document.getElementById('dir-costs-header');
    if (dirHeader) {
        const existing = dirHeader.querySelector('.combo-badge');
        if (isCombo && !existing) {
            const b = document.createElement('span');
            b.className   = 'combo-badge';
            b.textContent = 'insumos via combo';
            b.style.cssText = 'font-size:0.62rem; color:var(--accent-gold); font-weight:700; margin-left:8px; background:rgba(212,175,55,0.1); padding:2px 8px; border-radius:20px; border:1px solid rgba(212,175,55,0.25); vertical-align:middle;';
            dirHeader.appendChild(b);
        } else if (!isCombo && existing) {
            existing.remove();
        }
    }

    // Auto-adiciona primeiro item ao entrar no modo combo
    if (isCombo && window.comboItems.length === 0) {
        window.addComboItem();
    }

    window.updateCat();
};

// ── CRUD DOS ITENS DO COMBO ─────────────────────────────────────────────────
window.addComboItem = function() {
    window.comboItems.push({ id: Date.now(), nome: '', custo: 0, qtd: 1 });
    window.renderComboItems();
};

window.removeComboItem = function(id) {
    window.comboItems = window.comboItems.filter(i => i.id !== id);
    window.renderComboItems();
    window.updateCat();
};

window.updateComboItem = function(id, field, value) {
    const item = window.comboItems.find(i => i.id == id);
    if (!item) return;
    if      (field === 'custo') item.custo = parseFloat(value) || 0;
    else if (field === 'qtd')   item.qtd   = Math.max(1, parseInt(value) || 1);
    else                        item[field] = value;
    _updateComboTotals();
    window.updateCat();
};

// Atualiza o total do combo sem re-renderizar a lista (preserva foco nos inputs)
function _updateComboTotals() {
    const total  = (window.comboItems || []).reduce((sum, i) => sum + (parseFloat(i.custo) || 0) * (parseInt(i.qtd) || 1), 0);
    const costEl = document.getElementById('combo-total-cost');
    if (costEl) costEl.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

window.renderComboItems = function() {
    const list = document.getElementById('combo-items-list');
    if (!list) return;

    if (window.comboItems.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
                Nenhum item adicionado. Clique em "+ Adicionar Item" abaixo.
            </div>`;
        _updateComboTotals();
        window.updateCat();
        return;
    }

    list.innerHTML = window.comboItems.map(item => {
        const custoTotal = (parseFloat(item.custo) || 0) * (parseInt(item.qtd) || 1);
        return `
        <div class="cat-combo-row" style="display:grid; grid-template-columns:2fr 1fr 72px auto; gap:8px; align-items:center;">
            <input type="text"
                   placeholder="Nome do item (ex: Vacina V10)"
                   value="${item.nome}"
                   oninput="window.updateComboItem(${item.id}, 'nome', this.value)"
                   style="padding:9px 12px; border-radius:6px; border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:inherit; outline:none; transition:border-color 0.15s;"
                   onfocus="this.style.borderColor='var(--accent-blue)'"
                   onblur="this.style.borderColor='var(--border)'">
            <input type="number"
                   placeholder="Custo (R$)" step="0.01" min="0"
                   value="${item.custo || ''}"
                   oninput="window.updateComboItem(${item.id}, 'custo', this.value)"
                   style="padding:9px 12px; border-radius:6px; border:1px solid var(--border); background:var(--bg-input); color:var(--accent-gold); font-weight:700; font-size:0.875rem; font-family:inherit; outline:none; transition:border-color 0.15s;"
                   onfocus="this.style.borderColor='var(--accent-gold)'"
                   onblur="this.style.borderColor='var(--border)'">
            <input type="number"
                   placeholder="Qtd" min="1" step="1"
                   value="${item.qtd || 1}"
                   oninput="window.updateComboItem(${item.id}, 'qtd', this.value)"
                   style="padding:9px 8px; border-radius:6px; border:1px solid var(--border); background:var(--bg-input); color:var(--text-secondary); font-weight:600; font-size:0.875rem; font-family:inherit; text-align:center; outline:none;"
                   title="Quantidade">
            <button type="button"
                    onclick="window.removeComboItem(${item.id})"
                    style="background:rgba(226,75,74,0.1); border:1px solid rgba(226,75,74,0.25); color:#E24B4A; padding:9px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;"
                    title="Remover item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>`;
    }).join('');

    _updateComboTotals();
    window.updateCat();
};

// ── RENDER PRINCIPAL DA ABA ─────────────────────────────────────────────────
window.renderCatalogo = function() {
    autoApplyCustoFixo();
    window.updateCat();
    renderServicosSalvos();
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.renderCatalogo) window.renderCatalogo();
});

// ── NAVEGAÇÃO ENTRE ABAS INTERNAS ──────────────────────────────────────────
window.switchCatTab = function(tabName) {
    const btnNovo   = document.getElementById('btn-cat-novo');
    const btnSalvos = document.getElementById('btn-cat-salvos');
    const tabNovo   = document.getElementById('cat-tab-novo');
    const tabSalvos = document.getElementById('cat-tab-salvos');
    if (!btnNovo || !tabNovo) return;

    const activeSt   = { background: 'rgba(212,175,55,0.15)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)' };
    const inactiveSt = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' };

    if (tabName === 'salvos') {
        Object.assign(btnSalvos.style, activeSt);
        Object.assign(btnNovo.style,   inactiveSt);
        tabSalvos.style.display = 'block';
        tabNovo.style.display   = 'none';
        renderServicosSalvos();
    } else {
        Object.assign(btnNovo.style,   activeSt);
        Object.assign(btnSalvos.style, inactiveSt);
        tabNovo.style.display   = 'block';
        tabSalvos.style.display = 'none';
        window.updateCat();
    }
};

// ── FEATURE 2.5 — METAS POR SERVIÇO ─────────────────────────────────────────

function _monthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function _getServiceProgress(serviceId) {
    const key  = `pav_svc_prog_${_monthKey()}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return data[serviceId] || { qty: 0, revenue: 0 };
}

function _renderGoalProgress(s) {
    if (!s.goalQty && !s.goalRevenue) return '';
    const prog    = _getServiceProgress(s.id);
    const fmt     = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
    const lines   = [];

    if (s.goalQty) {
        const pct = Math.min(100, Math.round((prog.qty / s.goalQty) * 100));
        const color = pct >= 100 ? '#1D9E75' : pct >= 60 ? '#ff9500' : '#E24B4A';
        lines.push(`
        <div style="margin-top:6px;">
            <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:2px;">
                Meta: <b style="color:${color};">${prog.qty}/${s.goalQty}</b> atend.
            </div>
            <div style="height:4px; border-radius:4px; background:var(--border); overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:${color}; transition:width 0.4s;"></div>
            </div>
        </div>`);
    }

    if (s.goalRevenue) {
        const rev  = prog.qty * parseFloat(s.preco);
        const pct  = Math.min(100, Math.round((rev / s.goalRevenue) * 100));
        const color = pct >= 100 ? '#1D9E75' : pct >= 60 ? '#ff9500' : '#E24B4A';
        lines.push(`
        <div style="margin-top:4px;">
            <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:2px;">
                Receita: <b style="color:${color};">${fmt(rev)}/${fmt(s.goalRevenue)}</b>
            </div>
            <div style="height:4px; border-radius:4px; background:var(--border); overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:${color}; transition:width 0.4s;"></div>
            </div>
        </div>`);
    }

    return lines.join('');
}

window.registerServiceSale = function(serviceId) {
    const key     = `pav_svc_prog_${_monthKey()}`;
    const data    = JSON.parse(localStorage.getItem(key) || '{}');
    const prog    = data[serviceId] || { qty: 0, revenue: 0 };
    const servico = JSON.parse(localStorage.getItem('pav_servicos') || '[]').find(s => s.id === serviceId);
    prog.qty++;
    prog.revenue += parseFloat(servico?.preco || 0);
    data[serviceId] = prog;
    localStorage.setItem(key, JSON.stringify(data));
    renderServicosSalvos();
    if (window.Utils) Utils.showToast('Atendimento registrado!', 'success');
};
