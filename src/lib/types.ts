export type City = "seoul" | "incheon" | "gyeonggi" | "busan" | "other";
export type RoomType =
  | "oneRoom"
  | "twoRoom"
  | "threeRoom"
  | "officetel"
  | "studio"
  | "share"
  | "dorm"
  | "twoRoomSeparated"
  | "villa"
  | "apartment"
  | "gosiwon";
export type ListingStatus = "available" | "unavailable";
export type SortKey = "newest" | "priceAsc" | "priceDesc";
export type PaymentType = "monthly" | "quarterly";

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
  paymentType?: PaymentType;
  latitude?: number | null;
  longitude?: number | null;
  /** AI-generated translations of `description`, keyed by language code (ko, en, ru, zh, vi). */
  descriptionTranslations?: Record<string, string>;
  /** AI-generated translations of `title`, keyed by language code (ko, en, ru, zh, vi). */
  titleTranslations?: Record<string, string>;
  createdAt: number;
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
