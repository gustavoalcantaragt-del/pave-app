// caixa-premium.js
// Módulo de Fluxo de Caixa Diário (Contas a Pagar/Receber)

// ── ESTADO DE FILTROS ─────────────────────────────────────────────────────────
let _cxPeriodoModo = 'dia'; // 'dia' | 'semana' | 'mes'
let _cxSelectedIds = new Set();

// ── RADIO BUTTONS DE TIPO (Despesa / Receita) ────────────────────────────────
window.cxTipoChange = function() {
    const isDespesa = document.getElementById('cxTipoDespesa')?.checked;
    const hiddenTipo = document.getElementById('cxTipo');
    if (hiddenTipo) hiddenTipo.value = isDespesa ? 'despesa' : 'receita';

    const lblDesp = document.getElementById('cx-tipo-despesa-label');
    const dotDesp = document.getElementById('cx-dot-despesa');
    if (lblDesp) {
        lblDesp.style.border     = isDespesa ? '2px solid rgba(226,75,74,0.5)' : '2px solid var(--border)';
        lblDesp.style.background = isDespesa ? 'rgba(226,75,74,0.08)' : 'transparent';
        const txtDesp = lblDesp.querySelector('span[style*="font-weight:700"]');
        if (txtDesp) txtDesp.style.color = isDespesa ? 'var(--color-danger)' : 'var(--text-secondary)';
    }
    if (dotDesp) dotDesp.style.display = isDespesa ? 'block' : 'none';

    const lblRec = document.getElementById('cx-tipo-receita-label');
    const dotRec = document.getElementById('cx-dot-receita');
    if (lblRec) {
        lblRec.style.border      = !isDespesa ? '2px solid rgba(29,158,117,0.5)' : '2px solid var(--border)';
        lblRec.style.background  = !isDespesa ? 'rgba(29,158,117,0.08)' : 'transparent';
        const txtRec = lblRec.querySelector('span[style*="font-weight:700"]');
        if (txtRec) txtRec.style.color = !isDespesa ? 'var(--color-success)' : 'var(--text-secondary)';
    }
    if (dotRec) dotRec.style.display = !isDespesa ? 'block' : 'none';
};

// Label de forma de pagamento
const FORMA_PAG_LABEL = {
    pix:             'PIX',
    cartao_debito:   'Débito',
    cartao_credito:  'Crédito',
    dinheiro:        'Dinheiro',
    transferencia:   'Transferência',
    boleto:          'Boleto',
    outros:          'Outros'
};

// ── MESES PT-BR ───────────────────────────────────────────────────────────────
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_PT  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

// ── PERÍODO MODE SWITCHER ─────────────────────────────────────────────────────
window.setCxPeriodo = function(modo) {
    _cxPeriodoModo = modo;
    _cxSelectedIds.clear();

    // Update button styles
    const btns = { dia: 'cxBtnDia', semana: 'cxBtnSemana', mes: 'cxBtnMes' };
    Object.entries(btns).forEach(([k, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (k === modo) {
            btn.style.background = 'var(--accent-blue)';
            btn.style.color = '#fff';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-secondary)';
        }
    });

    window.renderCaixa();
};

// ── BULK SELECT HELPERS ───────────────────────────────────────────────────────
window.toggleCaixaSelect = function(id, checkbox) {
    if (checkbox.checked) {
        _cxSelectedIds.add(id);
    } else {
        _cxSelectedIds.delete(id);
    }
    _updateBulkBar();
};

function _updateBulkBar() {
    const bar   = document.getElementById('cxBulkBar');
    const count = document.getElementById('cxBulkCount');
    if (!bar) return;
    if (_cxSelectedIds.size > 0) {
        bar.style.display = 'flex';
        count.textContent = `${_cxSelectedIds.size} selecionado${_cxSelectedIds.size > 1 ? 's' : ''}`;
    } else {
        bar.style.display = 'none';
    }
}

window.marcarSelecionadosPago = function() {
    if (_cxSelectedIds.size === 0) return;
    let movimentos = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    const marcados = [];
    movimentos.forEach(m => {
        if (_cxSelectedIds.has(m.id)) { m.status = 'pago'; marcados.push(m); }
    });
    localStorage.setItem('pav_caixa_movimentos', JSON.stringify(movimentos));
    // Sincronizar cada movimento marcado com Supabase
    if (typeof CashAPI !== 'undefined') {
        marcados.forEach(m => CashAPI.upsertMovimento(m).catch(e =>
            console.warn('[SYNC] marcarSelecionadosPago falhou para', m.id, e?.message)
        ));
    }
    _cxSelectedIds.clear();
    window.renderCaixa();
    // Notifica Dashboard para recalcular
    if (window.renderDashboard) window.renderDashboard();
    Utils.showToast('Lançamentos marcados como pagos!', 'success');
};

window.limparSelecaoCaixa = function() {
    _cxSelectedIds.clear();
    _updateBulkBar();
    // Uncheck all checkboxes
    document.querySelectorAll('.cx-select-cb').forEach(cb => cb.checked = false);
};

