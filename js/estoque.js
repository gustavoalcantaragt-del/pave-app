// ============================================================
// estoque.js — Módulo de Controle de Estoque
// Feature 4.5 — Fase 4 do PAVE
// Tabelas: stock_items, stock_movements (ver migration 004)
// ============================================================

const EstoqueModule = (() => {

    const CATEGORIES = [
        'Medicamentos', 'Vacinas e Biológicos', 'Material Cirúrgico',
        'Materiais Descartáveis', 'Higiene e Limpeza', 'Alimentação Animal',
        'Material de Escritório', 'Equipamentos', 'Outros'
    ];

    const UNITS = ['un', 'cx', 'fr', 'amp', 'ml', 'L', 'g', 'kg', 'comp', 'cap', 'bisnaga'];

    // Dias para "vencendo em breve"
    const EXPIRY_WARN_DAYS = 30;

    // ── HELPERS ───────────────────────────────────────────────
    const fmt    = v  => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const fmtNum = v  => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
    const fmtDate = d  => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

    function _today() { return new Date().toISOString().split('T')[0]; }
    function _addDays(d, n) {
        const dt = new Date(d + 'T00:00:00');
        dt.setDate(dt.getDate() + n);
        return dt.toISOString().split('T')[0];
    }

    // ── SUPABASE CRUD ─────────────────────────────────────────
    async function fetchItems(filters = {}) {
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) return [];

        let query = _supabase
            .from('stock_items')
            .select('*')
            .eq('organization_id', orgId)
            .eq('active', true)
            .order('name', { ascending: true });

        if (filters.category) query = query.eq('category', filters.category);
        if (filters.search)   query = query.ilike('name', `%${filters.search}%`);

        const { data, error } = await query;
        if (error) { console.warn('estoque fetch:', error); return []; }
        return data || [];
    }

    async function fetchAlerts() {
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) return { expired: [], expiring: [], low: [] };

        const today    = _today();
        const warnDate = _addDays(today, EXPIRY_WARN_DAYS);

        const { data, error } = await _supabase
            .from('stock_items')
            .select('*')
            .eq('organization_id', orgId)
            .eq('active', true);

        if (error) return { expired: [], expiring: [], low: [] };

        const items    = data || [];
        const expired  = items.filter(i => i.expiry_date && i.expiry_date < today);
        const expiring = items.filter(i => i.expiry_date && i.expiry_date >= today && i.expiry_date <= warnDate);
        const low      = items.filter(i => i.min_quantity > 0 && i.quantity <= i.min_quantity && !expired.includes(i));

        return { expired, expiring, low, all: items };
    }

    async function saveItem(item) {
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) throw new Error('Org não encontrada.');

        const payload = {
            organization_id: orgId,
            name:          item.name,
            sku:           item.sku || null,
            category:      item.category || 'Outros',
            unit:          item.unit || 'un',
            quantity:      parseFloat(item.quantity) || 0,
            min_quantity:  parseFloat(item.min_quantity) || 0,
            cost_price:    parseFloat(item.cost_price) || 0,
            sell_price:    item.sell_price ? parseFloat(item.sell_price) : null,
            supplier:      item.supplier || null,
            supplier_cnpj: item.supplier_cnpj || null,
            expiry_date:   item.expiry_date || null,
            location:      item.location || null,
            notes:         item.notes || null
        };

        let result;
        if (item.id) {
            const { error } = await _supabase.from('stock_items').update(payload).eq('id', item.id);
            if (error) throw error;
            result = { ...payload, id: item.id };
        } else {
            const { data, error } = await _supabase.from('stock_items').insert(payload).select().single();
            if (error) throw error;
            result = data;
        }
        return result;
    }

    async function deleteItem(id) {
        const { error } = await _supabase
            .from('stock_items')
            .update({ active: false })
            .eq('id', id);
        if (error) throw error;
    }

    async function addMovement(stockItemId, type, quantity, reason = '') {
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) throw new Error('Org não encontrada.');

        const userId = Auth.getUser()?.id || null;

        const { error } = await _supabase.from('stock_movements').insert({
            organization_id: orgId,
            stock_item_id:   stockItemId,
            type,
            quantity:        Math.abs(parseFloat(quantity)),
            reason,
            created_by:      userId
        });
        if (error) throw error;
    }

    // ── STATUS DO ITEM ─────────────────────────────────────────
    function _itemStatus(item) {
        const today    = _today();
        const warnDate = _addDays(today, EXPIRY_WARN_DAYS);
        if (item.expiry_date && item.expiry_date < today)       return 'expired';
        if (item.expiry_date && item.expiry_date <= warnDate)   return 'expiring';
        if (item.min_quantity > 0 && item.quantity <= item.min_quantity) return 'low';
        return 'ok';
    }

    // ── RENDER PRINCIPAL ───────────────────────────────────────
    async function render(container) {
        if (!container) return;

        container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:.75rem;">
            <div>
                <h2 id="page-title" style="margin:0;">Estoque</h2>
                <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">Controle de insumos, medicamentos e materiais</p>
            </div>
            <button class="btn-primary" id="btn-novo-item" style="font-size:0.875rem; padding:0.55rem 1.1rem;">
                + Novo Item
            </button>
        </div>

        <!-- Alertas -->
        <div id="stock-alerts-area"></div>

        <!-- KPIs -->
        <div class="stock-kpi-grid" id="stock-kpis"></div>

        <!-- Filtros -->
        <div class="card" style="padding:0.75rem 1rem; margin-bottom:1rem; display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
            <input type="text" id="stock-search" placeholder="Buscar item..." style="flex:1; min-width:150px; padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.875rem;">
            <select id="stock-cat-filter" style="padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.875rem;">
                <option value="">Todas as categorias</option>
                ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <button id="btn-stock-refresh" style="padding:8px 14px; border:1px solid var(--border); border-radius:8px; background:transparent; color:var(--text-secondary); cursor:pointer; font-size:0.875rem;" title="Recarregar">↺</button>
        </div>

        <!-- Tabela -->
        <div class="card" style="padding:0;">
            <div class="stock-table-wrap" id="stock-table-area">
                <div style="padding:2rem; text-align:center; color:var(--text-muted);">Carregando estoque...</div>
            </div>
        </div>`;

        document.getElementById('btn-novo-item')?.addEventListener('click', () => openItemModal(null));
        document.getElementById('btn-stock-refresh')?.addEventListener('click', () => _loadTable());
        document.getElementById('stock-search')?.addEventListener('input',  _debounce(() => _loadTable(), 350));
        document.getElementById('stock-cat-filter')?.addEventListener('change', () => _loadTable());

        await _loadAlerts();
        await _loadTable();
    }

    async function _loadAlerts() {
        const area = document.getElementById('stock-alerts-area');
        if (!area) return;

        const { expired, expiring, low } = await fetchAlerts();
        const parts = [];
        if (expired.length)  parts.push(`<strong>${expired.length}</strong> item(s) vencido(s)`);
        if (expiring.length) parts.push(`<strong>${expiring.length}</strong> vencendo em ${EXPIRY_WARN_DAYS} dias`);
        if (low.length)      parts.push(`<strong>${low.length}</strong> com estoque baixo`);

        if (!parts.length) { area.innerHTML = ''; return; }

        area.innerHTML = `
        <div class="stock-alert-banner" style="margin-bottom:1rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Atenção: ${parts.join(', ')}. Verifique os itens sinalizados na tabela.</span>
        </div>`;
    }

    async function _loadTable(filters) {
        const area      = document.getElementById('stock-table-area');
        if (!area) return;

        const search = document.getElementById('stock-search')?.value?.trim() || '';
        const cat    = document.getElementById('stock-cat-filter')?.value || '';

        const items  = await fetchItems({ search, category: cat });
        _renderKPIs(items);
        _renderTable(area, items);
    }

    function _renderKPIs(items) {
        const el = document.getElementById('stock-kpis');
        if (!el) return;

        const today    = _today();
        const warnDate = _addDays(today, EXPIRY_WARN_DAYS);
        const expired  = items.filter(i => i.expiry_date && i.expiry_date < today).length;
        const expiring = items.filter(i => i.expiry_date && i.expiry_date >= today && i.expiry_date <= warnDate).length;
        const low      = items.filter(i => i.min_quantity > 0 && i.quantity <= i.min_quantity).length;
        const totalVal = items.reduce((s, i) => s + (i.quantity * i.cost_price), 0);

        el.innerHTML = `
        <div class="stock-kpi-card">
            <span class="kpi-label">Total de Itens</span>
            <span class="kpi-value">${items.length}</span>
            ${items.length === 0 ? '' : `<span class="kpi-badge kpi-badge-green">Cadastrados</span>`}
        </div>
        <div class="stock-kpi-card">
            <span class="kpi-label">Valor em Estoque</span>
            <span class="kpi-value" style="font-size:1.1rem;">${fmt(totalVal)}</span>
        </div>
        <div class="stock-kpi-card">
            <span class="kpi-label">Estoque Baixo</span>
            <span class="kpi-value" style="color:${low > 0 ? 'var(--color-warning)' : 'inherit'}">${low}</span>
            ${low > 0 ? `<span class="kpi-badge kpi-badge-yellow">Atenção</span>` : ''}
        </div>
        <div class="stock-kpi-card">
            <span class="kpi-label">Vencidos</span>
            <span class="kpi-value" style="color:${expired > 0 ? 'var(--color-danger)' : 'inherit'}">${expired}</span>
            ${expired > 0 ? `<span class="kpi-badge kpi-badge-red">Urgente</span>` : ''}
        </div>
        <div class="stock-kpi-card">
            <span class="kpi-label">Vencendo em ${EXPIRY_WARN_DAYS}d</span>
            <span class="kpi-value" style="color:${expiring > 0 ? 'var(--color-warning)' : 'inherit'}">${expiring}</span>
            ${expiring > 0 ? `<span class="kpi-badge kpi-badge-yellow">Alerta</span>` : ''}
        </div>`;
    }

    function _renderTable(area, items) {
        if (!items.length) {
            area.innerHTML = `
            <div class="pav-empty-state" style="padding:2.5rem 1rem; text-align:center;">
                <div class="empty-icon" style="margin-bottom:1rem; opacity:0.3;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                </div>
                <h3>Nenhum item no estoque</h3>
                <p style="color:var(--text-secondary); font-size:0.85rem;">Cadastre o primeiro item clicando em "+ Novo Item".</p>
            </div>`;
            return;
        }

        area.innerHTML = `
        <table class="stock-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Categoria</th>
                    <th style="text-align:right;">Qtd</th>
                    <th style="text-align:right;">Mín.</th>
                    <th style="text-align:right;">Custo Unit.</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th style="text-align:center;">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
                    const status = _itemStatus(item);
                    const statusLabel = { ok: 'OK', low: 'Baixo', expired: 'Vencido', expiring: 'Vencendo' }[status] || status;
                    const rowStyle = status === 'expired' ? 'background:rgba(226,75,74,0.04);' : status === 'expiring' ? 'background:rgba(239,159,39,0.04);' : '';
                    return `
                    <tr style="${rowStyle}">
                        <td>
                            <div style="font-weight:600;">${item.name}</div>
                            ${item.sku ? `<div style="font-size:0.72rem; color:var(--text-muted);">SKU: ${item.sku}</div>` : ''}
                            ${item.supplier ? `<div style="font-size:0.72rem; color:var(--text-muted);">${item.supplier}</div>` : ''}
                        </td>
                        <td style="font-size:0.82rem;">${item.category}</td>
                        <td style="text-align:right; font-weight:700; ${item.quantity <= item.min_quantity && item.min_quantity > 0 ? 'color:var(--color-warning);' : ''}">${fmtNum(item.quantity)} ${item.unit}</td>
                        <td style="text-align:right; font-size:0.82rem; color:var(--text-secondary);">${item.min_quantity > 0 ? fmtNum(item.min_quantity) : '—'}</td>
                        <td style="text-align:right;">${fmt(item.cost_price)}</td>
                        <td style="font-size:0.82rem; ${status === 'expired' ? 'color:var(--color-danger); font-weight:700;' : status === 'expiring' ? 'color:var(--color-warning); font-weight:600;' : ''}">${fmtDate(item.expiry_date)}</td>
                        <td><span class="stock-status-badge stock-status-${status}">${statusLabel}</span></td>
                        <td style="text-align:center; white-space:nowrap;">
                            <button onclick="EstoqueModule.openMovement('${item.id}', '${item.name.replace(/'/g,"\\'")}', ${item.quantity})"
                                style="padding:4px 10px; font-size:0.75rem; border:1px solid var(--border); border-radius:5px; cursor:pointer; background:transparent; color:var(--text-secondary); margin-right:4px;"
                                title="Registrar entrada/saída">±</button>
                            <button onclick="EstoqueModule.openItemModal(${JSON.stringify(item).replace(/"/g,'&quot;')})"
                                style="padding:4px 10px; font-size:0.75rem; border:1px solid var(--border); border-radius:5px; cursor:pointer; background:transparent; color:var(--text-secondary); margin-right:4px;"
                                title="Editar">✎</button>
                            <button onclick="EstoqueModule.confirmDelete('${item.id}', '${item.name.replace(/'/g,"\\'")}', this)"
                                style="padding:4px 10px; font-size:0.75rem; border:1px solid rgba(226,75,74,0.3); border-radius:5px; cursor:pointer; background:transparent; color:var(--color-danger);"
                                title="Excluir">✕</button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    // ── MODAL ITEM ────────────────────────────────────────────
    function openItemModal(item) {
        const isNew  = !item;
        const today  = _today();
        const modal  = document.createElement('div');
        modal.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadeIn 0.2s ease;';

        modal.innerHTML = `
        <div style="background:var(--bg-card); border-radius:16px; padding:1.75rem; max-width:580px; width:100%; max-height:90dvh; overflow-y:auto; box-shadow:var(--shadow-lg);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
                <h3 style="margin:0;">${isNew ? 'Novo Item de Estoque' : 'Editar Item'}</h3>
                <button id="btn-close-stock-modal" style="background:none; border:none; cursor:pointer; color:var(--text-secondary); display:flex; align-items:center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <form id="stock-item-form">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <div class="input-group" style="grid-column:1/-1;">
                        <label>Nome do Item *</label>
                        <input type="text" id="si-name" value="${item?.name || ''}" required placeholder="Ex: Amoxicilina 500mg">
                    </div>
                    <div class="input-group">
                        <label>SKU / Código</label>
                        <input type="text" id="si-sku" value="${item?.sku || ''}" placeholder="Opcional">
                    </div>
                    <div class="input-group">
                        <label>Categoria *</label>
                        <select id="si-category" style="padding:12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.9rem;">
                            ${CATEGORIES.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Unidade</label>
                        <select id="si-unit" style="padding:12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.9rem;">
                            ${UNITS.map(u => `<option value="${u}" ${item?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Quantidade Atual</label>
                        <input type="number" id="si-quantity" value="${item?.quantity ?? 0}" min="0" step="0.001">
                    </div>
                    <div class="input-group">
                        <label>Quantidade Mínima (alerta)</label>
                        <input type="number" id="si-min-qty" value="${item?.min_quantity ?? 0}" min="0" step="0.001">
                    </div>
                    <div class="input-group">
                        <label>Custo Unitário (R$)</label>
                        <input type="number" id="si-cost" value="${item?.cost_price ?? 0}" min="0" step="0.01">
                    </div>
                    <div class="input-group">
                        <label>Preço de Venda (R$)</label>
                        <input type="number" id="si-sell" value="${item?.sell_price ?? ''}" min="0" step="0.01" placeholder="Opcional">
                    </div>
                    <div class="input-group">
                        <label>Fornecedor</label>
                        <input type="text" id="si-supplier" value="${item?.supplier || ''}" placeholder="Nome do fornecedor">
                    </div>
                    <div class="input-group">
                        <label>CNPJ do Fornecedor</label>
                        <input type="text" id="si-cnpj" value="${item?.supplier_cnpj || ''}" placeholder="00.000.000/0001-00">
                    </div>
                    <div class="input-group">
                        <label>Validade</label>
                        <input type="date" id="si-expiry" value="${item?.expiry_date || ''}">
                    </div>
                    <div class="input-group">
                        <label>Localização (prateleira)</label>
                        <input type="text" id="si-location" value="${item?.location || ''}" placeholder="Ex: Armário B, prateleira 2">
                    </div>
                    <div class="input-group" style="grid-column:1/-1;">
                        <label>Observações</label>
                        <input type="text" id="si-notes" value="${item?.notes || ''}" placeholder="Observações opcionais">
                    </div>
                </div>
                <div id="stock-modal-status" style="margin-top:0.75rem;"></div>
                <div style="display:flex; gap:0.75rem; margin-top:1.25rem; justify-content:flex-end;">
                    <button type="button" id="btn-cancel-stock" style="padding:0.6rem 1.25rem; border:1px solid var(--border); border-radius:8px; background:transparent; color:var(--text-secondary); cursor:pointer;">Cancelar</button>
                    <button type="submit" class="btn-primary" style="padding:0.6rem 1.5rem;">${isNew ? 'Cadastrar Item' : 'Salvar Alterações'}</button>
                </div>
            </form>
        </div>`;

        document.body.appendChild(modal);

        modal.querySelector('#btn-close-stock-modal')?.addEventListener('click', () => modal.remove());
        modal.querySelector('#btn-cancel-stock')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        modal.querySelector('#stock-item-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const statusEl = modal.querySelector('#stock-modal-status');
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Salvando...';

            const data = {
                id:            item?.id || null,
                name:          modal.querySelector('#si-name').value.trim(),
                sku:           modal.querySelector('#si-sku').value.trim(),
                category:      modal.querySelector('#si-category').value,
                unit:          modal.querySelector('#si-unit').value,
                quantity:      modal.querySelector('#si-quantity').value,
                min_quantity:  modal.querySelector('#si-min-qty').value,
                cost_price:    modal.querySelector('#si-cost').value,
                sell_price:    modal.querySelector('#si-sell').value,
                supplier:      modal.querySelector('#si-supplier').value.trim(),
                supplier_cnpj: modal.querySelector('#si-cnpj').value.trim(),
                expiry_date:   modal.querySelector('#si-expiry').value || null,
                location:      modal.querySelector('#si-location').value.trim(),
                notes:         modal.querySelector('#si-notes').value.trim()
            };

            try {
                await saveItem(data);
                modal.remove();
                const section = document.getElementById('aba-estoque');
                if (section) await render(section);
                Utils.showToast(isNew ? 'Item cadastrado!' : 'Item atualizado!', 'success');
            } catch (err) {
                statusEl.className = 'nfe-import-status error';
                statusEl.textContent = 'Erro: ' + (err.message || err);
                submitBtn.disabled   = false;
                submitBtn.textContent = isNew ? 'Cadastrar Item' : 'Salvar Alterações';
            }
        });
    }

    // ── MODAL MOVIMENTAÇÃO ────────────────────────────────────
    function openMovement(itemId, itemName, currentQty) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadeIn 0.2s ease;';

        modal.innerHTML = `
        <div style="background:var(--bg-card); border-radius:16px; padding:1.75rem; max-width:420px; width:100%; box-shadow:var(--shadow-lg);">
            <h3 style="margin:0 0 0.25rem 0;">Movimentação de Estoque</h3>
            <p style="color:var(--text-secondary); font-size:0.82rem; margin-bottom:1.25rem;">${itemName} · Atual: ${fmtNum(currentQty)}</p>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <div class="input-group">
                    <label>Tipo</label>
                    <select id="mov-type" style="padding:12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.9rem;">
                        <option value="in">Entrada (compra/recebimento)</option>
                        <option value="out">Saída (uso/descarte)</option>
                        <option value="adjustment">Ajuste (contagem física)</option>
                    </select>
                </div>
                <div class="input-group">
                    <label id="mov-qty-label">Quantidade</label>
                    <input type="number" id="mov-qty" min="0" step="0.001" value="" placeholder="0">
                </div>
                <div class="input-group">
                    <label>Motivo / Observação</label>
                    <input type="text" id="mov-reason" placeholder="Ex: Compra fornecedor, uso cirurgia...">
                </div>
                <div id="mov-status"></div>
                <div style="display:flex; gap:0.75rem; justify-content:flex-end; margin-top:0.5rem;">
                    <button id="btn-cancel-mov" style="padding:0.6rem 1.25rem; border:1px solid var(--border); border-radius:8px; background:transparent; color:var(--text-secondary); cursor:pointer;">Cancelar</button>
                    <button id="btn-confirm-mov" class="btn-primary" style="padding:0.6rem 1.5rem;">Confirmar</button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(modal);

        modal.querySelector('#mov-type')?.addEventListener('change', e => {
            const lbl = modal.querySelector('#mov-qty-label');
            if (lbl) lbl.textContent = e.target.value === 'adjustment' ? 'Nova Quantidade Total' : 'Quantidade';
        });

        modal.querySelector('#btn-cancel-mov')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        modal.querySelector('#btn-confirm-mov')?.addEventListener('click', async () => {
            const type   = modal.querySelector('#mov-type').value;
            const qty    = parseFloat(modal.querySelector('#mov-qty').value);
            const reason = modal.querySelector('#mov-reason').value.trim();
            const btn    = modal.querySelector('#btn-confirm-mov');
            const status = modal.querySelector('#mov-status');

            if (!qty || qty < 0) { status.className = 'nfe-import-status error'; status.textContent = 'Informe uma quantidade válida.'; return; }

            btn.disabled    = true;
            btn.textContent = 'Salvando...';
            try {
                await addMovement(itemId, type, qty, reason);
                modal.remove();
                const section = document.getElementById('aba-estoque');
                if (section) await render(section);
                Utils.showToast('Movimentação registrada!', 'success');
            } catch (err) {
                status.className   = 'nfe-import-status error';
                status.textContent = 'Erro: ' + (err.message || err);
                btn.disabled       = false;
                btn.textContent    = 'Confirmar';
            }
        });
    }

    async function confirmDelete(id, name, btn) {
        if (!confirm(`Desativar "${name}" do estoque? O item ficará oculto mas o histórico é mantido.`)) return;
        try {
            await deleteItem(id);
            const section = document.getElementById('aba-estoque');
            if (section) await render(section);
            Utils.showToast('Item desativado.', 'success');
        } catch (err) {
            Utils.showToast('Erro ao desativar: ' + err.message, 'error');
        }
    }

    // ── UTILS ─────────────────────────────────────────────────
    function _debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    // ── BADGE DE ALERTAS (Sidebar) ────────────────────────────
    async function updateSidebarBadge() {
        const btn = document.getElementById('tab-estoque');
        if (!btn) return;

        try {
            const { expired, expiring, low } = await fetchAlerts();
            const count = expired.length + expiring.length + low.length;

            let badge = btn.querySelector('.nav-alert-badge');
            if (count === 0) { badge?.remove(); return; }

            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-alert-badge';
                badge.style.cssText = 'margin-left:auto; min-width:18px; height:18px; display:flex; align-items:center; justify-content:center; border-radius:99px; font-size:0.65rem; font-weight:800; padding:0 4px; background:var(--color-danger); color:#fff;';
                btn.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        } catch { /* silencioso */ }
    }

    return {
        render,
        openItemModal,
        openMovement,
        confirmDelete,
        updateSidebarBadge,
        fetchAlerts
    };

})();

window.EstoqueModule = EstoqueModule;
