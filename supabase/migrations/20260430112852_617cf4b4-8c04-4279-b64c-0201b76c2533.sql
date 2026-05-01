-- Add parent_id to cities for 2-level hierarchy (city -> district)
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS parent_id text REFERENCES public.cities(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cities_parent_id ON public.cities(parent_id);