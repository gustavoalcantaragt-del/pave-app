// ============================================================
// clientes.js — Módulo de Cadastro de Clientes
// Fase 3 — Feature 3.2
// Escopo: CRUD de clientes + vínculo com lançamentos do Caixa
// FORA DE ESCOPO: prontuário, vacinação, histórico clínico
// ============================================================

const ClientesModule = (() => {

    // ── XSS ESCAPE ───────────────────────────────────────────────
    const _esc = s => (s == null ? '' : String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;'));

    // ── QUERIES ──────────────────────────────────────────────────

    async function fetchClients(orgId, search = '') {
        let query = _supabase
            .from('clients')
            .select('id, name, phone, email, pet_name, species, breed, created_at')
            .eq('organization_id', orgId)
            .order('name', { ascending: true });

        if (search.trim()) {
            query = query.or(
                `name.ilike.%${search}%,phone.ilike.%${search}%,pet_name.ilike.%${search}%`
            );
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async function fetchClientById(id) {
        const { data, error } = await _supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async function createClient(orgId, payload) {
        const user = Auth.getUser();
        const { data, error } = await _supabase
            .from('clients')
            .insert({ organization_id: orgId, user_id: user.id, ...payload })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function updateClient(id, payload) {
        const { data, error } = await _supabase
            .from('clients')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function deleteClient(id) {
        const { error } = await _supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
    }

    // ── FATURAMENTO POR CLIENTE (LTV BÁSICO) ─────────────────────

    async function fetchClientRevenue(orgId, startDate, endDate) {
        const { data, error } = await _supabase
            .from('cash_movements')
            .select('client_id, amount, clients(name)')
            .eq('organization_id', orgId)
            .eq('type', 'receita')
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .not('client_id', 'is', null);

        if (error) throw error;

        const byClient = {};
        (data || []).forEach(m => {
            const cid  = m.client_id;
            const name = m.clients?.name || 'Desconhecido';
            if (!byClient[cid]) byClient[cid] = { name, total: 0, qtd: 0 };
            byClient[cid].total += parseFloat(m.amount);
            byClient[cid].qtd++;
        });

        return Object.entries(byClient)
            .map(([id, d]) => ({
                id,
                name:        d.name,
                total:       d.total,
                qtd:         d.qtd,
                ticketMedio: d.qtd > 0 ? d.total / d.qtd : 0,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }

    // ── IMPORTAÇÃO CSV ────────────────────────────────────────────

    function parseClientCSV(csvText) {
        // Strip UTF-8 BOM and normalize line endings
        const normalized = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalized.trim().split('\n');
        if (lines.length < 2) throw new Error('CSV vazio ou sem dados além do cabeçalho.');

        return lines.slice(1).map((line, i) => {
            const cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
            if (!cols[0]) throw new Error(`Linha ${i + 2}: nome obrigatório.`);
            return { name: cols[0], phone: cols[1] || null, email: cols[2] || null };
        }).filter(c => c.name);
    }

    async function importClientsFromCSV(orgId, csvText) {
        const user    = Auth.getUser();
        const clients = parseClientCSV(csvText);
        const rows    = clients.map(c => ({ organization_id: orgId, user_id: user.id, ...c }));
        const { data, error } = await _supabase.from('clients').insert(rows).select('id, name');
        if (error) throw error;
        return data;
    }

    // ── RENDER PRINCIPAL DA ABA ───────────────────────────────────

    async function renderClientesTab(container) {
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) {
            container.innerHTML = `<div class="card"><p style="color:var(--text-muted);text-align:center;padding:2rem;">Configuração da organização não encontrada. Acesse <b>Configurações</b> para cadastrar sua clínica.</p></div>`;
            return;
        }

        container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; gap:0.75rem; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px; position:relative;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-muted); pointer-events:none;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" id="clients-search" placeholder="Buscar por nome, telefone ou pet..."
                    style="width:100%; padding:0.5rem 0.75rem 0.5rem 2rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
            </div>
            <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                <label style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; padding:0.45rem 0.875rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-secondary); font-size:0.8rem; font-weight:600; font-family:var(--font-family);" title="Importar CSV: nome;telefone;email">
                    ↑ Importar CSV
                    <input type="file" id="clients-csv-input" accept=".csv" style="display:none">
                </label>
                <button id="btn-new-client" style="padding:0.45rem 1rem; border-radius:var(--radius-sm); border:none; background:var(--accent-blue); color:#fff; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:var(--font-family);">+ Novo Cliente</button>
            </div>
        </div>
        <div id="clients-list-container"></div>
        `;

        let debounceTimer;
        let _loadReqId = 0;

        async function loadClients(search = '') {
            const reqId = ++_loadReqId;
            const listEl = container.querySelector('#clients-list-container');
            listEl.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:1rem; font-size:0.85rem;">Carregando...</p>`;
            try {
                const clients = await fetchClients(orgId, search);
                if (reqId !== _loadReqId) return; // resposta obsoleta — ignorar
                renderClientList(listEl, clients, orgId);
            } catch (err) {
                if (reqId !== _loadReqId) return;
                listEl.innerHTML = `<p style="color:var(--color-danger); padding:1rem;">Erro ao carregar: ${err.message}</p>`;
            }
        }

        container.querySelector('#clients-search').addEventListener('input', e => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => loadClients(e.target.value), 350);
        });

        container.querySelector('#btn-new-client').addEventListener('click', () => {
            openClientModal(container, orgId, null, loadClients);
        });

        container.querySelector('#clients-csv-input').addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                const imported = await importClientsFromCSV(orgId, text);
                if (window.Utils) Utils.showToast(`${imported.length} cliente(s) importado(s)!`, 'success');
                loadClients();
            } catch (err) {
                if (window.Utils) Utils.showToast('Erro na importação: ' + err.message, 'error');
            }
            e.target.value = '';
        });

        loadClients();
    }

    const SPECIES_EMOJI = { 'cão': '🐕', 'gato': '🐈', 'ave': '🐦', 'réptil': '🦎', 'outro': '🐾' };

    function renderClientList(container, clients, orgId) {
        if (!clients.length) {
            container.innerHTML = `
            <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3; margin-bottom:0.75rem;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <p style="font-size:0.9rem; font-weight:600; margin:0 0 4px;">Nenhum cliente encontrado</p>
                <p style="font-size:0.78rem; margin:0;">Clique em "Novo Cliente" para adicionar ou use a importação CSV.</p>
            </div>`;
            return;
        }

        container.innerHTML = `
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.75rem;">${clients.length} cliente(s)</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:0.75rem;">
        ${clients.map(c => `
            <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:0.875rem 1rem; background:var(--bg-elevated); border-radius:var(--radius-md); border:1px solid var(--border); transition:background 0.12s; cursor:default;"
                 onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background='var(--bg-elevated)'">
                <div style="width:38px; height:38px; border-radius:50%; flex-shrink:0; background:rgba(10,132,255,0.12); color:var(--accent-blue); display:flex; align-items:center; justify-content:center; font-size:1rem; font-weight:700;">
                    ${_esc((c.name || '?').charAt(0).toUpperCase())}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${_esc(c.name)}</div>
                    ${c.pet_name ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">${SPECIES_EMOJI[c.species] || '🐾'} ${_esc(c.pet_name)}${c.breed ? ` <span style="color:var(--text-muted);">(${_esc(c.breed)})</span>` : ''}</div>` : ''}
                    ${c.phone ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">📞 ${_esc(c.phone)}</div>` : ''}
                    ${c.email ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:1px;">✉ ${_esc(c.email)}</div>` : ''}
                </div>
                <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0;">
                    <button data-edit-id="${c.id}" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:3px; font-size:0.78rem;" title="Editar" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='var(--text-muted)'">✏</button>
                    <button data-del-id="${c.id}" data-del-name="${_esc(c.name)}" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:3px; font-size:0.78rem;" title="Excluir" onmouseover="this.style.color='var(--color-danger)'" onmouseout="this.style.color='var(--text-muted)'">🗑</button>
                </div>
            </div>`).join('')}
        </div>`;

        container.querySelectorAll('[data-edit-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const client = await fetchClientById(btn.dataset.editId);
                    const modalContainer = btn.closest('[id^="aba-"]') || document.body;
                    openClientModal(modalContainer.parentElement || document.body, orgId, client, () => {
                        const search = document.getElementById('clients-search')?.value || '';
                        loadClients(search);
                    });
                } catch (err) {
                    if (window.Utils) Utils.showToast('Erro ao carregar cliente.', 'error');
                }
            });
        });

        container.querySelectorAll('[data-del-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm(`Excluir "${btn.dataset.delName}"? Lançamentos vinculados não serão excluídos.`)) return;
                deleteClient(btn.dataset.delId).then(() => {
                    const search = document.getElementById('clients-search')?.value || '';
                    loadClients(search);
                    if (window.Utils) Utils.showToast('Cliente removido.', 'success');
                }).catch(err => {
                    if (window.Utils) Utils.showToast('Erro ao excluir: ' + err.message, 'error');
                });
            });
        });

        // inner reference for edit callbacks
        function loadClients(search) {
            fetchClients(orgId, search || '').then(updated => renderClientList(container, updated, orgId));
        }
    }

    // ── MODAL DE CLIENTE ──────────────────────────────────────────

    function openClientModal(pageContainer, orgId, client, onSuccess) {
        const isEdit  = !!client;
        const species = ['cão', 'gato', 'ave', 'réptil', 'outro'];

        // Remove any existing modal
        document.getElementById('pave-client-modal')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'pave-client-modal';
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem;';

        overlay.innerHTML = `
        <div style="background:var(--bg-surface); border-radius:var(--radius-card); border:1px solid var(--border); width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg);">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:1.25rem 1.5rem; border-bottom:1px solid var(--border);">
                <h3 style="margin:0; font-size:1rem; font-weight:700; color:var(--text-primary);">${isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <button id="btn-close-client-modal" style="background:none; border:none; font-size:1.25rem; cursor:pointer; color:var(--text-muted); line-height:1; padding:2px 6px;" title="Fechar">✕</button>
            </div>
            <form id="client-form" style="padding:1.5rem;">
                <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:0.75rem;">Tutor</div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block; font-size:0.78rem; color:var(--text-secondary); margin-bottom:4px; font-weight:600;">Nome *</label>
                    <input type="text" name="name" value="${client?.name || ''}" required
                        style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
                    <div>
                        <label style="display:block; font-size:0.78rem; color:var(--text-secondary); margin-bottom:4px; font-weight:600;">Telefone</label>
                        <input type="tel" name="phone" value="${client?.phone || ''}" placeholder="(00) 00000-0000"
                            style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.78rem; color:var(--text-secondary); margin-bottom:4px; font-weight:600;">E-mail</label>
                        <input type="email" name="email" value="${client?.email || ''}"
                            style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
                    </div>
                </div>
                <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:0.75rem; margin-top:1.25rem;">Pet</div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block; font-size:0.78rem; color:var(--text-secondary); margin-bottom:4px; font-weight:600;">Nome do Pet</label>
                    <input type="text" name="pet_name" value="${client?.pet_name || ''}"
                        style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
                    <div>
                        <label style="display:block; font-size:0.78rem; color:var(--text-secondary); margin-bottom:4px; font-weight:600;">Espécie</label>
                        <select name="species" style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-secondary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
                            <option value="">Selecionar...</option>
                            ${species.map(s => `<option value="${s}" ${client?.species === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.78rem; color:var(--text-secondary); margin-bottom:4px; font-weight:600;">Raça</label>
                        <input type="text" name="breed" value="${client?.breed || ''}"
                            style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; box-sizing:border-box;">
                    </div>
                </div>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block; font-size:0.78rem; color:var(--text-secondary); margin-bottom:4px; font-weight:600;">Observações</label>
                    <textarea name="notes" rows="2" style="width:100%; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:var(--font-family); outline:none; resize:vertical; box-sizing:border-box;">${client?.notes || ''}</textarea>
                </div>
                <div id="client-form-error" style="color:var(--color-danger); font-size:0.78rem; margin-bottom:0.75rem; display:none;"></div>
                <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
                    <button type="button" id="btn-cancel-client" style="padding:0.5rem 1.25rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-secondary); font-size:0.875rem; cursor:pointer; font-family:var(--font-family);">Cancelar</button>
                    <button type="submit" id="btn-submit-client" style="padding:0.5rem 1.25rem; border-radius:var(--radius-sm); border:none; background:var(--accent-blue); color:#fff; font-size:0.875rem; font-weight:700; cursor:pointer; font-family:var(--font-family);">${isEdit ? 'Salvar' : 'Criar Cliente'}</button>
                </div>
            </form>
        </div>`;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#btn-close-client-modal').addEventListener('click', close);
        overlay.querySelector('#btn-cancel-client').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        overlay.querySelector('#client-form').addEventListener('submit', async e => {
            e.preventDefault();
            const fd      = new FormData(e.target);
            const payload = {
                name:     fd.get('name'),
                phone:    fd.get('phone')    || null,
                email:    fd.get('email')    || null,
                pet_name: fd.get('pet_name') || null,
                species:  fd.get('species')  || null,
                breed:    fd.get('breed')    || null,
                notes:    fd.get('notes')    || null,
            };

            const btn = overlay.querySelector('#btn-submit-client');
            const errEl = overlay.querySelector('#client-form-error');
            btn.disabled = true;
            btn.textContent = 'Salvando...';
            errEl.style.display = 'none';

            try {
                if (isEdit) { await updateClient(client.id, payload); }
                else        { await createClient(orgId, payload); }
                close();
                onSuccess();
                if (window.Utils) Utils.showToast(isEdit ? 'Cliente atualizado!' : 'Cliente criado!', 'success');
            } catch (err) {
                btn.disabled = false;
                btn.textContent = isEdit ? 'Salvar' : 'Criar Cliente';
                errEl.textContent = '⚠ ' + err.message;
                errEl.style.display = 'block';
            }
        });
    }

    // ── SELETOR DE CLIENTE (usado no Caixa Diário) ────────────────

    async function renderClientSelector(selectEl, selectedId = null) {
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) return;
        const clients = await fetchClients(orgId);
        selectEl.innerHTML = `
            <option value="">Sem cliente vinculado</option>
            ${clients.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}${c.pet_name ? ` — ${c.pet_name}` : ''}</option>`).join('')}
        `;
    }

    // ── EXPORT PÚBLICO ────────────────────────────────────────────

    return {
        renderClientesTab,
        renderClientSelector,
        fetchClientRevenue,
        fetchClients,
    };

})();

window.ClientesModule = ClientesModule;
window.renderClientes = ClientesModule.renderClientesTab;
