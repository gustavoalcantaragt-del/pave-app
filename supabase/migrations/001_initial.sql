-- ============================================================
-- PAVE — Migration 001: Schema Inicial
-- Execute no Supabase SQL Editor ou via:
--   supabase db push
-- ============================================================

-- ── Extensões necessárias ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ORGANIZATIONS — Clínicas / Estabelecimentos
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    cnpj          TEXT,
    crmv          TEXT,
    city          TEXT,
    state         TEXT,
    responsible   TEXT,
    tax_regime    TEXT DEFAULT 'simples',
    employees     INT  DEFAULT 0,
    work_days     INT  DEFAULT 22,
    phone         TEXT,
    address       TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono lê a própria org"
    ON organizations FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Dono cria/atualiza a própria org"
    ON organizations FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- ============================================================
-- PLANS — Planos de Assinatura
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL UNIQUE,    -- 'starter' | 'pro' | 'clinic'
    display_name     TEXT NOT NULL,
    price_monthly    NUMERIC(10,2),
    price_annual     NUMERIC(10,2),
    features         JSONB DEFAULT '[]',
    is_active        BOOLEAN DEFAULT true,
    asaas_product_id TEXT
);

-- Planos base (inserir uma vez)
INSERT INTO plans (name, display_name, price_monthly, price_annual, features) VALUES
    ('starter', 'Starter', 59.00,  590.00,  '["Dashboard financeiro","Balanço mensal","Caixa Diário","Precificação de serviços","Exportação PDF e Excel","1 usuário","1 clínica"]'),
    ('pro',     'Pro',     119.00, 1190.00, '["Tudo do Starter","Simulador de cenários What-If","Relatórios avançados (6 abas)","Histórico ilimitado","Suporte prioritário"]'),
    ('clinic',  'Clinic',  199.00, 1990.00, '["Tudo do Pro","Múltiplos usuários","Múltiplas clínicas","Gestão de equipe","API access"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SUBSCRIPTIONS — Assinaturas
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id                UUID REFERENCES plans(id),
    status                 TEXT NOT NULL DEFAULT 'trial',
    trial_ends_at          TIMESTAMPTZ DEFAULT now() + INTERVAL '14 days',
    current_period_start   TIMESTAMPTZ,
    current_period_end     TIMESTAMPTZ,
    asaas_subscription_id  TEXT,
    asaas_customer_id      TEXT,
    created_at             TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê a própria assinatura"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================
-- FINANCIAL_ENTRIES — Balanços Mensais
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id          UUID REFERENCES auth.users(id),
    reference_date   DATE NOT NULL,
    data             JSONB NOT NULL,      -- dados completos do formulário
    totals           JSONB,               -- totais calculados (cache)
    created_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, reference_date)
);

ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa os próprios balanços"
    ON financial_entries FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_user_date
    ON financial_entries (user_id, reference_date DESC);

-- ============================================================
-- CASH_MOVEMENTS — Movimentações de Caixa
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_movements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id           UUID REFERENCES auth.users(id),
    description       TEXT        NOT NULL,
    amount            NUMERIC(12,2) NOT NULL,
    due_date          DATE        NOT NULL,
    type              TEXT        NOT NULL CHECK (type IN ('receita','despesa')),
    category          TEXT,
    payment_method    TEXT,
    notes             TEXT,
    status            TEXT        DEFAULT 'pendente' CHECK (status IN ('pendente','pago')),
    is_recurring      BOOLEAN     DEFAULT false,
    recurrence_group  TEXT,
    created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa o próprio caixa"
    ON cash_movements FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cash_movements_user_date
    ON cash_movements (user_id, due_date DESC);

-- ============================================================
-- SERVICES — Serviços Precificados
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id          UUID REFERENCES auth.users(id),
    name             TEXT          NOT NULL,
    price            NUMERIC(12,2),
    total_cost       NUMERIC(12,2),
    profit           NUMERIC(12,2),
    margin           NUMERIC(6,2),
    is_combo         BOOLEAN       DEFAULT false,
    combo_items      JSONB         DEFAULT '[]',
    created_at       TIMESTAMPTZ   DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa os próprios serviços"
    ON services FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PROFIT_CONFIG — Configuração de Divisão do Lucro
-- ============================================================
CREATE TABLE IF NOT EXISTS profit_config (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    pro_labore_pct   INT  DEFAULT 50,
    investments_pct  INT  DEFAULT 30,
    reserve_pct      INT  DEFAULT 20,
    updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa a própria config de lucro"
    ON profit_config FOR ALL
    USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

-- ============================================================
-- TRIGGER — Criar trial automaticamente ao registrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pro_plan_id UUID;
BEGIN
    -- Buscar ID do plano pro para o trial
    SELECT id INTO pro_plan_id FROM plans WHERE name = 'pro' LIMIT 1;

    -- Criar assinatura trial
    INSERT INTO subscriptions (user_id, plan_id, status, trial_ends_at)
    VALUES (
        NEW.id,
        pro_plan_id,
        'trial',
        now() + INTERVAL '14 days'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNÇÃO — Atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
