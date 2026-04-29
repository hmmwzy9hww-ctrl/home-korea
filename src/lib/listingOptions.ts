import {
  Snowflake,
  WashingMachine,
  Wind,
  Footprints,
  Refrigerator,
  Phone,
  ArrowUpDown,
  Car,
  Trees,
  Wifi,
  Flame,
  Tv,
  Sofa,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "./i18n";

export interface ListingOption {
  /** Stable id stored in DB (also used as fallback label). */
  id: string;
  icon: LucideIcon;
  labels: Record<Lang, string>;
}

export const LISTING_OPTIONS: ListingOption[] = [
  {
    id: "ac",
    icon: Snowflake,
    labels: {
      ko: "에어컨",
      mn: "Агаарын хөргөгч",
      en: "Air conditioner",
      ru: "Кондиционер",
      zh: "空调",
      vi: "Máy lạnh",
    },
  },
  {
    id: "washer",
    icon: WashingMachine,
    labels: {
      ko: "세탁기",
      mn: "Угаалгын машин",
      en: "Washing machine",
      ru: "Стиральная машина",
      zh: "洗衣机",
      vi: "Máy giặt",
    },
  },
  {
    id: "dryer",
    icon: Wind,
    labels: {
      ko: "건조기",
      mn: "Хувцасны хатаагч",
      en: "Dryer",
      ru: "Сушильная машина",
      zh: "烘干机",
      vi: "Máy sấy",
    },
  },
  {
    id: "shoeRack",
    icon: Footprints,
    labels: {
      ko: "신발장",
      mn: "Гутлын шүүгээ",
      en: "Shoe rack",
      ru: "Обувной шкаф",
      zh: "鞋柜",
      vi: "Tủ giày",
    },
  },
  {
    id: "fridge",
    icon: Refrigerator,
    labels: {
      ko: "냉장고",
      mn: "Хөргөгч",
      en: "Refrigerator",
      ru: "Холодильник",
      zh: "冰箱",
      vi: "Tủ lạnh",
    },
  },
  {
    id: "interphone",
    icon: Phone,
    labels: {
      ko: "인터폰",
      mn: "Интерфон",
      en: "Interphone",
      ru: "Домофон",
      zh: "对讲机",
      vi: "Điện thoại nội bộ",
    },
  },
  {
    id: "elevator",
    icon: ArrowUpDown,
    labels: {
      ko: "엘리베이터",
      mn: "Лифт",
      en: "Elevator",
      ru: "Лифт",
      zh: "电梯",
      vi: "Thang máy",
    },
  },
  {
    id: "parking",
    icon: Car,
    labels: {
      ko: "주차",
      mn: "Зогсоол",
      en: "Parking",
      ru: "Парковка",
      zh: "停车",
      vi: "Bãi đỗ xe",
    },
  },
  {
    id: "balcony",
    icon: Trees,
    labels: {
      ko: "베란다",
      mn: "Тагт",
      en: "Balcony",
      ru: "Балкон",
      zh: "阳台",
      vi: "Ban công",
    },
  },
  {
    id: "internet",
    icon: Wifi,
    labels: {
      ko: "인터넷",
      mn: "Интернет",
      en: "Internet",
      ru: "Интернет",
      zh: "网络",
      vi: "Internet",
    },
  },
  {
    id: "gasStove",
    icon: Flame,
    labels: {
      ko: "가스레인지",
      mn: "Зуух",
      en: "Gas stove",
      ru: "Газовая плита",
      zh: "燃气灶",
      vi: "Bếp gas",
    },
  },
  {
    id: "tv",
    icon: Tv,
    labels: {
      ko: "TV",
      mn: "ТВ",
      en: "TV",
      ru: "Телевизор",
      zh: "电视",
      vi: "TV",
    },
  },
  {
    id: "furniture",
    icon: Sofa,
    labels: {
      ko: "가구 포함",
      mn: "Тавилгатай",
      en: "Furnished",
      ru: "С мебелью",
      zh: "家具齐全",
      vi: "Có nội thất",
    },
  },
];

const OPTION_BY_ID: Record<string, ListingOption> = Object.fromEntries(
  LISTING_OPTIONS.map((o) => [o.id, o]),
);

/** Build a lookup from any known label (in any language) to the option id. */
const LABEL_TO_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const opt of LISTING_OPTIONS) {
    for (const label of Object.values(opt.labels)) {
      map[label.toLowerCase()] = opt.id;
    }
  }
  return map;
})();

/** Resolve a stored option string (id or legacy label) to an option definition. */
export function resolveOption(value: string): ListingOption | undefined {
  if (!value) return undefined;
  if (OPTION_BY_ID[value]) return OPTION_BY_ID[value];
  const id = LABEL_TO_ID[value.toLowerCase()];
  return id ? OPTION_BY_ID[id] : undefined;
}

/** Localized label for a stored option string; falls back to the raw string. */
export function getOptionLabel(value: string, lang: Lang): string {
  const opt = resolveOption(value);
  return opt ? opt.labels[lang] : value;
}
