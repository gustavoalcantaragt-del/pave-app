// ============================================================
// PAVE — API Client (Supabase)
// Substitui o backend Express/SQLite por Supabase
// ============================================================

// ── Cliente Supabase ─────────────────────────────────────────
const _supabase = supabase.createClient(
    PAV_CONFIG.SUPABASE_URL,
    PAV_CONFIG.SUPABASE_ANON_KEY
);

// ── Sync Queue — operações que falharam e precisam ser reenviadas ────────────
const _SyncQueue = {
    _key: 'pav_sync_queue',

    push(entry) {
        try {
            const q = JSON.parse(localStorage.getItem(this._key) || '[]');
            q.push({ ...entry, ts: Date.now() });
            if (q.length > 50) q.splice(0, q.length - 50);
            localStorage.setItem(this._key, JSON.stringify(q));
        } catch(e) {}
    },

    size() {
        try { return JSON.parse(localStorage.getItem(this._key) || '[]').length; } catch { return 0; }
    },

    async flush() {
        if (!navigator.onLine) return;
        try {
            const q = JSON.parse(localStorage.getItem(this._key) || '[]');
            if (q.length === 0) return;
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) return;
            if (window._SyncUI) _SyncUI.showPending(q.length);
            const failed = [];
            for (const entry of q) {
                try {
                    if (entry.type === 'cash_movement') {
                        const mov = CashAPI.getLocal().find(m => m.id === entry.id);
                        if (mov) await CashAPI.upsertMovimento(mov);
                    } else if (entry.type === 'financial_entry') {
                        const dados = FinancialAPI.getUltimosDados();
                        if (dados) await FinancialAPI.save(dados);
                    }
                } catch(e) { failed.push(entry); }
            }
            localStorage.setItem(this._key, JSON.stringify(failed));
            const synced = q.length - failed.length;
            if (synced > 0 && window._SyncUI) _SyncUI.showSynced(synced);
            else if (window._SyncUI) _SyncUI.hide();
        } catch(e) {}
    }
};

// Tenta reenviar fila ao reconectar e quando tab volta ao foco
window.addEventListener('online', () => _SyncQueue.flush());
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && (typeof Auth !== 'undefined') && Auth.isAuthenticated()) {
        if (_SyncQueue.size() > 0) _SyncQueue.flush();
        if (typeof CloudPull !== 'undefined') CloudPull.runIfStale();
    }
});

// ── UUID v4 — usa crypto.randomUUID se disponível ────────────
function _genUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback RFC-4122 v4 para browsers antigos
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
window._genUUID = _genUUID;

// ── Storage Keys (localStorage — cache local) ────────────────
const STORAGE_KEYS = {
    USER:          'pav_user',
    ORG:           'pav_org_id',
    HISTORICO:     'pav_historico',
    ULTIMOS_DADOS: 'pav_ultimos_dados',
    SERVICOS:      'pav_servicos',
    CAIXA:         'pav_caixa_movimentos',
    DIVISAO:       'pav_divisao_lucro',
    MIGRATED:      'pav_migrated'
};

// ── AUTH ─────────────────────────────────────────────────────
const Auth = {

    async login(email, password) {
        try {
            const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) return { ok: false, error: error.message };
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ email, id: data.user.id }));
            return { ok: true, data };
        } catch (e) {
            return { ok: false, error: 'Erro de conexão com o servidor' };
        }
    },

    async register(email, password) {
        try {
            const redirectTo = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}email-confirmado.html`;
            const { data, error } = await _supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: redirectTo }
            });
            if (error) return { ok: false, error: error.message };
            return { ok: true, data };
        } catch (e) {
            return { ok: false, error: 'Erro de conexão com o servidor' };
        }
    },

    async resetPassword(email) {
        try {
            const redirectTo = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}email-confirmado.html`;
            const { error } = await _supabase.auth.resetPasswordForEmail(email, {
                redirectTo
            });
            if (error) return { ok: false, error: error.message };
            return { ok: true };
        } catch (e) {
            return { ok: false, error: 'Erro de conexão' };
        }
    },

    async logout() {
        await _supabase.auth.signOut();
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.ORG);
        window.location.href = 'login.html';
    },

    async getSession() {
        const { data } = await _supabase.auth.getSession();
        return data?.session || null;
    },

    isAuthenticated() {
        return !!localStorage.getItem(STORAGE_KEYS.USER);
    },

    getUser() {
        const u = localStorage.getItem(STORAGE_KEYS.USER);
        return u ? JSON.parse(u) : null;
    },

    onAuthStateChange(callback) {
        return _supabase.auth.onAuthStateChange(callback);
    }
};

