/* DirApp TypeScript interfaces — matches backend Sequelize models */

export type UserRole = "tenant" | "landlord" | "admin";
export type KycStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type ContractStatus = "UPLOAD" | "PENDING_REVIEW" | "PENDING_SIGN" | "ACTIVE" | "EXPIRING" | "ENDED" | "CANCELLED";
export type LedgerRowStatus = "PENDING" | "REPORTED" | "PAID" | "OVERDUE" | "DISPUTED";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED" | "ESCALATED";
export type MatchStatus = "pending" | "accepted" | "rejected";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  activeRole: UserRole;
  kycStatus: KycStatus;
  trustScore: number;
  tosAcceptedAt: string | null;
  whatsappOptIn: boolean;
  avatarUrl?: string;
  isVerified?: boolean;
  createdAt: string;
}

export interface Apartment {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  neighborhood?: string;
  price: number;
  rooms: number;
  floor?: number;
  totalFloors?: number;
  size?: number;
  arnona?: number;
  vaadBayit?: number;
  amenities: string[];
  images: string[];
  availableFrom?: string;
  minLeaseDuration?: number;
  petsAllowed?: boolean;
  landlordId: string;
  landlord?: User;
  viewCount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Match {
  id: string;
  tenantId: string;
  landlordId: string;
  apartmentId: string;
  status: MatchStatus;
  compatibilityScore?: number;
  leadScore?: number;
  tenant?: User;
  landlord?: User;
  apartment?: Apartment;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  landlordId: string;
  apartmentId: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  fileUrl?: string;
  tenantSigned: boolean;
  landlordSigned: boolean;
  extractedData?: Record<string, unknown>;
  amendments?: Amendment[];
  tenant?: User;
  landlord?: User;
  apartment?: Apartment;
  createdAt: string;
}

export interface Amendment {
  id: string;
  contractId: string;
  proposedBy: string;
  field: string;
  oldValue: string;
  newValue: string;
  status: "proposed" | "approved" | "rejected";
  createdAt: string;
}

export interface LedgerRow {
  id: string;
  contractId: string;
  month: string;
  amount: number;
  status: LedgerRowStatus;
  dueDate: string;
  paidAt?: string;
  receiptUrl?: string;
  tenantNote?: string;
  landlordNote?: string;
  contract?: Contract;
  createdAt: string;
}

export interface MaintenanceTicket {
  id: string;
  contractId: string;
  tenantId: string;
  landlordId: string;
  title: string;
  description: string;
  status: TicketStatus;
  photoUrl?: string;
  invoiceUrl?: string;
  landlordResponse?: string;
  tenant?: User;
  landlord?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInRecord {
  id: string;
  contractId: string;
  type: "CHECK_IN" | "CHECK_OUT";
  rooms: CheckInRoom[];
  status: "PENDING" | "APPROVED" | "FIX_REQUESTED" | "COMPLETED";
  round: number;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface CheckInRoom {
  roomName: string;
  photos: string[];
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface GamificationProfile {
  userId: string;
  trustScore: number;
  totalPoints: number;
  badges: Badge[];
  history: PointEvent[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface PointEvent {
  id: string;
  action: string;
  points: number;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  type: "contract" | "payment" | "checkin" | "maintenance" | "checkout";
  title: string;
  description: string;
  date: string;
  relatedId?: string;
}

export interface AdminStats {
  users: Record<string, number>;
  listings: Record<string, number>;
  payments: Record<string, number>;
  contracts: Record<string, number>;
  interactions: Record<string, number>;
  maintenance: Record<string, number>;
  engagement: Record<string, number>;
  security: Record<string, number>;
}

export interface AdminConfig {
  key: string;
  value: string;
  section: string;
  description?: string;
}

/* API Response wrappers */
export interface LoginResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
