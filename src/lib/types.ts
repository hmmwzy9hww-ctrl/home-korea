// Cities, room types, payment types and amenities are now dynamic
// (managed in Supabase tables). They're just string ids here.
export type City = string;
export type RoomType = string;
export type PaymentType = string;
export type ListingStatus = "available" | "unavailable";
export type ApprovalStatus = "pending" | "approved" | "rejected";
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
  paymentType?: PaymentType;
  latitude?: number | null;
  longitude?: number | null;
  /** AI-generated translations of `description`, keyed by language code (ko, en, ru, zh, vi). */
  descriptionTranslations?: Record<string, string>;
  /** AI-generated translations of `title`, keyed by language code (ko, en, ru, zh, vi). */
  titleTranslations?: Record<string, string>;
  /** Approval workflow: "pending" submissions are hidden from the public until an admin approves. */
  approvalStatus: ApprovalStatus;
  /** Auth user id of the person who submitted the listing (admins or public submitters). */
  submittedBy?: string | null;
  /** Optional admin note when rejecting a listing. */
  rejectionReason?: string;
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