// ── DATE RANGE HELPERS ────────────────────────────────────────────────────────
function _getDateRange(valDia, modo) {
    const [y, m, d] = valDia.split('-').map(Number);
    if (modo === 'dia') {
        return { from: valDia, to: valDia };
    }
    if (modo === 'semana') {
        const base = new Date(y, m - 1, d);
        const dow  = base.getDay(); // 0=Sun
        const mon  = new Date(base); mon.setDate(d - dow + (dow === 0 ? -6 : 1));
        const sun  = new Date(mon);  sun.setDate(mon.getDate() + 6);
        return { from: _toISO(mon), to: _toISO(sun) };
    }
    // mes
    const lastDay = new Date(y, m, 0).getDate();
    return {
        from: `${y}-${String(m).padStart(2,'0')}-01`,
        to:   `${y}-${String(m).padStart(2,'0')}-${lastDay}`
    };
}

function _toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _buildPeriodoChip(valDia, modo) {
    const [y, m, d] = valDia.split('-').map(Number);
    if (modo === 'dia') {
        const dt  = new Date(y, m - 1, d);
        const dia = DIAS_PT[dt.getDay()];
        return `${dia}, ${d} de ${MESES_PT[m-1]} ${y}`;
    }
    if (modo === 'semana') {
        const range = _getDateRange(valDia, 'semana');
        const [fy,fm,fd] = range.from.split('-').map(Number);
        const [ty,tm,td] = range.to.split('-').map(Number);
        return `${fd}/${String(fm).padStart(2,'0')} – ${td}/${String(tm).padStart(2,'0')}/${ty}`;
    }
    return `${MESES_PT[m-1]} ${y}`;
}

// ── MAIN RENDER ───────────────────────────────────────────────────────────────
window.renderCaixa = function() {
    const valDia = document.getElementById('cxFiltroDia')?.value;
    if (!valDia) return;

    const catFiltro = document.getElementById('cxFiltroCategoria')?.value || '';
    const modo      = _cxPeriodoModo;
    const range     = _getDateRange(valDia, modo);
    let   movimentos = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');

    // ── Monthly totals (always the full month of selected date) ──────────────
    const [y, m] = valDia.split('-');
    const mesPrefix = `${y}-${m}`;
    const doMes = movimentos.filter(mv => mv.vencimento.startsWith(mesPrefix));
    let mesRec = 0, mesDes = 0;
    doMes.forEach(mv => {
        if (mv.tipo === 'receita') mesRec += mv.valor;
        else                       mesDes += mv.valor;
    });
    const fmt = v => `R$ ${v.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    const recEl = document.getElementById('cxResumoReceitas');
    const desEl = document.getElementById('cxResumoDespesas');
    const salEl = document.getElementById('cxResumoSaldo');
    if (recEl) recEl.innerText = fmt(mesRec);
    if (desEl) desEl.innerText = fmt(mesDes);
    if (salEl) {
        const saldo = mesRec - mesDes;
        salEl.innerText = fmt(saldo);
        salEl.style.color = saldo >= 0 ? '#1D9E75' : '#E24B4A';
    }

    // ── Period chip ───────────────────────────────────────────────────────────
    const chip = document.getElementById('cxPeriodoChip');
    if (chip) chip.textContent = _buildPeriodoChip(valDia, modo);

    // ── Filter by period ──────────────────────────────────────────────────────
    let filtrados = movimentos.filter(mv => mv.vencimento >= range.from && mv.vencimento <= range.to);

    // ── Filter by category ────────────────────────────────────────────────────
    if (catFiltro) filtrados = filtrados.filter(mv => mv.categoria === catFiltro);

    // ── Filter by client ──────────────────────────────────────────────────────
    const cliFiltro = document.getElementById('cxFiltroCliente')?.value || '';
    if (cliFiltro) filtrados = filtrados.filter(mv => mv.clienteId === cliFiltro);

    filtrados.sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    // ── Subtitle ──────────────────────────────────────────────────────────────
    const subtitulo = document.getElementById('cxListaSubtitulo');
    if (subtitulo) {
        const chip = _buildPeriodoChip(valDia, modo);
        subtitulo.textContent = `${filtrados.length} lançamento${filtrados.length !== 1 ? 's' : ''} · ${chip}`;
    }

    const listaEl = document.getElementById('cxListaMovimentos');
    if (!listaEl) return;
    listaEl.innerHTML = '';

    if (filtrados.length === 0) {
        listaEl.innerHTML = `
            <div class="pav-empty-state">
                <div class="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
                <h3>Nenhum lançamento neste período</h3>
                <p>Use o formulário acima para registrar entradas e saídas financeiras deste período.</p>
            </div>`;
        return;
    }

    filtrados.forEach((mv) => {
        const isPago    = mv.status === 'pago';
        const isReceita = mv.tipo === 'receita';
        const corValor  = isReceita ? '#1D9E75' : '#E24B4A';
        const srm       = mv.vencimento.split('-').reverse().join('/');
        const isSelected = _cxSelectedIds.has(mv.id);

        const iconSvg = isReceita
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`;

        const formaPagLabel = FORMA_PAG_LABEL[mv.formaPag] || '';
        const subMeta = [mv.categoria, srm, formaPagLabel].filter(Boolean).join(' · ');

        const div = document.createElement('div');
        div.dataset.id = mv.id;
        div.style.cssText = `
            display:flex; align-items:center; gap:0.75rem;
            padding:0.875rem 1.25rem;
            border-bottom:1px solid var(--border);
            transition:background 0.15s;
            opacity:${isPago ? '0.5' : '1'};
            background:${isSelected ? 'rgba(10,132,255,0.07)' : 'transparent'};
        `;
        div.onmouseover = () => { if (!isSelected) div.style.background = _isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'; };
        div.onmouseout  = () => { div.style.background = isSelected ? 'rgba(10,132,255,0.07)' : 'transparent'; };

        div.innerHTML = `
            <!-- Checkbox -->
            <input type="checkbox" class="cx-select-cb"
                ${isSelected ? 'checked' : ''}
                onchange="window.toggleCaixaSelect('${mv.id}', this)"
                style="width:15px; height:15px; accent-color:var(--accent-blue); cursor:pointer; flex-shrink:0; border-radius:4px;">

            <!-- Icon -->
            <div style="width:34px; height:34px; border-radius:50%; background:${isReceita ? 'rgba(29,158,117,0.1)' : 'rgba(226,75,74,0.1)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${iconSvg}
            </div>

            <!-- Info -->
            <div style="min-width:0; flex:1;">
                <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${mv.descricao}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px; text-transform:uppercase; letter-spacing:0.3px;">${subMeta}</div>
                ${mv.observacao ? `<div style="font-size:0.72rem; color:var(--text-secondary); margin-top:3px; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">${mv.observacao}</div>` : ''}
            </div>

            <!-- Value + actions -->
            <div style="display:flex; align-items:center; gap:0.625rem; flex-shrink:0;">
                <span style="font-size:1rem; font-weight:800; color:${corValor}; white-space:nowrap;">
                    ${isReceita ? '+' : '−'} R$ ${mv.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                </span>
                <button onclick="window.toggleStatusCaixa('${mv.id}')" style="padding:0.3rem 0.7rem; border-radius:20px; font-size:0.7rem; font-weight:700; cursor:pointer; white-space:nowrap; background:${isPago ? 'rgba(29,158,117,0.1)' : 'rgba(255,149,0,0.1)'}; color:${isPago ? '#1D9E75' : '#ff9500'}; border:1px solid ${isPago ? 'rgba(29,158,117,0.3)' : 'rgba(255,149,0,0.3)'}; transition:all 0.15s;">
                    ${isPago ? 'Pago' : 'Pendente'}
                </button>
                <button onclick="window.deleteCaixa('${mv.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:4px; border-radius:4px; display:flex; align-items:center;" title="Excluir" onmouseover="this.style.color='#E24B4A'" onmouseout="this.style.color='var(--text-muted)'">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
        `;
        listaEl.appendChild(div);
    });
};

