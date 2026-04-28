-- ============================================================
-- Migration: recurrence_end_date em bills
-- Aplicar no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE DEFAULT NULL;

-- 2. Atualizar trigger clone_recurrent_bill para respeitar a data limite
CREATE OR REPLACE FUNCTION clone_recurrent_bill()
RETURNS TRIGGER AS $$
DECLARE
  months_add INT;
  next_due   DATE;
BEGIN
  -- Só clona se: foi paga agora, tem recorrência e não estava paga antes
  IF NEW.paid_date IS NULL OR OLD.paid_date IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.recurrence IS NULL OR NEW.recurrence = 'none' THEN
    RETURN NEW;
  END IF;

  -- Calcular próximo vencimento
  months_add := CASE NEW.recurrence
    WHEN 'monthly'    THEN 1
    WHEN 'quarterly'  THEN 3
    WHEN 'semiannual' THEN 6
    WHEN 'annual'     THEN 12
    ELSE 0
  END;

  IF months_add = 0 THEN RETURN NEW; END IF;

  next_due := NEW.due_date + (months_add || ' months')::INTERVAL;

  -- Respeitar data de término da recorrência
  IF NEW.recurrence_end_date IS NOT NULL AND next_due > NEW.recurrence_end_date THEN
    RETURN NEW; -- Não clona — recorrência encerrada
  END IF;

  -- Inserir próxima ocorrência
  INSERT INTO bills (
    organization_id, user_id, type, description, amount,
    due_date, category, recurrence, recurrence_end_date, notes
  ) VALUES (
    NEW.organization_id, NEW.user_id, NEW.type, NEW.description, NEW.amount,
    next_due, NEW.category, NEW.recurrence, NEW.recurrence_end_date, NEW.notes
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger (DROP IF EXISTS + CREATE)
DROP TRIGGER IF EXISTS trg_clone_recurrent_bill ON bills;
CREATE TRIGGER trg_clone_recurrent_bill
  AFTER UPDATE OF paid_date ON bills
  FOR EACH ROW EXECUTE FUNCTION clone_recurrent_bill();
