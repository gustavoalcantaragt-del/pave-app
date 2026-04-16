-- ============================================================
-- PAVE Fase 4 — Migrations
-- Executar no SQL Editor do Supabase (projeto PAVE)
-- ============================================================

-- ── 1. Colunas extras em cash_movements (NF-e Import) ───────
ALTER TABLE cash_movements
    ADD COLUMN IF NOT EXISTS supplier_cnpj text    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS source        text    DEFAULT NULL;
-- source: 'manual' | 'nfe' | 'split'

COMMENT ON COLUMN cash_movements.supplier_cnpj IS 'CNPJ do fornecedor (importação NF-e)';
COMMENT ON COLUMN cash_movements.source        IS 'Origem do lançamento: manual, nfe, split';

-- ── 2. Tabela push_subscriptions (PWA Push) ─────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
    endpoint        text NOT NULL UNIQUE,
    p256dh          text NOT NULL,
    auth_key        text NOT NULL,
    user_agent      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_owner_all" ON push_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organizations
            WHERE organizations.id = push_subscriptions.organization_id
              AND organizations.owner_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_push_org ON push_subscriptions(organization_id);

-- ── 3. Tabela stock_items (Estoque) ─────────────────────────
CREATE TABLE IF NOT EXISTS stock_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            text NOT NULL,
    sku             text,
    category        text NOT NULL DEFAULT 'Geral',
    unit            text NOT NULL DEFAULT 'un',
    quantity        numeric(12,3) NOT NULL DEFAULT 0,
    min_quantity    numeric(12,3) NOT NULL DEFAULT 0,
    cost_price      numeric(12,2) NOT NULL DEFAULT 0,
    sell_price      numeric(12,2),
    supplier        text,
    supplier_cnpj   text,
    expiry_date     date,
    location        text,
    notes           text,
    active          boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_items_owner_all" ON stock_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organizations
            WHERE organizations.id = stock_items.organization_id
              AND organizations.owner_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_stock_items_org    ON stock_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_active ON stock_items(organization_id, active);
CREATE INDEX IF NOT EXISTS idx_stock_items_expiry ON stock_items(organization_id, expiry_date);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION stock_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_stock_items_updated_at ON stock_items;
CREATE TRIGGER trg_stock_items_updated_at
    BEFORE UPDATE ON stock_items
    FOR EACH ROW EXECUTE FUNCTION stock_items_updated_at();

-- ── 4. Tabela stock_movements (Movimentações de Estoque) ────
CREATE TABLE IF NOT EXISTS stock_movements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stock_item_id   uuid NOT NULL REFERENCES stock_items(id)   ON DELETE CASCADE,
    type            text NOT NULL CHECK (type IN ('in','out','adjustment')),
    quantity        numeric(12,3) NOT NULL,
    unit_cost       numeric(12,2),
    reason          text,
    reference_id    uuid,    -- referência para cash_movement ou bill
    created_by      uuid REFERENCES auth.users(id),
    created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_owner_all" ON stock_movements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organizations
            WHERE organizations.id = stock_movements.organization_id
              AND organizations.owner_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_stock_mov_org  ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_item ON stock_movements(stock_item_id);

-- Trigger para atualizar quantity em stock_items automaticamente
CREATE OR REPLACE FUNCTION stock_movement_update_qty()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.type = 'in' THEN
        UPDATE stock_items SET quantity = quantity + NEW.quantity WHERE id = NEW.stock_item_id;
    ELSIF NEW.type = 'out' THEN
        UPDATE stock_items SET quantity = quantity - NEW.quantity WHERE id = NEW.stock_item_id;
    ELSIF NEW.type = 'adjustment' THEN
        UPDATE stock_items SET quantity = NEW.quantity WHERE id = NEW.stock_item_id;
    END IF;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_stock_movement_qty ON stock_movements;
CREATE TRIGGER trg_stock_movement_qty
    AFTER INSERT ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION stock_movement_update_qty();
