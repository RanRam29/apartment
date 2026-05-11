export type UserRole = 'tenant' | 'landlord';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
  isVerified: boolean;
  isPremium: boolean;
}

export interface ApartmentImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export type Amenity =
  | 'parking'
  | 'balcony'
  | 'elevator'
  | 'ac'
  | 'storage'
  | 'pets_allowed'
  | 'furnished'
  | 'sun_boiler';

export interface Apartment {
  id: string;
  landlordId: string;
  landlord?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'isVerified' | 'isPremium'>;
  title: string;
  description: string | null;
  price: number;
  rooms: number;
  floor: number | null;
  totalFloors: number | null;
  sizeSqm: number | null;
  city: string;
  street?: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  images: ApartmentImage[];
  amenities: Amenity[];
  availableFrom: string | null;
  minLeasePeriod: number | null;
  petsAllowed: boolean;
  isActive: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: string;
}

export type SwipeDirection = 'like' | 'dislike' | 'superlike';

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface Match {
  id: string;
  tenantId: string;
  landlordId: string;
  apartmentId: string;
  status: MatchStatus;
  apartment?: Apartment;
  tenant?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  landlord?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  tenantLikedAt: string | null;
  landlordLikedAt: string | null;
  lastMessageAt: string | null;
  unreadCount?: number;
  createdAt: string;
}

export type MessageType = 'text' | 'image' | 'system';

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  type: MessageType;
  imageUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface UserPreferences {
  budget: { min: number; max: number };
  cities: string[];
  rooms: { min: number; max: number };
  requiredAmenities: Amenity[];
  petsAllowed?: boolean;
}

export interface LandlordDashboard {
  summary: {
    totalListings: number;
    activeListings: number;
    totalViews: number;
    totalLikes: number;
    conversionRate: string;
    matches: { pending: number; accepted: number; rejected: number; expired: number };
  };
  listings: Apartment[];
  recentPendingMatches: Match[];
  swipeTrend: { date: string; count: number }[];
}

// Navigation param types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type TenantTabParamList = {
  Home: undefined;
  Swipe: undefined;
  Matches: undefined;
  Search: undefined;
  Map: undefined;
  Profile: undefined;
};

export type LandlordTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Leads: undefined;
  Matches: undefined;
  Listings: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Onboarding: undefined;
  Chat: { matchId: string; title: string };
  ApartmentDetail: { apartmentId: string };
  CreateListing: undefined;
  EditListing: { apartmentId: string };
  Preferences: undefined;
  Roommate: undefined;
  VerifyIdentity: undefined;
  Contracts: undefined;
  ContractDetail: { contractId: string };
  RentPayments: undefined;
  Commercial: undefined;
  Gamification: undefined;
  Services: undefined;
  IoT: undefined;
};
