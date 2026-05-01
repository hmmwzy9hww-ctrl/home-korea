export type City = "seoul" | "incheon" | "gyeonggi" | "busan" | "other";
export type RoomType = "oneRoom" | "twoRoom" | "threeRoom" | "officetel" | "studio" | "share";
export type ListingStatus = "available" | "unavailable";
export type SortKey = "newest" | "priceAsc" | "priceDesc";

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
