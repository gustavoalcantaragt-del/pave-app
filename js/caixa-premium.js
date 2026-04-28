// caixa-premium.js
// Contas a Pagar/Receber (BillsModule) + Split de Pagamento

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
                        <select name="recurrence" id="bills-recurrence-select" onchange="window._billsToggleEndDate(this.value)">
                            <option value="none"       ${(bill?.recurrence || 'none') === 'none'       ? 'selected' : ''}>Não recorrente</option>
                            <option value="monthly"    ${bill?.recurrence === 'monthly'    ? 'selected' : ''}>Mensal</option>
                            <option value="quarterly"  ${bill?.recurrence === 'quarterly'  ? 'selected' : ''}>Trimestral</option>
                            <option value="semiannual" ${bill?.recurrence === 'semiannual' ? 'selected' : ''}>Semestral</option>
                            <option value="annual"     ${bill?.recurrence === 'annual'     ? 'selected' : ''}>Anual</option>
                        </select>
                    </div>
                </div>
                <div id="bills-end-date-row" class="bills-form-row" style="display:${bill?.recurrence && bill.recurrence !== 'none' ? 'block' : 'none'};">
                    <label>Vigência da recorrência</label>
                    <div style="display:flex; gap:1rem; align-items:center; flex-wrap:wrap; margin-top:0.35rem;">
                        <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-weight:500; margin:0;">
                            <input type="radio" name="recurrence_mode" value="indefinite"
                                ${(!bill?.recurrence_end_date) ? 'checked' : ''}
                                onchange="document.getElementById('bills-end-date-input').style.display='none'">
                            Indefinida (até cancelar)
                        </label>
                        <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-weight:500; margin:0;">
                            <input type="radio" name="recurrence_mode" value="until_date"
                                ${bill?.recurrence_end_date ? 'checked' : ''}
                                onchange="document.getElementById('bills-end-date-input').style.display='block'">
                            Até data:
                        </label>
                        <input type="date" id="bills-end-date-input" name="recurrence_end_date"
                               value="${bill?.recurrence_end_date || ''}"
                               style="display:${bill?.recurrence_end_date ? 'block' : 'none'}; padding:0.35rem 0.5rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-family:var(--font-family); font-size:0.85rem;" />
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
            const recurrence = fd.get('recurrence');
            const recurrenceMode = fd.get('recurrence_mode');
            const recurrenceEndDate = fd.get('recurrence_end_date');

            const payload = {
                type:                 fd.get('type'),
                description:          fd.get('description').trim(),
                amount:               parseFloat(fd.get('amount')),
                due_date:             fd.get('due_date'),
                category:             fd.get('category')   || null,
                recurrence:           recurrence,
                recurrence_end_date:  (recurrence !== 'none' && recurrenceMode === 'until_date' && recurrenceEndDate)
                                        ? recurrenceEndDate
                                        : null,
                notes:                fd.get('notes') || null,
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

window._billsToggleEndDate = function(recurrenceValue) {
    const row = document.getElementById('bills-end-date-row');
    if (!row) return;
    row.style.display = recurrenceValue && recurrenceValue !== 'none' ? 'block' : 'none';
    if (recurrenceValue === 'none') {
        const input = document.getElementById('bills-end-date-input');
        if (input) { input.style.display = 'none'; input.value = ''; }
    }
};

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
