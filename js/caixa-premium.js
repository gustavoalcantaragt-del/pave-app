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
                        <label>Categoria <a href="#" id="bills-cat-manage" style="font-size:0.72rem; font-weight:500; margin-left:0.5rem; color:var(--accent-blue);">gerenciar →</a></label>
                        <select name="category_id" id="bills-category-select" data-current="${bill?.category_id || ''}">
                            <option value="">— sem categoria —</option>
                        </select>
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

    async function _populateCategorySelect(modal, currentId) {
        const select = modal.querySelector('#bills-category-select');
        if (!select) return;
        try {
            const cats = (typeof CategoriesAPI !== 'undefined') ? await CategoriesAPI.list() : [];
            window._catCache = cats; // cache p/ resolução de nome no submit
            const byParent = (parentId) => cats.filter(c => (c.parent_id || null) === parentId);
            const renderTree = (parentId, depth) => {
                return byParent(parentId).map(c => {
                    const indent = '— '.repeat(depth);
                    const sel = c.id === currentId ? 'selected' : '';
                    return `<option value="${c.id}" ${sel}>${indent}${c.name}</option>` + renderTree(c.id, depth + 1);
                }).join('');
            };
            select.innerHTML = `<option value="">— sem categoria —</option>` + renderTree(null, 0);
        } catch (e) {
            console.warn('[BILLS] populateCategorySelect:', e);
        }
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

        // Carregar categorias dinâmicas
        _populateCategorySelect(modal, bill?.category_id);

        // Link "gerenciar" → abre Configurações
        modal.querySelector('#bills-cat-manage')?.addEventListener('click', e => {
            e.preventDefault();
            modal.classList.add('bills-modal-hidden');
            document.getElementById('tab-config')?.click();
            setTimeout(() => {
                document.getElementById('cfg-categorias-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 200);
        });

        modal.querySelector('#bills-btn-cancel').addEventListener('click', () => {
            modal.classList.add('bills-modal-hidden');
        });

        modal.querySelector('#bills-form').addEventListener('submit', async e => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const recurrence = fd.get('recurrence');
            const recurrenceMode = fd.get('recurrence_mode');
            const recurrenceEndDate = fd.get('recurrence_end_date');
            const categoryId = fd.get('category_id') || null;

            // Resolver nome da categoria (texto) para preencher o campo legado category
            let categoryName = null;
            if (categoryId && window._catCache) {
                const found = window._catCache.find(c => c.id === categoryId);
                categoryName = found?.name || null;
            }

            const payload = {
                type:                 fd.get('type'),
                description:          fd.get('description').trim(),
                amount:               parseFloat(fd.get('amount')),
                due_date:             fd.get('due_date'),
                category_id:          categoryId,
                category:             categoryName,
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

