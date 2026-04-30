-- ============ Dropdown option tables (multilang, like cities) ============

CREATE TABLE IF NOT EXISTS public.room_types (
  id           text PRIMARY KEY,
  name_mn      text NOT NULL DEFAULT '',
  name_ko      text NOT NULL DEFAULT '',
  name_en      text NOT NULL DEFAULT '',
  name_ru      text NOT NULL DEFAULT '',
  name_zh      text NOT NULL DEFAULT '',
  name_vi      text NOT NULL DEFAULT '',
  emoji        text NOT NULL DEFAULT '🏠',
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_types (
  id           text PRIMARY KEY,
  name_mn      text NOT NULL DEFAULT '',
  name_ko      text NOT NULL DEFAULT '',
  name_en      text NOT NULL DEFAULT '',
  name_ru      text NOT NULL DEFAULT '',
  name_zh      text NOT NULL DEFAULT '',
  name_vi      text NOT NULL DEFAULT '',
  emoji        text NOT NULL DEFAULT '💳',
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.floor_options (
  id           text PRIMARY KEY,
  name_mn      text NOT NULL DEFAULT '',
  name_ko      text NOT NULL DEFAULT '',
  name_en      text NOT NULL DEFAULT '',
  name_ru      text NOT NULL DEFAULT '',
  name_zh      text NOT NULL DEFAULT '',
  name_vi      text NOT NULL DEFAULT '',
  emoji        text NOT NULL DEFAULT '',
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_amenities (
  id           text PRIMARY KEY,
  name_mn      text NOT NULL DEFAULT '',
  name_ko      text NOT NULL DEFAULT '',
  name_en      text NOT NULL DEFAULT '',
  name_ru      text NOT NULL DEFAULT '',
  name_zh      text NOT NULL DEFAULT '',
  name_vi      text NOT NULL DEFAULT '',
  icon         text NOT NULL DEFAULT 'Sparkles',
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============ RLS: public read, admin write (same as cities) ============

ALTER TABLE public.room_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_options     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room types are viewable by everyone" ON public.room_types FOR SELECT USING (true);
CREATE POLICY "Admins can insert room types" ON public.room_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update room types" ON public.room_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete room types" ON public.room_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Payment types are viewable by everyone" ON public.payment_types FOR SELECT USING (true);
CREATE POLICY "Admins can insert payment types" ON public.payment_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update payment types" ON public.payment_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete payment types" ON public.payment_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Floor options are viewable by everyone" ON public.floor_options FOR SELECT USING (true);
CREATE POLICY "Admins can insert floor options" ON public.floor_options FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update floor options" ON public.floor_options FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete floor options" ON public.floor_options FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Amenities are viewable by everyone" ON public.listing_amenities FOR SELECT USING (true);
CREATE POLICY "Admins can insert amenities" ON public.listing_amenities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update amenities" ON public.listing_amenities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete amenities" ON public.listing_amenities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_types;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_types;
ALTER PUBLICATION supabase_realtime ADD TABLE public.floor_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_amenities;

-- ============ Approval workflow on listings ============
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text NOT NULL DEFAULT '';

-- Trigger-based validation (NOT a CHECK constraint, per immutability rules)
CREATE OR REPLACE FUNCTION public.validate_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid approval_status: %', NEW.approval_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_validate_approval ON public.listings;
CREATE TRIGGER listings_validate_approval
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.validate_approval_status();

-- Replace public SELECT policy: only approved listings are public.
-- Admins and the submitter still see their own pending/rejected ones.
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;

CREATE POLICY "Approved listings are public"
  ON public.listings FOR SELECT
  USING (approval_status = 'approved');

CREATE POLICY "Admins can view all listings"
  ON public.listings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Submitters can view their own listings"
  ON public.listings FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());

-- Allow authenticated non-admins to submit listings as 'pending'.
-- They cannot mark themselves approved/featured.
CREATE POLICY "Authenticated users can submit pending listings"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND approval_status = 'pending'
    AND featured = false
  );

-- Index for the admin "pending queue" query
CREATE INDEX IF NOT EXISTS listings_approval_status_idx ON public.listings(approval_status);

-- ============ Seed dropdown tables with current hardcoded values ============

INSERT INTO public.room_types (id, name_mn, name_ko, name_en, name_ru, name_zh, name_vi, emoji, sort_order) VALUES
  ('oneRoom',          'Нэг өрөө',          '원룸',         'One room',           'Однокомнатная',       '单间',         'Một phòng',          '🏠', 1),
  ('twoRoom',          'Хоёр өрөө',         '투룸',         'Two room',           'Двухкомнатная',       '两间',         'Hai phòng',          '🏠', 2),
  ('twoRoomSeparated', 'Тусгаарласан 2 өрөө','분리형 투룸', 'Separated two room', 'Раздельная двухкомн.','分离式两间',   'Hai phòng tách',     '🏠', 3),
  ('threeRoom',        'Гурван өрөө',       '쓰리룸',       'Three room',         'Трёхкомнатная',       '三间',         'Ba phòng',           '🏠', 4),
  ('officetel',        'Оффистель',         '오피스텔',     'Officetel',          'Оффистель',           '商住两用',     'Officetel',          '🏢', 5),
  ('studio',           'Студио',            '스튜디오',     'Studio',             'Студия',              '工作室',       'Studio',             '🛏️', 6),
  ('share',            'Хуваалцах',         '쉐어하우스',   'Share house',        'Шеринг',              '合租',         'Nhà chia sẻ',        '👥', 7),
  ('dorm',             'Хостел',            '기숙사',       'Dorm',               'Общежитие',           '宿舍',         'Ký túc xá',          '🛌', 8),
  ('villa',            'Вилла',             '빌라',         'Villa',              'Вилла',               '别墅',         'Biệt thự',           '🏡', 9),
  ('apartment',        'Апартмент',         '아파트',       'Apartment',          'Квартира',            '公寓',         'Căn hộ',             '🏬', 10),
  ('gosiwon',          'Госивон',           '고시원',       'Gosiwon',            'Госивон',             '考试院',       'Gosiwon',            '🏠', 11)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payment_types (id, name_mn, name_ko, name_en, name_ru, name_zh, name_vi, emoji, sort_order) VALUES
  ('monthly',   'Сар бүр',     '월세',  'Monthly',   'Ежемесячно',  '月付', 'Hàng tháng',     '📅', 1),
  ('quarterly', 'Улирал бүр',  '분기',  'Quarterly', 'Ежеквартально','季付', 'Hàng quý',       '🗓️', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floor_options (id, name_mn, name_ko, name_en, name_ru, name_zh, name_vi, sort_order) VALUES
  ('B2',         'Хонгил -2',     '지하 2층',  'Basement 2',     'Подвал -2',     '地下2层',  'Hầm 2',           1),
  ('B1',         'Хонгил -1',     '지하 1층',  'Basement 1',     'Подвал -1',     '地下1层',  'Hầm 1',           2),
  ('1',          '1 давхар',      '1층',       '1st floor',      '1 этаж',        '1层',     'Tầng 1',          3),
  ('2',          '2 давхар',      '2층',       '2nd floor',      '2 этаж',        '2层',     'Tầng 2',          4),
  ('3',          '3 давхар',      '3층',       '3rd floor',      '3 этаж',        '3层',     'Tầng 3',          5),
  ('4',          '4 давхар',      '4층',       '4th floor',      '4 этаж',        '4层',     'Tầng 4',          6),
  ('5',          '5 давхар',      '5층',       '5th floor',      '5 этаж',        '5层',     'Tầng 5',          7),
  ('6+',         '6+ давхар',     '6층 이상',  '6th+ floor',     '6+ этаж',       '6层以上', 'Tầng 6+',         8),
  ('rooftop',    'Дээвэр',        '옥탑',      'Rooftop',        'Чердак',        '顶层',    'Mái',             9)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.listing_amenities (id, name_mn, name_ko, name_en, name_ru, name_zh, name_vi, icon, sort_order) VALUES
  ('ac',         'Агаарын хөргөгч',    '에어컨',     'Air conditioner', 'Кондиционер',         '空调',   'Máy lạnh',           'Snowflake',     1),
  ('washer',     'Угаалгын машин',     '세탁기',     'Washing machine', 'Стиральная машина',   '洗衣机', 'Máy giặt',           'WashingMachine',2),
  ('dryer',      'Хувцасны хатаагч',   '건조기',     'Dryer',           'Сушильная машина',    '烘干机', 'Máy sấy',            'Wind',          3),
  ('shoeRack',   'Гутлын шүүгээ',      '신발장',     'Shoe rack',       'Обувной шкаф',        '鞋柜',   'Tủ giày',            'Footprints',    4),
  ('fridge',     'Хөргөгч',            '냉장고',     'Refrigerator',    'Холодильник',         '冰箱',   'Tủ lạnh',            'Refrigerator',  5),
  ('interphone', 'Интерфон',           '인터폰',     'Interphone',      'Домофон',             '对讲机', 'Điện thoại nội bộ',  'Phone',         6),
  ('elevator',   'Лифт',               '엘리베이터', 'Elevator',        'Лифт',                '电梯',   'Thang máy',          'ArrowUpDown',   7),
  ('parking',    'Зогсоол',            '주차',       'Parking',         'Парковка',            '停车',   'Bãi đỗ xe',          'Car',           8),
  ('balcony',    'Тагт',               '베란다',     'Balcony',         'Балкон',              '阳台',   'Ban công',           'Trees',         9),
  ('internet',   'Интернет',           '인터넷',     'Internet',        'Интернет',            '网络',   'Internet',           'Wifi',          10),
  ('gasStove',   'Зуух',               '가스레인지', 'Gas stove',       'Газовая плита',       '燃气灶', 'Bếp gas',            'Flame',         11),
  ('tv',         'ТВ',                 'TV',         'TV',              'Телевизор',           '电视',   'TV',                 'Tv',            12),
  ('furniture',  'Тавилгатай',         '가구 포함', 'Furnished',       'С мебелью',           '家具齐全','Có nội thất',      'Sofa',          13)
ON CONFLICT (id) DO NOTHING;