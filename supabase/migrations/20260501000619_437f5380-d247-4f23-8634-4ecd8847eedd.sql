-- Allow public writes to listings since admin authentication is client-side (password-based).
-- This restores pre-existing behavior where the admin panel could insert/update/delete listings without Supabase auth.
DROP POLICY IF EXISTS "Public can insert listings" ON public.listings;
DROP POLICY IF EXISTS "Public can update listings" ON public.listings;
DROP POLICY IF EXISTS "Public can delete listings" ON public.listings;

CREATE POLICY "Public can insert listings"
ON public.listings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can update listings"
ON public.listings
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete listings"
ON public.listings
FOR DELETE
TO anon, authenticated
USING (true);