// ── ORGANIZATIONS ─────────────────────────────────────────────
const OrgAPI = {

    async create(clinicaData) {
        const user = Auth.getUser();
        if (!user) return { ok: false, error: 'Não autenticado' };
        try {
            const { data, error } = await _supabase
                .from('organizations')
                .insert({
                    owner_id:    user.id,
                    name:        clinicaData.nome,
                    cnpj:        clinicaData.cnpj        || null,
                    crmv:        clinicaData.crmv        || null,
                    city:        clinicaData.cidade      || null,
                    state:       clinicaData.estado      || null,
                    responsible: clinicaData.responsavel || null,
                    tax_regime:  clinicaData.regime      || 'simples',
                    employees:   clinicaData.funcionarios || 0,
                    work_days:   clinicaData.diasSemana  || 22,
                    phone:       clinicaData.telefone    || null,
                    address:     clinicaData.endereco    || null
                })
                .select('id')
                .single();
            if (error) return { ok: false, error: error.message };
            localStorage.setItem(STORAGE_KEYS.ORG, data.id);
            return { ok: true, id: data.id };
        } catch (e) {
            return { ok: false, error: 'Erro de conexão' };
        }
    },

    async update(clinicaData) {
        const user = Auth.getUser();
        if (!user) return { ok: false, error: 'Não autenticado' };
        try {
            const { error } = await _supabase
                .from('organizations')
                .update({
                    name:        clinicaData.nome,
                    cnpj:        clinicaData.cnpj        || null,
                    crmv:        clinicaData.crmv        || null,
                    city:        clinicaData.cidade      || null,
                    state:       clinicaData.estado      || null,
                    responsible: clinicaData.responsavel || null,
                    tax_regime:  clinicaData.regime      || 'simples',
                    phone:       clinicaData.telefone    || null,
                    address:     clinicaData.endereco    || null
                })
                .eq('owner_id', user.id);
            if (error) return { ok: false, error: error.message };
            return { ok: true };
        } catch (e) {
            return { ok: false, error: 'Erro de conexão' };
        }
    },

    async get() {
        const user = Auth.getUser();
        if (!user) return null;
        try {
            const { data, error } = await _supabase
                .from('organizations')
                .select('*')
                .eq('owner_id', user.id)
                .single();
            if (error || !data) return null;
            localStorage.setItem(STORAGE_KEYS.ORG, data.id);
            return data;
        } catch (e) {
            return null;
        }
    },

    async getOrgId() {
        const cached = localStorage.getItem(STORAGE_KEYS.ORG);
        if (cached) return cached;
        const org = await OrgAPI.get();
        return org ? org.id : null;
    }
};

