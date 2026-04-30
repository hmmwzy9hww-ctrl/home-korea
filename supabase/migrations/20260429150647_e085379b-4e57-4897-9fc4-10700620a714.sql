-- Create cities table for dynamic city management
CREATE TABLE public.cities (
  id TEXT PRIMARY KEY,
  name_mn TEXT NOT NULL DEFAULT '',
  name_ko TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  name_ru TEXT NOT NULL DEFAULT '',
  name_zh TEXT NOT NULL DEFAULT '',
  name_vi TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '📍',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities are viewable by everyone"
  ON public.cities FOR SELECT USING (true);

CREATE POLICY "Anyone can insert cities"
  ON public.cities FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update cities"
  ON public.cities FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete cities"
  ON public.cities FOR DELETE USING (true);

-- Seed the 5 existing hardcoded cities
INSERT INTO public.cities (id, name_mn, name_ko, name_en, name_ru, name_zh, name_vi, emoji, sort_order) VALUES
  ('seoul',   'Сөүл',     '서울',   'Seoul',     'Сеул',      '首尔', 'Seoul',     '🏙️', 1),
  ('incheon', 'Инчон',    '인천',   'Incheon',   'Инчхон',    '仁川', 'Incheon',   '✈️', 2),
  ('gyeonggi','Кёнгидо',  '경기도', 'Gyeonggi',  'Кёнгидо',   '京畿道','Gyeonggi', '🌆', 3),
  ('busan',   'Бусан',    '부산',   'Busan',     'Пусан',     '釜山', 'Busan',     '🌊', 4),
  ('other',   'Бусад',    '기타',   'Other',     'Другое',    '其他', 'Khác',      '📍', 5);
