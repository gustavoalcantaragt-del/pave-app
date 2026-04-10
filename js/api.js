// ============================================================
// PAVE — API Client (Supabase)
// Substitui o backend Express/SQLite por Supabase
// ============================================================

// ── Cliente Supabase ─────────────────────────────────────────
const _supabase = supabase.createClient(
    PAV_CONFIG.SUPABASE_URL,
    PAV_CONFIG.SUPABASE_ANON_KEY
);

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
        const mesRef = dados.mesReferencia;
        let label = mesRef;
        if (label?.includes('-')) {
            const p = label.split('-');
            label = p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : label;
        }
        const idx = historico.findIndex(h => h.mesRef === mesRef);
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
        } catch (e) { /* falha silenciosa — dados locais são suficientes */ }

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
        const raw = localStorage.getItem(STORAGE_KEYS.ULTIMOS_DADOS);
        return raw ? JSON.parse(raw) : null;
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
                recurrence_group: mov.recurrenceGroup || null
            }, { onConflict: 'id' });
        } catch (e) { /* falha silenciosa */ }

        return { ok: true };
    },

    async deleteMovimento(id) {
        let local = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAIXA) || '[]');
        local = local.filter(m => m.id !== id);
        localStorage.setItem(STORAGE_KEYS.CAIXA, JSON.stringify(local));

        try {
            const orgId = await OrgAPI.getOrgId();
            if (orgId) await _supabase.from('cash_movements').delete().eq('id', id);
        } catch (e) { /* falha silenciosa */ }

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
        } catch (e) { /* falha silenciosa */ }

        return { ok: true };
    },

    async delete(id) {
        let local = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICOS) || '[]');
        local = local.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEYS.SERVICOS, JSON.stringify(local));

        try {
            const orgId = await OrgAPI.getOrgId();
            if (orgId) await _supabase.from('services').delete().eq('id', id);
        } catch (e) { /* falha silenciosa */ }

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

// ── COMPATIBILIDADE: BalancoAPI ───────────────────────────────
const BalancoAPI = {
    salvar:          (dados) => FinancialAPI.save(dados),
    listar:          ()      => FinancialAPI.list(),
    getUltimosDados: ()      => FinancialAPI.getUltimosDados(),
    setUltimosDados: (dados) => localStorage.setItem(STORAGE_KEYS.ULTIMOS_DADOS, JSON.stringify(dados))
};