// ── FINANCIAL ENTRIES (Balanço Mensal) ───────────────────────
const FinancialAPI = {

    async save(dados) {
        // Salva localmente SEMPRE (funciona offline)
        localStorage.setItem(STORAGE_KEYS.ULTIMOS_DADOS, JSON.stringify(dados));

        const totais = window.calcularTotais ? window.calcularTotais(dados) : {};
        const historico = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICO) || '[]');
        // Normaliza para YYYY-MM independente do formato recebido (date retorna YYYY-MM-DD, month retorna YYYY-MM)
        const mesRef = (dados.mesReferencia || '').substring(0, 7);
        dados.mesReferencia = mesRef; // garante consistência no dado salvo
        const label = mesRef ? `${mesRef.split('-')[1]}/${mesRef.split('-')[0]}` : mesRef;
        const idx = historico.findIndex(h => (h.mesRef || '').substring(0, 7) === mesRef);
        const entry = { mesRef, label, faturamento: dados.faturamento, lucro: totais.lucroGerencial || 0, date: new Date().toISOString() };
        if (idx >= 0) historico[idx] = entry; else historico.push(entry);
        localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(historico));

        // Sincroniza com Supabase (não bloqueante — falha silenciosamente)
        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) return { ok: true, local: true };
            const user = Auth.getUser();
            const refDate = mesRef && mesRef.length === 7 ? mesRef + '-01' : (mesRef || new Date().toISOString().substring(0, 10));

            await _supabase
                .from('financial_entries')
                .upsert({
                    organization_id: orgId,
                    user_id:         user.id,
                    reference_date:  refDate,
                    data:            dados,
                    totals:          totais
                }, { onConflict: 'organization_id,reference_date' });
        } catch (e) {
            console.warn('[SYNC] FinancialAPI.save falhou — dado salvo localmente, tentará reenviar.', e?.message);
            _SyncQueue.push({ type: 'financial_entry', mesRef, ts: Date.now() });
        }

        return { ok: true, local: true };
    },

    async list() {
        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICO) || '[]');

            const { data, error } = await _supabase
                .from('financial_entries')
                .select('*')
                .eq('organization_id', orgId)
                .order('reference_date', { ascending: true });

            if (error || !data || data.length === 0)
                return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICO) || '[]');

            return data.map(e => ({
                mesRef:      e.reference_date?.substring(0, 7),
                label:       e.reference_date ? e.reference_date.split('-').slice(0, 2).reverse().join('/') : '',
                faturamento: e.data?.faturamento || 0,
                lucro:       e.totals?.lucroGerencial || 0,
                date:        e.created_at
            }));
        } catch (e) {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICO) || '[]');
        }
    },

    getUltimosDados() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.ULTIMOS_DADOS);
            return raw ? JSON.parse(raw) : null;
        } catch(e) {
            console.error('[API] pav_ultimos_dados corrompido — limpando.', e);
            localStorage.removeItem(STORAGE_KEYS.ULTIMOS_DADOS);
            return null;
        }
    }
};

// ── CASH MOVEMENTS (Caixa Diário) ────────────────────────────
const CashAPI = {

    async upsertMovimento(mov) {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAIXA) || '[]');
        const idx = local.findIndex(m => m.id === mov.id);
        if (idx >= 0) local[idx] = mov; else local.push(mov);
        localStorage.setItem(STORAGE_KEYS.CAIXA, JSON.stringify(local));

        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) return { ok: true, local: true };
            const user = Auth.getUser();
            await _supabase.from('cash_movements').upsert({
                id:               mov.id,
                organization_id:  orgId,
                user_id:          user.id,
                description:      mov.descricao,
                amount:           mov.valor,
                due_date:         mov.vencimento,
                type:             mov.tipo,
                category:         mov.categoria     || null,
                payment_method:   mov.formaPag       || 'outros',
                notes:            mov.observacao     || null,
                status:           mov.status         || 'pendente',
                is_recurring:     mov.isRecurring    || false,
                recurrence_group: mov.recurrenceGroup || null,
                client_id:        mov.clienteId      || null,
                bill_id:          mov.billId          || null,
                service_id:       mov.serviceId       || null
            }, { onConflict: 'id' });
            localStorage.setItem('pav_local_ts', String(Date.now()));
        } catch (e) {
            console.warn('[SYNC] CashAPI.upsertMovimento falhou — dado salvo localmente.', e?.message);
            _SyncQueue.push({ type: 'cash_movement', id: mov.id });
        }

        if (window.PaveEvents) {
            PaveEvents.emit('pave:caixa-updated', {
                mes:  mov.vencimento?.substring(0, 7) || null,
                tipo: mov.tipo || null
            });
        }

        return { ok: true };
    },

    async deleteMovimento(id) {
        let local = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAIXA) || '[]');
        const deletado = local.find(m => m.id === id);
        local = local.filter(m => m.id !== id);
        localStorage.setItem(STORAGE_KEYS.CAIXA, JSON.stringify(local));

        try {
            const orgId = await OrgAPI.getOrgId();
            if (orgId) await _supabase.from('cash_movements').delete().eq('id', id).eq('organization_id', orgId);
        } catch (e) {
            console.warn('[SYNC] CashAPI.deleteMovimento falhou — removido localmente.', e?.message);
        }

        if (window.PaveEvents) {
            PaveEvents.emit('pave:caixa-updated', {
                mes:  deletado?.vencimento?.substring(0, 7) || null,
                tipo: deletado?.tipo || null
            });
        }

        return { ok: true };
    },

    getLocal() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CAIXA) || '[]');
    }
};

