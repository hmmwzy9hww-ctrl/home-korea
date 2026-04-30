// City and RoomType are dynamic strings backed by the cities/room_types tables.
export type City = string;
export type RoomType = string;
export type PaymentType = string;
export type ListingStatus = "available" | "unavailable";
export type SortKey = "newest" | "priceAsc" | "priceDesc";

export type LangCode = "mn" | "ko" | "en" | "ru" | "zh" | "vi";
export type Translations = Partial<Record<LangCode, string>>;
export type ArrayTranslations = Partial<Record<LangCode, string[]>>;

export interface Listing {
  id: string;
  title: string;
  roomType: RoomType;
  city: City;
  area: string;
  address: string;
  monthlyRent: number;
  deposit: number;
  maintenanceFee: number;
  maintenanceIncluded?: boolean;
  floor: string;
  size: number;
  subwayStation: string;
  subwayMinutes: number;
  busStop: string;
  busMinutes: number;
  availableFrom: string;
  options: string[];
  description: string;
  photos: string[];
  naverMapUrl?: string;
  messengerUrl?: string;
  status: ListingStatus;
  featured: boolean;
  createdAt: number;
  latitude?: number;
  longitude?: number;
  paymentType?: PaymentType;
  titleTranslations?: Translations;
  descriptionTranslations?: Translations;
  addressTranslations?: Translations;
  areaTranslations?: Translations;
  optionsTranslations?: ArrayTranslations;
}

export interface Filters {
  city?: City | "all";
  area?: string;
  roomType?: RoomType | "all";
  subway?: string;
  minPrice?: number;
  maxPrice?: number;
  minDeposit?: number;
  maxDeposit?: number;
  availableNow?: boolean;
  maintIncluded?: boolean;
  sort?: SortKey;
  query?: string;
}
