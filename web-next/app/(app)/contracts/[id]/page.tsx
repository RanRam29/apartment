"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { api, ApiError } from "@/lib/api";
import type { RentalAgreementV3 } from "@/lib/types";
import {
  AMENDMENT_FIELD_LABELS,
  STATUS_LABELS,
  formatCurrency,
  normalizeContractStatus,
} from "@/lib/contract-utils";
import { ContractStatusBadge } from "@/components/shared/ContractStatusBadge";
import { SignatureModal } from "@/components/contracts/SignatureModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const fetcher = <T,>(url: string) => api<T>(url);

interface LegacyDetailResponse {
  contract: Record<string, unknown>;
  contractText?: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [amendField, setAmendField] = useState("monthlyRentIls");
  const [amendValue, setAmendValue] = useState("");
  const [amendReason, setAmendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [signModalOpen, setSignModalOpen] = useState(false);

  const isLandlord = user?.activeRole === "landlord" || user?.role === "landlord";

  const {
    data: v3Data,
    error: v3Error,
    isLoading: v3Loading,
    mutate,
  } = useSWR<RentalAgreementV3>(`/api/v3/contracts/${id}`, fetcher, {
    shouldRetryOnError: false,
  });

  const useLegacy = v3Error && (v3Error as ApiError).status === 404;

  const {
    data: legacyData,
    error: legacyError,
    isLoading: legacyLoading,
  } = useSWR<LegacyDetailResponse>(
    useLegacy ? `/api/contracts/${id}` : null,
    fetcher
  );

  const isLoading = v3Loading || (useLegacy && legacyLoading);
  const error = useLegacy ? legacyError : v3Error && !useLegacy ? v3Error : null;

  const agreement = v3Data;
  const legacy = legacyData?.contract;

  async function handleProposeAmendment() {
    if (!amendValue.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api(`/api/v3/contracts/${id}/amend/propose`, {
        method: "POST",
        body: { field: amendField, newValue: amendValue, reason: amendReason },
      });
      setAmendValue("");
      setAmendReason("");
      await mutate();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAmendmentAction(amendmentId: string, action: "approve" | "reject") {
    setActionLoading(true);
    setActionError(null);
    try {
      await api(`/api/v3/contracts/${id}/amend/${amendmentId}/${action}`, { method: "POST" });
      await mutate();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendForSign() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api(`/api/v3/contracts/${id}/transition`, {
        method: "POST",
        body: { targetStatus: "PENDING_SIGN" },
      });
      await mutate();
    } catch (e) {
      const err = e as ApiError;
      setActionError(err.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) return <DetailSkeleton />;

  if (error && !legacy) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-outline-variant">
        <span className="material-symbols-outlined text-[48px] text-destructive mb-4">error</span>
        <h2 className="text-[22px] font-semibold text-tenant-blue mb-2">לא ניתן לטעון את החוזה</h2>
        <p className="text-on-surface-variant mb-6">{(error as Error).message}</p>
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={() => mutate()}
            className="h-[48px] px-6 bg-landlord-green text-white font-bold rounded-full"
          >
            נסה שוב
          </button>
          <Link href="/contracts" className="h-[48px] px-6 flex items-center border border-outline-variant rounded-full font-medium">
            חזרה לרשימה
          </Link>
        </div>
      </div>
    );
  }

  if (legacy && !agreement) {
    const status = normalizeContractStatus(String(legacy.status || ""));
    const statusMeta = STATUS_LABELS[status] || STATUS_LABELS.ACTIVE;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/contracts" className="text-on-surface-variant hover:text-tenant-blue">
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
          <h1 className="text-[28px] font-bold text-tenant-blue">
            {String(legacy.apartmentTitle || "חוזה שכירות")}
          </h1>
        </div>
        <div className={`rounded-xl p-6 border border-outline-variant ${statusMeta.className}`}>
          <p className="font-bold text-[18px]">{statusMeta.label}</p>
          <p className="text-[14px] mt-1 opacity-80">{String(legacy.apartmentAddress || "")}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">שכר דירה חודשי</p>
            <p className="text-[20px] font-bold text-tenant-blue">
              {formatCurrency(Number(legacy.monthlyRent || 0))}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">תקופת שכירות</p>
            <p className="text-[16px] font-medium text-tenant-blue">
              {String(legacy.startDate || "").slice(0, 10)} – {String(legacy.endDate || "").slice(0, 10)}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">שוכר</p>
            <p className="text-[16px] font-medium">{String(legacy.tenantName || "—")}</p>
          </div>
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">משכיר</p>
            <p className="text-[16px] font-medium">{String(legacy.landlordName || "—")}</p>
          </div>
        </div>
        {legacyData?.contractText && (
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
            <h2 className="text-[18px] font-semibold text-tenant-blue mb-4">תוכן החוזה</h2>
            <pre className="whitespace-pre-wrap text-[14px] text-on-surface-variant font-sans leading-relaxed">
              {legacyData.contractText}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (!agreement) return <DetailSkeleton />;

  const status = normalizeContractStatus(agreement.status);
  const statusMeta = STATUS_LABELS[status] || STATUS_LABELS.UPLOAD;
  const rent = Number(agreement.monthlyRentIls || 0);
  const amendments = agreement.amendments || [];
  const tenants = agreement.parties?.filter((p) => p.role === "tenant") || [];
  const userParty = agreement.parties?.find((p) => p.userId === user?.id);
  const landlordSigned = !!agreement.landlordSignedAt;
  const userSigned = isLandlord ? landlordSigned : !!userParty?.signedAt;
  const canSign = agreement.status === "PENDING_SIGN" && !userSigned;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contracts" className="text-on-surface-variant hover:text-tenant-blue">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[28px] font-bold text-tenant-blue">פרטי חוזה</h1>
      </div>

      <div className={`rounded-xl p-6 border border-outline-variant soft-shadow ${statusMeta.className}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <ContractStatusBadge status={agreement.status} />
            <p className="text-[14px] mt-2 opacity-90">
              נכס: {agreement.propertyId?.slice(0, 8)}...
            </p>
          </div>
          {agreement.documentUrl && (
            <a
              href={agreement.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-[40px] px-4 bg-white/80 rounded-full text-[14px] font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              צפייה במסמך
            </a>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-[#ffcdd2]/30 border border-[#c62828]/30 rounded-xl p-4 text-[14px] text-[#c62828]">
          {actionError}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
        <h2 className="text-[18px] font-semibold text-tenant-blue mb-4">פרטי החוזה</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">שכר דירה</p>
            <p className="text-[20px] font-bold text-tenant-blue">{formatCurrency(rent)}</p>
          </div>
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">תאריך התחלה</p>
            <p className="text-[16px] font-medium">{agreement.startDate || "—"}</p>
          </div>
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">תאריך סיום</p>
            <p className="text-[16px] font-medium">{agreement.endDate || "—"}</p>
          </div>
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">יום תשלום</p>
            <p className="text-[16px] font-medium">{agreement.paymentDueDay || "—"}</p>
          </div>
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">צמוד למדד</p>
            <p className="text-[16px] font-medium">{agreement.cpiLinked ? "כן" : "לא"}</p>
          </div>
          <div>
            <p className="text-[12px] text-on-surface-variant mb-1">שוכרים משויכים</p>
            <p className="text-[16px] font-medium">{tenants.length || "אין"}</p>
          </div>
        </div>
      </div>

      {canSign && (
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
          <h2 className="text-[18px] font-semibold text-tenant-blue mb-2">חתימה על החוזה</h2>
          <p className="text-[14px] text-on-surface-variant mb-4">
            החוזה ממתין לחתימתך. לאחר שכל הצדדים יחתמו, החוזה יופעל אוטומטית.
          </p>
          <button
            type="button"
            onClick={() => setSignModalOpen(true)}
            className="h-[48px] px-8 bg-landlord-green text-white font-bold rounded-full"
          >
            חתום על החוזה
          </button>
        </div>
      )}

      {agreement.status === "ACTIVE" && (
        <div className="flex flex-wrap gap-3">
          <Link href={`/payments?contractId=${id}`} className="h-10 px-4 flex items-center gap-2 rounded-full border border-outline-variant text-[14px] font-medium hover:border-landlord-green">
            <span className="material-symbols-outlined text-[18px]">payments</span>
            תשלומים
          </Link>
          <Link href={`/maintenance?contractId=${id}`} className="h-10 px-4 flex items-center gap-2 rounded-full border border-outline-variant text-[14px] font-medium hover:border-landlord-green">
            <span className="material-symbols-outlined text-[18px]">build</span>
            תחזוקה
          </Link>
          <Link href={`/checkin?contractId=${id}`} className="h-10 px-4 flex items-center gap-2 rounded-full border border-outline-variant text-[14px] font-medium hover:border-landlord-green">
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            כניסה / יציאה
          </Link>
        </div>
      )}

      <SignatureModal
        contractId={id}
        open={signModalOpen}
        onClose={() => setSignModalOpen(false)}
        onSigned={() => mutate()}
      />

      {isLandlord && agreement.status === "UPLOAD" && (
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
          <h2 className="text-[18px] font-semibold text-tenant-blue mb-2">פעולות</h2>
          <p className="text-[14px] text-on-surface-variant mb-4">
            לאחר שיושלמו כל השדות והשוכר יוזמן — שלח לחתימה.
          </p>
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleSendForSign}
            className="h-[48px] px-8 bg-landlord-green text-white font-bold rounded-full disabled:opacity-50"
          >
            {actionLoading ? "שולח..." : "שלח לחתימה"}
          </button>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
        <h2 className="text-[18px] font-semibold text-tenant-blue mb-4">היסטוריית תיקונים</h2>
        {amendments.length > 0 ? (
          <div className="space-y-3">
            {amendments.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-surface-container-low border border-outline-variant"
              >
                <div>
                  <p className="text-[14px] font-medium text-tenant-blue">
                    {AMENDMENT_FIELD_LABELS[a.field] || a.field}: {a.oldValue} → {a.newValue}
                  </p>
                  <p className="text-[12px] text-on-surface-variant mt-1">
                    הוצע ע&quot;י {a.proposedBy === "landlord" ? "משכיר" : "שוכר"} ·{" "}
                    {a.status === "pending" ? "ממתין לאישור" : a.status === "approved" ? "אושר" : "נדחה"}
                  </p>
                </div>
                {a.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAmendmentAction(a.id, "approve")}
                      className="h-9 px-4 bg-landlord-green text-white text-[13px] font-bold rounded-full"
                    >
                      אשר ✓
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAmendmentAction(a.id, "reject")}
                      className="h-9 px-4 border border-[#c62828] text-[#c62828] text-[13px] font-bold rounded-full"
                    >
                      דחה ✗
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-on-surface-variant text-center py-6">אין תיקונים עדיין</p>
        )}

        {agreement.status === "ACTIVE" && (
          <div className="mt-6 pt-6 border-t border-outline-variant">
            <h3 className="text-[16px] font-semibold text-tenant-blue mb-4">הצעת תיקון</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <select
                value={amendField}
                onChange={(e) => setAmendField(e.target.value)}
                className="h-[48px] rounded-lg border border-outline-variant px-4 bg-surface-container-lowest focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
              >
                <option value="monthlyRentIls">שכר דירה</option>
                <option value="startDate">תאריך התחלה</option>
                <option value="endDate">תאריך סיום</option>
                <option value="paymentDueDay">יום תשלום</option>
              </select>
              <input
                type="text"
                value={amendValue}
                onChange={(e) => setAmendValue(e.target.value)}
                placeholder="ערך חדש"
                className="h-[48px] rounded-lg border border-outline-variant px-4 focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
              />
              <input
                type="text"
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                placeholder="סיבה (אופציונלי)"
                className="h-[48px] rounded-lg border border-outline-variant px-4 focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
              />
            </div>
            <button
              type="button"
              disabled={actionLoading || !amendValue.trim()}
              onClick={handleProposeAmendment}
              className="mt-4 h-[48px] px-8 bg-landlord-green text-white font-bold rounded-full disabled:opacity-50"
            >
              {actionLoading ? "שולח..." : "הצע תיקון"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