// ── SERVICES (Catálogo de Precificação) ──────────────────────
const ServicesAPI = {

    async save(servico) {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICOS) || '[]');
        const idx = local.findIndex(s => s.id === servico.id);
        if (idx >= 0) local[idx] = servico; else local.push(servico);
        localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(local));

        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) return { ok: true, local: true };
            const user = Auth.getUser();
            await _supabase.from('services').upsert({
                id:              servico.id,
                organization_id: orgId,
                user_id:         user.id,
                name:            servico.nome,
                price:           servico.preco,
                total_cost:      servico.custoTotal,
                profit:          servico.lucro,
                margin:          servico.margem,
                is_combo:        servico.isCombo    || false,
                combo_items:     servico.comboItens || []
            }, { onConflict: 'id' });
        } catch (e) { console.warn('[ServicesAPI] sync failed (save):', e?.message); }

        return { ok: true };
    },

    async delete(id) {
        let local = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICOS) || '[]');
        local = local.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(local));

        try {
            const orgId = await OrgAPI.getOrgId();
            if (orgId) await _supabase.from('services').delete().eq('id', id).eq('organization_id', orgId);
        } catch (e) { console.warn('[ServicesAPI] sync failed (delete):', e?.message); }

        return { ok: true };
    },

    getLocal() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICOS) || '[]');
    }
};

// ── SUBSCRIPTION ─────────────────────────────────────────────
const SubscriptionAPI = {

    async get() {
        const user = Auth.getUser();
        if (!user) return null;
        try {
            const { data } = await _supabase
                .from('subscriptions')
                .select('*, plans(name, display_name, features)')
                .eq('user_id', user.id)
                .single();
            return data || null;
        } catch (e) { return null; }
    },

    async getStatus() {
        const sub = await SubscriptionAPI.get();
        if (!sub) return { status: 'none' };
        if (sub.status === 'trial') {
            const now = new Date();
            const trialEnd = new Date(sub.trial_ends_at);
            const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / 86400000));
            return { status: 'trial', daysLeft, trialEndsAt: sub.trial_ends_at, plan: sub.plans };
        }
        return { status: sub.status, plan: sub.plans };
    }
};

