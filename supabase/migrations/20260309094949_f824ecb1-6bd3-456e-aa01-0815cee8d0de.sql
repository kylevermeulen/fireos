
-- Category rules table for automatic transaction categorization
CREATE TABLE public.category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  keyword text NOT NULL,
  l1_category text NOT NULL,
  l2_category text,
  is_internal_transfer boolean NOT NULL DEFAULT false,
  needs_review boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, keyword)
);

ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own category_rules" ON public.category_rules FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own category_rules" ON public.category_rules FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own category_rules" ON public.category_rules FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own category_rules" ON public.category_rules FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Bank import logs to track uploaded files and enable deduplication
CREATE TABLE public.bank_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  rows_imported integer NOT NULL DEFAULT 0,
  rows_duplicates integer NOT NULL DEFAULT 0,
  rows_total integer NOT NULL DEFAULT 0,
  date_from date,
  date_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank_import_logs" ON public.bank_import_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own bank_import_logs" ON public.bank_import_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Add source_import_id to transactions to track which import created them
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source_import_id uuid REFERENCES public.bank_import_logs(id) ON DELETE SET NULL;

-- Add L1/L2 columns to transactions for category hierarchy
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS l1_category text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS l2_category text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS counterparty text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_internal_transfer boolean NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source_account_name text;
