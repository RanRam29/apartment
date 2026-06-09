import type { Contract, ContractListItem, ContractStatus } from "@/lib/types";

const LEGACY_STATUS_MAP: Record<string, ContractStatus> = {
  draft: "UPLOAD",
  pending_tenant: "PENDING_SIGN",
  pending_landlord: "PENDING_SIGN",
  active: "ACTIVE",
  terminated: "ENDED",
};

export function normalizeContractStatus(status: string): ContractStatus | string {
  const upper = status?.toUpperCase?.() as ContractStatus;
  const known: ContractStatus[] = [
    "UPLOAD", "PENDING_REVIEW", "PENDING_SIGN", "ACTIVE", "EXPIRING", "ENDED", "CANCELLED",
  ];
  if (known.includes(upper)) return upper;
  return LEGACY_STATUS_MAP[status] || status;
}

export function legacyContractToListItem(c: Record<string, unknown>): ContractListItem {
  const id = String(c.id || c._id || "");
  return {
    id,
    propertyName: String(c.apartmentTitle || c.apartment?.title || "נכס"),
    propertyAddress: String(c.apartmentAddress || c.apartment?.address || "—"),
    status: normalizeContractStatus(String(c.status || "")),
    startDate: String(c.startDate || "").slice(0, 10),
    endDate: String(c.endDate || "").slice(0, 10),
    monthlyRent: Number(c.monthlyRent || c.monthlyRentIls || 0),
  };
}

export function contractToListItem(c: Contract): ContractListItem {
  return {
    id: c.id,
    propertyName: c.apartment?.title || "נכס",
    propertyAddress: c.apartment?.address || "—",
    status: normalizeContractStatus(c.status),
    startDate: c.startDate?.slice(0, 10) || "",
    endDate: c.endDate?.slice(0, 10) || "",
    monthlyRent: c.monthlyRent || 0,
  };
}

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  UPLOAD: { label: "הועלה", className: "bg-surface-container-high text-on-surface-variant" },
  PENDING_REVIEW: { label: "בבדיקה", className: "bg-[#fff3cd] text-[#856404]" },
  PENDING_SIGN: { label: "ממתין לחתימה", className: "bg-[#fff3cd] text-[#856404]" },
  ACTIVE: { label: "פעיל", className: "bg-[#9cefdf] text-[#0b6f63]" },
  EXPIRING: { label: "לקראת סיום", className: "bg-[#ffe0b2] text-[#e65100]" },
  ENDED: { label: "הסתיים", className: "bg-[#ffcdd2] text-[#c62828]" },
  CANCELLED: { label: "בוטל", className: "bg-[#ffcdd2] text-[#c62828]" },
};

export function formatCurrency(amount: number): string {
  return `₪ ${amount.toLocaleString("he-IL")}`;
}

export function formatDateRange(start: string, end: string): string {
  if (!start && !end) return "—";
  return `${start || "—"} – ${end || "—"}`;
}

export const LEDGER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "ממתין", className: "bg-surface-container-high text-on-surface-variant" },
  REPORTED: { label: "דווח", className: "bg-[#fff3cd] text-[#856404]" },
  PAID: { label: "שולם", className: "bg-[#9cefdf] text-[#0b6f63]" },
  OVERDUE: { label: "באיחור", className: "bg-[#ffcdd2] text-[#c62828]" },
  DISPUTED: { label: "במחלוקת", className: "bg-[#ffe0b2] text-[#e65100]" },
};

export const TICKET_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  OPEN: { label: "פתוח", className: "bg-[#ffcdd2] text-[#c62828]" },
  IN_PROGRESS: { label: "בטיפול", className: "bg-[#fff3cd] text-[#856404]" },
  WAITING_INVOICE: { label: "ממתין לחשבונית", className: "bg-[#ffe0b2] text-[#e65100]" },
  ESCALATED: { label: "הסלמה", className: "bg-[#ffe0b2] text-[#e65100]" },
  CLOSED: { label: "סגור", className: "bg-[#9cefdf] text-[#0b6f63]" },
};

export const AMENDMENT_FIELD_LABELS: Record<string, string> = {
  monthlyRentIls: "שכר דירה",
  startDate: "תאריך התחלה",
  endDate: "תאריך סיום",
  paymentDueDay: "יום תשלום",
};