// ── SYNC HELPER (localStorage → Supabase, primeira vez) ──────
const SyncHelper = {

    async run() {
        if (localStorage.getItem(STORAGE_KEYS.MIGRATED)) return;
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) return;

        let migrated = 0;

        // Migrar último balanço
        const ultimos = localStorage.getItem(STORAGE_KEYS.ULTIMOS_DADOS);
        if (ultimos) {
            try {
                const dados = JSON.parse(ultimos);
                if (dados.mesReferencia) { await FinancialAPI.save(dados); migrated++; }
            } catch (e) {}
        }

        // Migrar movimentações de caixa
        const caixa = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAIXA) || '[]');
        for (const mov of caixa) {
            try { await CashAPI.upsertMovimento(mov); migrated++; } catch (e) {}
        }

        // Migrar serviços
        const servicos = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICOS) || '[]');
        for (const srv of servicos) {
            try { await ServicesAPI.save(srv); migrated++; } catch (e) {}
        }

        localStorage.setItem(STORAGE_KEYS.MIGRATED, 'true');
        if (migrated > 0) console.log(`[PAVE] ${migrated} registros sincronizados com Supabase.`);
    }
};

// ── PULL FROM CLOUD → localStorage (para conta nova ou dispositivo novo) ─────
const CloudPull = {

    // Verifica se dados remotos são mais recentes que os locais
    async runIfStale() {
        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) return false;
            const localTs = parseInt(localStorage.getItem('pav_local_ts') || '0', 10);
            const { data } = await _supabase
                .from('monthly_summaries')
                .select('last_updated')
                .eq('organization_id', orgId)
                .order('last_updated', { ascending: false })
                .limit(1)
                .single();
            if (!data) return false;
            const remoteTs = new Date(data.last_updated).getTime();
            if (remoteTs > localTs + 5000) { // 5s de tolerância
                if (window._SyncUI) _SyncUI.showSyncing();
                await this.run(true);
                return true;
            }
            return false;
        } catch { return false; }
    },

    async run(force = false) {
        const pullKey = 'pav_cloud_pulled_at';
        const lastPull = parseInt(localStorage.getItem(pullKey) || '0', 10);
        const ONE_DAY  = 24 * 60 * 60 * 1000;
        if (!force && Date.now() - lastPull < ONE_DAY) return; // sincronizou recentemente

        const orgId = await OrgAPI.getOrgId();
        if (!orgId) return;
        const user = Auth.getUser();
        if (!user) return;

        try {
            // Financial entries → pav_historico + pav_ultimos_dados
            const { data: entries } = await _supabase
                .from('financial_entries')
                .select('reference_date, data, totals')
                .eq('organization_id', orgId)
                .order('reference_date', { ascending: true });

            if (entries && entries.length > 0) {
                const historico = entries.map(e => ({
                    mesRef:      e.reference_date?.substring(0, 7),
                    label:       e.reference_date?.substring(0, 7),
                    faturamento: e.data?.faturamento || 0,
                    lucro:       e.totals?.lucroGerencial || 0,
                    date:        e.reference_date
                }));
                localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(historico));
                // Último dado = mais recente
                const last = entries[entries.length - 1];
                if (last?.data) {
                    localStorage.setItem(STORAGE_KEYS.ULTIMOS_DADOS, JSON.stringify(last.data));
                }
            }

            // Cash movements → pav_caixa_movimentos
            const { data: movs } = await _supabase
                .from('cash_movements')
                .select('*')
                .eq('organization_id', orgId)
                .order('due_date', { ascending: false })
                .limit(500);

            if (movs && movs.length > 0) {
                const local = movs.map(m => ({
                    id:            m.id,
                    descricao:     m.description,
                    valor:         parseFloat(m.amount),
                    vencimento:    m.due_date,
                    tipo:          m.type,
                    categoria:     m.category || '',
                    formaPag:      m.payment_method || 'outros',
                    observacao:    m.notes || '',
                    status:        m.status || 'pendente',
                    isRecurring:   m.is_recurring || false,
                    clienteId:     m.client_id  || null,
                    billId:        m.bill_id    || null,
                    serviceId:     m.service_id || null
                }));
                localStorage.setItem(STORAGE_KEYS.CAIXA, JSON.stringify(local));
            }

            // Services → pav_servicos
            const { data: svcs } = await _supabase
                .from('services')
                .select('*')
                .eq('organization_id', orgId);

            if (svcs && svcs.length > 0) {
                const local = svcs.map(s => ({
                    id:          s.id,
                    nome:        s.name,
                    preco:       parseFloat(s.price || 0),
                    custoTotal:  parseFloat(s.total_cost || 0),
                    lucro:       parseFloat(s.profit || 0),
                    margem:      parseFloat(s.margin || 0),
                    isCombo:     s.is_combo || false,
                    comboItens:  s.combo_items || [],
                    goalQty:     s.monthly_goal_qty || null,
                    goalRevenue: parseFloat(s.monthly_goal_revenue || 0) || null
                }));
                localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(local));
            }

            // Profit config → pav_divisao_lucro
            const { data: pcfg } = await _supabase
                .from('profit_config')
                .select('pro_labore_pct, investments_pct, reserve_pct')
                .eq('organization_id', orgId)
                .single();

            if (pcfg) {
                localStorage.setItem(STORAGE_KEYS.DIVISAO, JSON.stringify({
                    proLabore:    pcfg.pro_labore_pct,
                    investimentos: pcfg.investments_pct,
                    reserva:      pcfg.reserve_pct
                }));
            }

            // Organization config → pav_clinica (used by renderConfig)
            const org = await OrgAPI.get();
            if (org) {
                localStorage.setItem('pav_clinica', JSON.stringify({
                    nome:        org.name        || '',
                    cnpj:        org.cnpj        || '',
                    crmv:        org.crmv        || '',
                    responsavel: org.responsible || '',
                    telefone:    org.phone       || '',
                    endereco:    org.address     || '',
                    regime:      org.tax_regime  || 'simples'
                }));
            }

            const now = String(Date.now());
            localStorage.setItem(pullKey, now);
            localStorage.setItem('pav_local_ts', now);
            console.log('[PAVE] Dados carregados da nuvem para o dispositivo.');
            if (window._SyncUI) _SyncUI.showSynced(1);
        } catch (e) {
            console.warn('[PAVE] CloudPull falhou (silencioso):', e);
        }
    }
};

