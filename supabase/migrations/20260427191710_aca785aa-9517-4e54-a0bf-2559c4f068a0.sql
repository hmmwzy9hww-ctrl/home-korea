CREATE TABLE public.listings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  room_type TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  monthly_rent INTEGER NOT NULL DEFAULT 0,
  deposit INTEGER NOT NULL DEFAULT 0,
  maintenance_fee INTEGER NOT NULL DEFAULT 0,
  maintenance_included BOOLEAN DEFAULT false,
  floor TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  subway_station TEXT NOT NULL DEFAULT '',
  subway_minutes INTEGER NOT NULL DEFAULT 0,
  bus_stop TEXT NOT NULL DEFAULT '',
  bus_minutes INTEGER NOT NULL DEFAULT 0,
  available_from TEXT NOT NULL DEFAULT '',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  naver_map_url TEXT,
  messenger_url TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listings are viewable by everyone"
  ON public.listings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert listings"
  ON public.listings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update listings"
  ON public.listings FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete listings"
  ON public.listings FOR DELETE
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER TABLE public.listings REPLICA IDENTITY FULL;