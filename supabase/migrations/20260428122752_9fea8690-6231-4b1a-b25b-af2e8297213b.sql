-- Create public bucket for site assets (cover image, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Site assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Allow anyone to upload/update/delete (admin panel has no auth currently — matches existing listings RLS)
CREATE POLICY "Anyone can upload site assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets');

CREATE POLICY "Anyone can update site assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets');

CREATE POLICY "Anyone can delete site assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets');