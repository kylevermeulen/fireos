-- Create manual overrides table
CREATE TABLE IF NOT EXISTS public.manual_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_key text NOT NULL,
  field_key text NOT NULL,
  value_json jsonb NOT NULL,
  effective_from date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_key, field_key)
);

-- Helpful index for lookups
CREATE INDEX IF NOT EXISTS idx_manual_overrides_user_entity
  ON public.manual_overrides (user_id, entity_type, entity_key);

-- Enable RLS
ALTER TABLE public.manual_overrides ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'manual_overrides'
      AND policyname = 'Users can view own manual_overrides'
  ) THEN
    CREATE POLICY "Users can view own manual_overrides"
      ON public.manual_overrides
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'manual_overrides'
      AND policyname = 'Users can insert own manual_overrides'
  ) THEN
    CREATE POLICY "Users can insert own manual_overrides"
      ON public.manual_overrides
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'manual_overrides'
      AND policyname = 'Users can update own manual_overrides'
  ) THEN
    CREATE POLICY "Users can update own manual_overrides"
      ON public.manual_overrides
      FOR UPDATE
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'manual_overrides'
      AND policyname = 'Users can delete own manual_overrides'
  ) THEN
    CREATE POLICY "Users can delete own manual_overrides"
      ON public.manual_overrides
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_manual_overrides_updated_at ON public.manual_overrides;
CREATE TRIGGER update_manual_overrides_updated_at
BEFORE UPDATE ON public.manual_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill existing mortgage overrides into manual_overrides (idempotent)
INSERT INTO public.manual_overrides (user_id, entity_type, entity_key, field_key, value_json, effective_from, created_at, updated_at)
SELECT
  mo.user_id,
  CASE
    WHEN mo.field_name = 'offset_balance' THEN 'account'
    WHEN mo.field_name = 'property_value' THEN 'valuation'
    WHEN mo.field_name LIKE 'annual_rental_%' THEN 'rental'
    ELSE 'mortgage'
  END AS entity_type,
  CASE
    WHEN mo.field_name LIKE 'fixed_%' THEN 'Fixed Mortgage'
    WHEN mo.field_name LIKE 'variable_%' THEN 'Variable Mortgage'
    WHEN mo.field_name = 'offset_balance' THEN 'Bank of Melbourne: Offset'
    WHEN mo.field_name = 'property_value' THEN 'Property'
    WHEN mo.field_name LIKE 'annual_rental_%' THEN 'Property'
    ELSE 'Mortgage'
  END AS entity_key,
  CASE
    WHEN mo.field_name IN ('fixed_rate','variable_rate') THEN 'interest_rate'
    WHEN mo.field_name IN ('fixed_balance','variable_balance') THEN 'balance'
    WHEN mo.field_name IN ('fixed_repayment','variable_repayment') THEN 'monthly_repayment'
    WHEN mo.field_name = 'monthly_payment' THEN 'monthly_required_payment'
    WHEN mo.field_name = 'original_loan' THEN 'original_loan'
    WHEN mo.field_name = 'property_value' THEN 'value_aud'
    WHEN mo.field_name = 'annual_rental_income' THEN 'annual_rental_income'
    WHEN mo.field_name = 'annual_rental_fees' THEN 'annual_rental_fees'
    WHEN mo.field_name = 'annual_council_rates' THEN 'annual_council_rates'
    WHEN mo.field_name = 'annual_sewage_rates' THEN 'annual_sewage_rates'
    WHEN mo.field_name = 'annual_improvements' THEN 'annual_improvements'
    ELSE mo.field_name
  END AS field_key,
  mo.field_value AS value_json,
  NULL::date AS effective_from,
  mo.created_at,
  mo.updated_at
FROM public.mortgage_overrides mo
ON CONFLICT (user_id, entity_type, entity_key, field_key)
DO UPDATE SET
  value_json = EXCLUDED.value_json,
  updated_at = GREATEST(public.manual_overrides.updated_at, EXCLUDED.updated_at);