// ── FORM SUBMIT ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('caixaForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('[type="submit"]');

            const desc       = document.getElementById('cxDescricao').value.trim();
            const valor      = parseFloat(document.getElementById('cxValor').value) || 0;
            const venc       = document.getElementById('cxVencimento').value;
            const tipo       = document.getElementById('cxTipo').value;
            const cat        = document.getElementById('cxCategoria').value;
            const formaPag   = document.getElementById('cxFormaPagamento')?.value || 'outros';
            const observacao = document.getElementById('cxObservacao')?.value.trim() || '';
            const clienteId  = document.getElementById('cxClienteId')?.value  || null;
            const serviceId  = document.getElementById('cxServiceId')?.value   || null;
            const isRec      = document.getElementById('cxRecorrente')?.checked;
            const vezes      = isRec ? parseInt(document.getElementById('cxVezes').value) || 2 : 1;

            const _markInvalid = (id, msg) => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.borderColor = 'var(--color-danger)';
                    el.style.animation   = 'pav-shake 0.3s ease';
                    el.addEventListener('input', () => { el.style.borderColor = ''; el.style.animation = ''; }, { once: true });
                }
                Utils.showToast(msg, 'error');
            };
            if (!desc)    { _markInvalid('cxDescricao', 'Informe a descrição do lançamento'); return; }
            if (valor <= 0) { _markInvalid('cxValor', 'Informe um valor válido'); return; }
            if (!venc)    { _markInvalid('cxVencimento', 'Informe a data de vencimento'); return; }

            const origHTML = btn.innerHTML;
            btn.disabled = true;
            btn.style.opacity = '0.7';

            const movimentos = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
            const [vYear, vMonth, vDay] = venc.split('-');

            for (let i = 0; i < vezes; i++) {
                let y = parseInt(vYear);
                let m = parseInt(vMonth) + i;
                while (m > 12) { m -= 12; y++; }
                const dataFormatada = `${y}-${String(m).padStart(2,'0')}-${String(vDay).padStart(2,'0')}`;
                movimentos.push({
                    id:        (typeof _genUUID !== 'undefined' ? _genUUID() : crypto.randomUUID()),
                    descricao: vezes > 1 ? `${desc} (${i+1}/${vezes})` : desc,
                    valor, vencimento: dataFormatada, tipo, categoria: cat,
                    formaPag, observacao, status: 'pendente',
                    clienteId: clienteId || null,
                    serviceId: serviceId || null
                });
            }

            localStorage.setItem('pav_caixa_movimentos', JSON.stringify(movimentos));

            // Sincronizar cada novo movimento com Supabase (fire-and-forget)
            if (typeof CashAPI !== 'undefined') {
                const novos = movimentos.slice(-vezes);
                novos.forEach(m => CashAPI.upsertMovimento(m).catch(e =>
                    console.warn('[SYNC] caixaForm upsert falhou para', m.id, e?.message)
                ));
            }

            Utils.showToast(
                vezes > 1 ? `${vezes} lançamentos recorrentes registrados!` : 'Lançamento registrado com sucesso!',
                'success'
            );

            form.reset();
            const hiddenTipo = document.getElementById('cxTipo');
            if (hiddenTipo) hiddenTipo.value = 'despesa';
            window.cxTipoChange();
            document.getElementById('cxVezesDiv').style.display = 'none';
            btn.disabled = false;
            btn.style.opacity = '';
            btn.innerHTML = origHTML;
            window.renderCaixa();
        });
    }

    const filtroDia = document.getElementById('cxFiltroDia');
    if (filtroDia) {
        const hj = new Date();
        filtroDia.value = `${hj.getFullYear()}-${String(hj.getMonth()+1).padStart(2,'0')}-${String(hj.getDate()).padStart(2,'0')}`;
        filtroDia.addEventListener('change', window.renderCaixa);
    }

    const filtroCat = document.getElementById('cxFiltroCategoria');
    if (filtroCat) filtroCat.addEventListener('change', window.renderCaixa);

    const filtroCli = document.getElementById('cxFiltroCliente');
    if (filtroCli) {
        if (window.ClientesModule) ClientesModule.renderClientSelector(filtroCli);
        filtroCli.addEventListener('change', window.renderCaixa);
    }

    // Popular seletor de clientes (lazy — só se ClientesModule disponível)
    const clienteSelect = document.getElementById('cxClienteId');
    if (clienteSelect && window.ClientesModule) {
        ClientesModule.renderClientSelector(clienteSelect);
    }

    window.cxTipoChange();
});

