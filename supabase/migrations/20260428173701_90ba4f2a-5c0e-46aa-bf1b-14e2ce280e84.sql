-- Create site_settings table for global site configuration shared across all users
CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'global',
  cover_image_url text NOT NULL DEFAULT '',
  text_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are viewable by everyone"
  ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Anyone can insert site settings"
  ON public.site_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update site settings"
  ON public.site_settings FOR UPDATE USING (true);

-- Seed singleton row
INSERT INTO public.site_settings (id, cover_image_url, text_overrides)
VALUES ('global', 'https://images.unsplash.com/photo-1538669715315-155098f0fb1d?auto=format&fit=crop&w=1600&q=80', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable realtime
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;