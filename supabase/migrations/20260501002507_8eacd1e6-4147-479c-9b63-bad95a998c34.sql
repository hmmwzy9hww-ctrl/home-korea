CREATE INDEX IF NOT EXISTS listings_created_at_idx ON public.listings (created_at DESC);
CREATE INDEX IF NOT EXISTS listings_approval_status_idx ON public.listings (approval_status);