// ── CUSTO RATEIO DIÁRIO ────────────────────────────────────────────────────────
window.calcRateioDiario = function() {
    const diasEl = document.getElementById('cxRateioDias');
    const resEl  = document.getElementById('cxRateioResultado');
    if (!diasEl || !resEl) return;

    const data = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
    let fixo = 0;
    if (data && window.calcularTotais) {
        const totais = window.calcularTotais(data);
        fixo = totais.totalFixos || 0;
    }

    if (fixo === 0) {
        resEl.style.fontSize = '1.1rem';
        resEl.innerText = 'Preencha o Balanço!';
        return;
    }

    const dias = parseInt(diasEl.value) || 22;
    if (dias > 0) {
        resEl.style.fontSize = '1.8rem';
        resEl.innerText = `R$ ${(fixo / dias).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    } else {
        resEl.innerText = 'R$ 0,00';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.calcRateioDiario(), 500);
});

// ── STATUS TOGGLE + DELETE ────────────────────────────────────────────────────
window.toggleStatusCaixa = function(id) {
    let movimentos = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    const idx = movimentos.findIndex(m => m.id === id);
    if (idx !== -1) {
        const novoStatus = movimentos[idx].status === 'pago' ? 'pendente' : 'pago';
        movimentos[idx].status = novoStatus;
        localStorage.setItem('pav_caixa_movimentos', JSON.stringify(movimentos));
        // Sincronizar status com Supabase
        if (typeof CashAPI !== 'undefined') {
            CashAPI.upsertMovimento(movimentos[idx]).catch(e =>
                console.warn('[SYNC] toggleStatusCaixa falhou para', id, e?.message)
            );
        }
        window.renderCaixa();
        if (novoStatus === 'pago' && window.renderDashboard) {
            window.renderDashboard();
        }
    }
};

window.deleteCaixa = function(id) {
    Utils.confirm('Este lançamento será removido permanentemente.', 'Excluir lançamento?', () => {
        let movimentos = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
        movimentos = movimentos.filter(m => m.id !== id);
        localStorage.setItem('pav_caixa_movimentos', JSON.stringify(movimentos));
        _cxSelectedIds.delete(id);
        window.renderCaixa();
    });
};

// ── SYNC: Caixa → Balanço ─────────────────────────────────────────────────────
window.syncWithCaixa = function() {
    const inputMes = document.getElementById('mesReferencia').value;
    if (!inputMes) {
        Utils.showToast('Preencha a Data (Dia/Mês) no Balanço primeiro para sincronizar!', 'error');
        return;
    }
    const mesBalanco = inputMes.substring(0, 7);
    const movimentos = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
    const filtradosPagos = movimentos.filter(m => m.status === 'pago' && m.vencimento.startsWith(mesBalanco));

    if (filtradosPagos.length === 0) {
        Utils.showToast(`Nenhum lançamento "Pago" encontrado em ${mesBalanco}.`, 'warning');
        return;
    }

    let somaPorCat = {};
    filtradosPagos.forEach(m => {
        // Normaliza categoria: lowercase, sem acentos, sem espaços → combina com IDs dos inputs
        const catKey = (m.categoria || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_');
        if (!somaPorCat[catKey]) somaPorCat[catKey] = 0;
        somaPorCat[catKey] += m.valor;
        // Também tenta a categoria original (fallback)
        if (!somaPorCat[m.categoria]) somaPorCat[m.categoria] = 0;
        somaPorCat[m.categoria] += m.valor;
    });

    let cont = 0;
    const seen = new Set();
    for (const [cat, val] of Object.entries(somaPorCat)) {
        const el = document.getElementById(cat);
        if (el && !seen.has(el.id)) {
            el.value = val.toFixed(2);
            seen.add(el.id);
            cont++;
        }
    }
    if (cont === 0) {
        Utils.showToast('Nenhuma categoria do Caixa correspondeu aos campos do Balanço. Verifique os nomes.', 'warning');
    } else {
        Utils.showToast(`Sincronizado! ${cont} campo(s) preenchido(s) no Balanço.`, 'success');
        // Atualiza Calendário caso esteja montado (usa dados do Caixa)
        if (window.renderCalendario) {
            const calSection = document.getElementById('aba-calendario');
            if (calSection && calSection.style.display !== 'none') {
                window.renderCalendario(calSection);
            }
        }
    }
};

// ── SERVIÇO VINCULADO NO FORM DO CAIXA ───────────────────────────────────────
window.cxPopulateServices = function() {
    const sel = document.getElementById('cxServiceId');
    if (!sel) return;
    const current = sel.value;
    const servicos = JSON.parse(localStorage.getItem('pav_servicos') || '[]');
    sel.innerHTML = '<option value="">Sem serviço vinculado</option>';
    servicos.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.nome} — R$ ${parseFloat(s.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        if (s.id === current) opt.selected = true;
        sel.appendChild(opt);
    });
};

window.cxOnServiceChange = function(sel) {
    if (!sel.value) return;
    const servicos = JSON.parse(localStorage.getItem('pav_servicos') || '[]');
    const s = servicos.find(sv => sv.id === sel.value);
    if (!s) return;
    const descEl  = document.getElementById('cxDescricao');
    const valorEl = document.getElementById('cxValor');
    const catEl   = document.getElementById('cxCategoria');
    const tipoEl  = document.getElementById('cxTipo');
    const recEl   = document.getElementById('cxTipoReceita');
    if (descEl  && !descEl.value)  descEl.value  = s.nome;
    if (valorEl && !valorEl.value) valorEl.value = parseFloat(s.preco || 0).toFixed(2);
    if (catEl)   catEl.value = 'faturamento';
    if (tipoEl)  tipoEl.value = 'receita';
    if (recEl)   recEl.checked = true;
    if (window.cxTipoChange) window.cxTipoChange();
};

// ============================================================
// FEATURE 1.1 — CONTAS A PAGAR / RECEBER (BillsModule)
// Fase 1 — não remove código existente
// ============================================================
const BillsModule = (() => {

    const fmt     = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

    // ── SUPABASE HELPERS ──────────────────────────────────────────────────────

    async function _getOrgId() {
        return await OrgAPI.getOrgId();
    }

    async function _getUserId() {
        return Auth.getUser()?.id;
    }

    // ── QUERIES ───────────────────────────────────────────────────────────────

    async function fetchBills(filters = {}) {
        const orgId = await _getOrgId();
        if (!orgId) return [];
        let query = _supabase
            .from('bills')
            .select('*')
            .eq('organization_id', orgId)
            .order('due_date', { ascending: true });
        if (filters.type)   query = query.eq('type', filters.type);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.from)   query = query.gte('due_date', filters.from);
        if (filters.to)     query = query.lte('due_date', filters.to);
        const { data, error } = await query;
        if (error) { console.error('bills fetch:', error); return []; }
        return data || [];
    }

    async function createBill(payload) {
        const orgId  = await _getOrgId();
        const userId = await _getUserId();
        if (!orgId || !userId) return null;
        const { data, error } = await _supabase
            .from('bills')
            .insert({ organization_id: orgId, user_id: userId, ...payload })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function updateBill(id, payload) {
        const { data, error } = await _supabase
            .from('bills')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    function _nextDueDate(dueDateStr, recurrence) {
        const d = new Date(dueDateStr + 'T00:00:00');
        const months = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
        const add = months[recurrence];
        if (!add) return null;
        d.setMonth(d.getMonth() + add);
        return d.toISOString().split('T')[0];
    }

    async function markAsPaid(id) {
        const today = new Date().toISOString().split('T')[0];

        // Busca a bill para usar os dados no movimento de Caixa
        const { data: bill } = await _supabase.from('bills').select('*').eq('id', id).single();

        // Atualiza bill — trigger SQL cuida de: status='paid' + clonagem recorrente
        await updateBill(id, { paid_date: today });

        // Cria movimento no Caixa automaticamente (vinculado à bill)
        if (bill) {
            // Verifica se já existe movimento vinculado a esta bill para não duplicar
            const existentes = CashAPI.getLocal().filter(m => m.billId === id);
            if (existentes.length === 0) {
                await CashAPI.upsertMovimento({
                    id:          _genUUID(),
                    descricao:   bill.description,
                    valor:       parseFloat(bill.amount),
                    vencimento:  today,
                    tipo:        bill.type === 'payable' ? 'despesa' : 'receita',
                    categoria:   bill.category || '',
                    formaPag:    'outros',
                    observacao:  `Lançado automaticamente via Contas a Pagar/Receber`,
                    status:      'pago',
                    billId:      bill.id
                });
            }
        }
    }

    async function deleteBill(id) {
        const { error } = await _supabase.from('bills').delete().eq('id', id);
        if (error) throw error;
    }

    // ── SUMÁRIO ───────────────────────────────────────────────────────────────

    async function fetchSummary() {
        const bills = await fetchBills();
        const totalPayable    = bills.filter(b => b.type === 'payable' && b.status !== 'paid')
                                     .reduce((s, b) => s + parseFloat(b.amount), 0);
        const totalReceivable = bills.filter(b => b.type === 'receivable' && b.status !== 'paid')
                                     .reduce((s, b) => s + parseFloat(b.amount), 0);
        const overdue         = bills.filter(b => b.status === 'overdue').length;
        return { totalPayable, totalReceivable, overdue, bills };
    }

    // ── RENDER ────────────────────────────────────────────────────────────────

    function _statusLabel(s) {
        return { open: 'Em aberto', paid: 'Pago', overdue: 'Vencido' }[s] || s;
    }

    function _summaryCards(summary) {
        return `
        <div class="bills-summary-cards">
            <div class="bills-summary-card">
                <span class="bsc-label">A Pagar (em aberto)</span>
                <span class="bsc-value bsc-danger">${fmt(summary.totalPayable)}</span>
            </div>
            <div class="bills-summary-card">
                <span class="bsc-label">A Receber (em aberto)</span>
                <span class="bsc-value bsc-success">${fmt(summary.totalReceivable)}</span>
            </div>
            <div class="bills-summary-card ${summary.overdue > 0 ? 'bsc-alert' : ''}">
                <span class="bsc-label">Vencidos</span>
                <span class="bsc-value ${summary.overdue > 0 ? 'bsc-danger' : ''}">${summary.overdue}</span>
            </div>
        </div>`;
    }

    function _billsList(bills) {
        if (!bills.length) {
            return `<div class="pav-empty-state" style="padding:2rem 0;">
                <p>Nenhuma conta encontrada.</p>
            </div>`;
        }
        return `
        <div class="bills-table-wrap">
            <table class="bills-table">
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                ${bills.map(b => `
                    <tr class="bill-row bill-status-${b.status}">
                        <td>${b.description}${b.recurrence && b.recurrence !== 'none' ? ` <span class="bills-recurrence-tag">↻ ${{ monthly:'mensal', quarterly:'trimestral', semiannual:'semestral', annual:'anual' }[b.recurrence] || b.recurrence}</span>` : ''}</td>
                        <td>${b.category || '—'}</td>
                        <td class="bills-amount">${fmt(b.amount)}</td>
                        <td>${fmtDate(b.due_date)}</td>
                        <td><span class="bills-status-badge bills-badge-${b.status}">${_statusLabel(b.status)}</span></td>
                        <td class="bills-actions">
                            ${b.status !== 'paid' ? `<button class="bills-btn-pay" data-id="${b.id}" title="Marcar como pago">✓ Pagar</button>` : ''}
                            <button class="bills-btn-edit" data-id="${b.id}" title="Editar">✏️</button>
                            <button class="bills-btn-delete" data-id="${b.id}" title="Excluir">🗑</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }

    function _billForm(bill = null) {
        const isEdit = !!bill;
        const methods = ['dinheiro','cartao_credito','cartao_debito','pix','cheque','transferencia'];
        const methodLabels = { dinheiro:'Dinheiro', cartao_credito:'Cartão Crédito', cartao_debito:'Cartão Débito', pix:'PIX', cheque:'Cheque', transferencia:'Transferência' };
        return `
        <div class="bills-modal-content">
            <h3 style="margin:0 0 1.25rem 0; font-size:1rem;">${isEdit ? 'Editar Conta' : 'Nova Conta'}</h3>
            <form id="bills-form">
                <div class="bills-form-row">
                    <label>Tipo *</label>
                    <select name="type" required>
                        <option value="payable"    ${bill?.type === 'payable'    ? 'selected' : ''}>A Pagar</option>
                        <option value="receivable" ${bill?.type === 'receivable' ? 'selected' : ''}>A Receber</option>
                    </select>
                </div>
                <div class="bills-form-row">
                    <label>Descrição *</label>
                    <input type="text" name="description" value="${bill?.description || ''}" required placeholder="Ex: Aluguel, Convênio PetLove…" />
                </div>
                <div class="bills-form-row bills-form-row-2">
                    <div>
                        <label>Valor (R$) *</label>
                        <input type="number" name="amount" value="${bill?.amount || ''}" min="0.01" step="0.01" required placeholder="0,00" />
                    </div>
                    <div>
                        <label>Vencimento *</label>
                        <input type="date" name="due_date" value="${bill?.due_date || ''}" required />
                    </div>
                </div>
                <div class="bills-form-row bills-form-row-2">
                    <div>
                        <label>Categoria</label>
                        <input type="text" name="category" value="${bill?.category || ''}" placeholder="Ex: Aluguel, Fornecedor…" />
                    </div>
                    <div>
                        <label>Recorrência</label>
                        <select name="recurrence">
                            <option value="none"       ${(bill?.recurrence || 'none') === 'none'       ? 'selected' : ''}>Não recorrente</option>
                            <option value="monthly"    ${bill?.recurrence === 'monthly'    ? 'selected' : ''}>Mensal</option>
                            <option value="quarterly"  ${bill?.recurrence === 'quarterly'  ? 'selected' : ''}>Trimestral</option>
                            <option value="semiannual" ${bill?.recurrence === 'semiannual' ? 'selected' : ''}>Semestral</option>
                            <option value="annual"     ${bill?.recurrence === 'annual'     ? 'selected' : ''}>Anual</option>
                        </select>
                    </div>
                </div>
                <div class="bills-form-row">
                    <label>Observações</label>
                    <textarea name="notes" rows="2" placeholder="Opcional…">${bill?.notes || ''}</textarea>
                </div>
                <div class="bills-form-actions">
                    <button type="button" id="bills-btn-cancel" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary">${isEdit ? 'Salvar Alterações' : 'Criar Conta'}</button>
                </div>
            </form>
        </div>`;
    }

    // ── RENDER PRINCIPAL DA ABA ───────────────────────────────────────────────

    async function renderBillsTab() {
        const container = document.getElementById('aba-bills');
        if (!container) return;

        container.innerHTML = `
        <div style="margin-bottom:1.5rem;">
            <h2 class="text-accent" style="margin:0 0 4px 0;">Contas a Pagar / Receber</h2>
            <p style="color:var(--text-secondary); margin:0; font-size:0.875rem;">Gerencie vencimentos, recorrências e fluxo futuro.</p>
        </div>
        <div id="bills-summary-wrap"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
            <div class="bills-type-toggle">
                <button class="bills-toggle-btn bills-toggle-active" data-type="payable">A Pagar</button>
                <button class="bills-toggle-btn" data-type="receivable">A Receber</button>
                <button class="bills-toggle-btn" data-type="">Todos</button>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                <select id="bills-status-filter" style="padding:0.4rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-size:0.85rem; font-family:var(--font-family);">
                    <option value="">Todos os status</option>
                    <option value="open">Em aberto</option>
                    <option value="overdue">Vencidos</option>
                    <option value="paid">Pagos</option>
                </select>
                <button id="bills-btn-new" class="btn-primary" style="padding:0.45rem 1rem; font-size:0.875rem;">+ Nova Conta</button>
            </div>
        </div>
        <div id="bills-list-wrap"></div>
        <div id="bills-modal" class="bills-modal bills-modal-hidden"></div>`;

        _setupListeners(container);
        await _loadView(container, 'payable');
    }

    async function _loadView(container, type) {
        const statusFilter = container.querySelector('#bills-status-filter')?.value || undefined;
        const [summary, bills] = await Promise.all([
            fetchSummary(),
            fetchBills({ type: type || undefined, status: statusFilter }),
        ]);
        const summaryWrap = container.querySelector('#bills-summary-wrap');
        const listWrap    = container.querySelector('#bills-list-wrap');
        if (summaryWrap) summaryWrap.innerHTML = _summaryCards(summary);
        if (listWrap)    listWrap.innerHTML    = _billsList(bills);
    }

    function _setupListeners(container) {
        let currentType = 'payable';

        container.addEventListener('click', async e => {

            // Toggle tipo
            if (e.target.matches('.bills-toggle-btn')) {
                container.querySelectorAll('.bills-toggle-btn').forEach(b => b.classList.remove('bills-toggle-active'));
                e.target.classList.add('bills-toggle-active');
                currentType = e.target.dataset.type;
                await _loadView(container, currentType);
                return;
            }

            // Nova conta
            if (e.target.id === 'bills-btn-new') {
                _openModal(container, null, currentType, () => _loadView(container, currentType));
                return;
            }

            // Pagar
            if (e.target.matches('.bills-btn-pay')) {
                const id = e.target.dataset.id;
                Utils.confirm('Confirmar pagamento na data de hoje?', 'Marcar como pago', async () => {
                    try {
                        await markAsPaid(id);
                        await _loadView(container, currentType);
                        Utils.showToast('Conta marcada como paga!', 'success');
                        // Atualizar badge de notificações
                        if (window.NotificationsModule) await window.NotificationsModule.refresh();
                    } catch (err) {
                        Utils.showToast('Erro ao marcar: ' + err.message, 'error');
                    }
                });
                return;
            }

            // Editar
            if (e.target.matches('.bills-btn-edit')) {
                const id = e.target.dataset.id;
                const { data } = await _supabase.from('bills').select('*').eq('id', id).single();
                if (data) _openModal(container, data, currentType, () => _loadView(container, currentType));
                return;
            }

            // Excluir
            if (e.target.matches('.bills-btn-delete')) {
                const id = e.target.dataset.id;
                Utils.confirm('Este registro será removido permanentemente.', 'Excluir conta?', async () => {
                    try {
                        await deleteBill(id);
                        await _loadView(container, currentType);
                        Utils.showToast('Conta excluída.', 'success');
                    } catch (err) {
                        Utils.showToast('Erro ao excluir: ' + err.message, 'error');
                    }
                });
                return;
            }
        });

        container.addEventListener('change', async e => {
            if (e.target.id === 'bills-status-filter') {
                await _loadView(container, currentType);
            }
        });
    }

    function _openModal(container, bill, defaultType, onSuccess) {
        const modal = container.querySelector('#bills-modal');
        if (!modal) return;
        modal.classList.remove('bills-modal-hidden');
        modal.innerHTML = _billForm(bill);

        // Pre-select type when opening from toggle
        if (!bill) {
            const typeSelect = modal.querySelector('[name="type"]');
            if (typeSelect && defaultType) typeSelect.value = defaultType;
        }

        modal.querySelector('#bills-btn-cancel').addEventListener('click', () => {
            modal.classList.add('bills-modal-hidden');
        });

        modal.querySelector('#bills-form').addEventListener('submit', async e => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const payload = {
                type:        fd.get('type'),
                description: fd.get('description').trim(),
                amount:      parseFloat(fd.get('amount')),
                due_date:    fd.get('due_date'),
                category:    fd.get('category')   || null,
                recurrence:  fd.get('recurrence'),
                notes:       fd.get('notes')       || null,
            };
            const submitBtn = modal.querySelector('[type="submit"]');
            Utils.setLoading(submitBtn, true);
            try {
                if (bill?.id) await updateBill(bill.id, payload);
                else          await createBill(payload);
                modal.classList.add('bills-modal-hidden');
                await onSuccess();
                Utils.showToast(bill?.id ? 'Conta atualizada!' : 'Conta criada!', 'success');
                if (window.NotificationsModule) await window.NotificationsModule.refresh();
            } catch (err) {
                Utils.setLoading(submitBtn, false);
                Utils.showToast('Erro ao salvar: ' + err.message, 'error');
            }
        });
    }

    // ── EXPORT PÚBLICO ────────────────────────────────────────────────────────
    return { renderBillsTab, fetchBills, fetchSummary, markAsPaid };

})();

window.renderBills = BillsModule.renderBillsTab;

// ============================================================
// FEATURE 1.3 — SPLIT DE PAGAMENTO
// Adiciona múltiplas formas de pagamento por lançamento do Caixa
// ============================================================

window.renderPaymentSplitSection = function(existing = []) {
    return `
    <div id="payment-split-section" style="margin-top:0.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <label style="font-size:0.8rem; font-weight:600; color:var(--text-secondary);">Formas de Pagamento (opcional)</label>
            <button type="button" id="btn-add-payment" class="btn-link" style="font-size:0.8rem;">+ Adicionar forma</button>
        </div>
        <div id="payment-lines">
            ${existing.map((p, i) => window.renderPaymentLine(p, i)).join('')}
        </div>
        <div id="split-validation" class="split-validation"></div>
    </div>`;
};

window.renderPaymentLine = function(payment = {}, index = 0) {
    const methods = [
        { value: 'dinheiro',       label: 'Dinheiro' },
        { value: 'cartao_credito', label: 'Cartão Crédito' },
        { value: 'cartao_debito',  label: 'Cartão Débito' },
        { value: 'pix',            label: 'PIX' },
        { value: 'cheque',         label: 'Cheque' },
        { value: 'transferencia',  label: 'Transferência' },
    ];
    return `
    <div class="payment-line" data-index="${index}" style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
        <select name="payment_method_${index}" style="flex:1; padding:0.4rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.82rem; font-family:var(--font-family);">
            ${methods.map(m => `<option value="${m.value}" ${payment.method === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
        </select>
        <input type="number" name="payment_amount_${index}"
               value="${payment.amount || ''}" min="0.01" step="0.01"
               placeholder="Valor R$" class="payment-amount-input"
               style="width:110px; padding:0.4rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.82rem; font-family:var(--font-family);" />
        <button type="button" class="btn-remove-payment" data-index="${index}"
                style="background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:1rem; padding:0 4px;">✕</button>
    </div>`;
};

window.collectPayments = function(form) {
    const lines = form.querySelectorAll('.payment-line');
    if (!lines.length) return null;
    const payments = Array.from(lines).map((line, i) => ({
        method: form.querySelector(`[name="payment_method_${i}"]`)?.value,
        amount: parseFloat(form.querySelector(`[name="payment_amount_${i}"]`)?.value || 0),
    })).filter(p => p.amount > 0);
    return payments.length ? payments : null;
};

window.validatePaymentSplit = function(totalAmount, payments) {
    if (!payments || !payments.length) return { valid: true };
    const sum  = payments.reduce((acc, p) => acc + p.amount, 0);
    const diff = Math.abs(sum - totalAmount);
    if (diff > 0.01) {
        const fmt = v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        return { valid: false, message: `Soma das formas (${fmt(sum)}) difere do total (${fmt(totalAmount)}).` };
    }
    return { valid: true };
};

// Inicializar listeners de split em um formulário
window.initSplitListeners = function(formEl) {
    formEl.addEventListener('click', e => {
        if (e.target.id === 'btn-add-payment') {
            const lines  = formEl.querySelectorAll('.payment-line');
            const wrap   = formEl.querySelector('#payment-lines');
            if (wrap) wrap.insertAdjacentHTML('beforeend', window.renderPaymentLine({}, lines.length));
        }
        if (e.target.matches('.btn-remove-payment')) {
            e.target.closest('.payment-line')?.remove();
            // Renumerar índices
            formEl.querySelectorAll('.payment-line').forEach((line, i) => {
                line.dataset.index = i;
                line.querySelector('select')?.setAttribute('name', `payment_method_${i}`);
                line.querySelector('input')?.setAttribute('name', `payment_amount_${i}`);
                const rmBtn = line.querySelector('.btn-remove-payment');
                if (rmBtn) rmBtn.dataset.index = i;
            });
        }
    });

    // Validar ao digitar
    formEl.addEventListener('input', () => {
        const totalEl = formEl.querySelector('[name="cxValor"]') || formEl.querySelector('#cxValor');
        const total   = parseFloat(totalEl?.value || 0);
        const payments = window.collectPayments(formEl);
        const validEl  = formEl.querySelector('#split-validation');
        if (!validEl || !payments || !payments.length) return;
        const result = window.validatePaymentSplit(total, payments);
        validEl.textContent = result.valid ? '✓ Divisão OK' : result.message;
        validEl.className   = result.valid ? 'split-validation split-ok' : 'split-validation split-error';
    });
};
