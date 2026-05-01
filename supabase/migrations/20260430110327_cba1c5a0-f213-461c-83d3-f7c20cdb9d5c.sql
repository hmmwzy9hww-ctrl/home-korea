ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS address_translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS area_translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS options_translations jsonb NOT NULL DEFAULT '{}'::jsonb;