// ── MONTHLY SUMMARIES (calculado automaticamente a partir do Caixa) ──────────
const MonthlySummaryAPI = {

    async getForMonth(mesRef) {
        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) return null;
            const refMonth = (mesRef || new Date().toISOString().substring(0, 7)) + '-01';
            const { data, error } = await _supabase
                .from('monthly_summaries')
                .select('*')
                .eq('organization_id', orgId)
                .eq('reference_month', refMonth)
                .single();
            return error ? null : data;
        } catch { return null; }
    },

    async getHistory(limitRows = 12) {
        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) return [];
            const { data } = await _supabase
                .from('monthly_summaries')
                .select('reference_month, revenue, total_costs, net_profit, movements_count')
                .eq('organization_id', orgId)
                .order('reference_month', { ascending: true })
                .limit(limitRows);
            return data || [];
        } catch { return []; }
    }
};
window.MonthlySummaryAPI = MonthlySummaryAPI;

// ── REALTIME ──────────────────────────────────────────────────────────────────
// Escuta mudanças em cash_movements e bills para o org do usuário logado.
// Atualiza localStorage e dispara re-render nas abas abertas sem reload.
const RealtimeModule = {
    _channel: null,

    async start() {
        if (this._channel) return; // já ativo

        const orgId = await OrgAPI.getOrgId();
        if (!orgId) return;

        this._channel = _supabase
            .channel(`pave-org-${orgId}`)
            .on('postgres_changes', {
                event:  '*',
                schema: 'public',
                table:  'cash_movements',
                filter: `organization_id=eq.${orgId}`
            }, async (payload) => {
                console.log('[Realtime] cash_movements:', payload.eventType);
                // Resync localStorage from Supabase (lightweight — 500 movimentos mais recentes)
                try {
                    const { data: movs } = await _supabase
                        .from('cash_movements').select('*')
                        .eq('organization_id', orgId)
                        .order('due_date', { ascending: false }).limit(500);
                    if (movs) {
                        const local = movs.map(m => ({
                            id:          m.id,
                            descricao:   m.description,
                            valor:       parseFloat(m.amount),
                            vencimento:  m.due_date,
                            tipo:        m.type,
                            categoria:   m.category       || '',
                            formaPag:    m.payment_method || 'outros',
                            observacao:  m.notes          || '',
                            status:      m.status         || 'pendente',
                            isRecurring: m.is_recurring   || false,
                            clienteId:   m.client_id      || null,
                            billId:      m.bill_id        || null,
                            serviceId:   m.service_id     || null
                        }));
                        localStorage.setItem(STORAGE_KEYS.CAIXA, JSON.stringify(local));
                    }
                } catch(e) { console.warn('[Realtime] pull cash_movements falhou:', e); }
                if (window.PaveEvents) PaveEvents.emit('pave:caixa-updated', { mes: null });
                if (window.renderCaixa)     window.renderCaixa();
                if (window.renderDashboard) window.renderDashboard();
            })
            .on('postgres_changes', {
                event:  '*',
                schema: 'public',
                table:  'bills',
                filter: `organization_id=eq.${orgId}`
            }, (payload) => {
                console.log('[Realtime] bills:', payload.eventType);
                if (window.renderBills) window.renderBills();
                if (window.NotificationsModule) NotificationsModule.refresh();
            })
            .subscribe((status) => {
                console.log('[Realtime] status:', status);
            });
    },

    stop() {
        if (this._channel) {
            _supabase.removeChannel(this._channel);
            this._channel = null;
        }
    }
};

