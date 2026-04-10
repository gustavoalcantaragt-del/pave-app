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
    movimentos.forEach(m => {
        if (_cxSelectedIds.has(m.id)) m.status = 'pago';
    });
    localStorage.setItem('pav_caixa_movimentos', JSON.stringify(movimentos));
    _cxSelectedIds.clear();
    window.renderCaixa();
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
            border-bottom:1px solid rgba(255,255,255,0.05);
            transition:background 0.15s;
            opacity:${isPago ? '0.5' : '1'};
            background:${isSelected ? 'rgba(10,132,255,0.07)' : 'transparent'};
        `;
        div.onmouseover = () => { if (!isSelected) div.style.background = 'rgba(255,255,255,0.025)'; };
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
            const isRec      = document.getElementById('cxRecorrente')?.checked;
            const vezes      = isRec ? parseInt(document.getElementById('cxVezes').value) || 2 : 1;

            if (!desc)  { Utils.showToast('Informe a descrição do lançamento', 'error'); return; }
            if (valor <= 0) { Utils.showToast('Informe um valor válido', 'error'); return; }
            if (!venc)  { Utils.showToast('Informe a data de vencimento', 'error'); return; }

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
                    id:        Date.now().toString() + '-' + i,
                    descricao: vezes > 1 ? `${desc} (${i+1}/${vezes})` : desc,
                    valor, vencimento: dataFormatada, tipo, categoria: cat,
                    formaPag, observacao, status: 'pendente'
                });
            }

            localStorage.setItem('pav_caixa_movimentos', JSON.stringify(movimentos));
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
        movimentos[idx].status = movimentos[idx].status === 'pago' ? 'pendente' : 'pago';
        localStorage.setItem('pav_caixa_movimentos', JSON.stringify(movimentos));
        window.renderCaixa();
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
        if (!somaPorCat[m.categoria]) somaPorCat[m.categoria] = 0;
        somaPorCat[m.categoria] += m.valor;
    });

    let cont = 0;
    for (const [cat, val] of Object.entries(somaPorCat)) {
        const el = document.getElementById(cat);
        if (el) { el.value = val; cont++; }
    }
    Utils.showToast(`Sincronizado! ${cont} categorias foram preenchidas no Balanço.`, 'success');
};