window.RealtimeModule = RealtimeModule;

// ── SYNC UI — banner fino de status de sincronização ─────────────────────────
const _SyncUI = {
    _el:    null,
    _timer: null,

    _getEl() {
        if (!this._el) {
            this._el = document.createElement('div');
            this._el.id = 'pave-sync-banner';
            Object.assign(this._el.style, {
                position:      'fixed',
                top:           'var(--topbar-height, 56px)',
                left:          '0',
                right:         '0',
                zIndex:        '999',
                padding:       '5px 16px',
                fontSize:      '0.76rem',
                fontWeight:    '600',
                textAlign:     'center',
                letterSpacing: '0.3px',
                transition:    'opacity 0.4s',
                display:       'none',
                opacity:       '0'
            });
            document.body.appendChild(this._el);
        }
        return this._el;
    },

    _show(msg, bg, color, border, autohide = 0) {
        const el = this._getEl();
        el.textContent = msg;
        el.style.background   = bg;
        el.style.color        = color;
        el.style.borderBottom = `1px solid ${border}`;
        el.style.display      = 'block';
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        clearTimeout(this._timer);
        if (autohide > 0) this._timer = setTimeout(() => this.hide(), autohide);
    },

    showPending(count) {
        this._show(
            `⚠ ${count} operação${count > 1 ? 'ões' : ''} pendente${count > 1 ? 's' : ''} — sincronizando...`,
            'rgba(255,149,0,0.12)', '#ff9500', 'rgba(255,149,0,0.3)'
        );
    },

    showSyncing() {
        this._show(
            '↻ Sincronizando dados da nuvem...',
            'rgba(10,132,255,0.09)', 'var(--accent-blue, #0a84ff)', 'rgba(10,132,255,0.2)'
        );
    },

    showSynced(count) {
        const label = count > 1 ? `${count} registros sincronizados` : 'Dados atualizados';
        this._show(
            `✓ ${label}`,
            'rgba(29,158,117,0.09)', '#1D9E75', 'rgba(29,158,117,0.2)',
            3500
        );
    },

    hide() {
        const el = this._getEl();
        el.style.opacity = '0';
        this._timer = setTimeout(() => { el.style.display = 'none'; }, 400);
    }
};
window._SyncUI = _SyncUI;
