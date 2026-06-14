"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { ApprovedGuarantorOption, WarrantyClaim } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

const fetcher = <T,>(url: string) => api<T>(url);

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  FILED: { label: "ממתין לערב", className: "bg-amber-50 text-amber-800 border-amber-200" },
  ACCEPTED: { label: "אושר על ידי ערב", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  DISPUTED: { label: "ערב חולק", className: "bg-red-50 text-red-800 border-red-200" },
  RESOLVED: { label: "נסגר", className: "bg-surface-container text-on-surface-variant border-outline-variant" },
};

export function WarrantyClaimsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.activeRole === "admin";
  const isLandlord = user?.role === "landlord" || user?.activeRole === "landlord";

  const { data: claims, mutate, isLoading } = useSWR<WarrantyClaim[]>("/api/v3/claims", fetcher);
  const { data: guarantors } = useSWR<ApprovedGuarantorOption[]>(
    isLandlord ? "/api/v3/guarantor/approved" : null,
    fetcher
  );

  const [guarantorId, setGuarantorId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});

  const selectedGuarantor = guarantors?.find((g) => g.id === guarantorId);

  async function handleFileClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuarantor) return;
    setSubmitting(true);
    setError(null);
    try {
      await api("/api/v3/claims", {
        method: "POST",
        body: {
          agreementId: selectedGuarantor.agreementId,
          guarantorId: selectedGuarantor.id,
          amount: parseFloat(amount),
          reason,
        },
      });
      setGuarantorId("");
      setAmount("");
      setReason("");
      await mutate();
    } catch (err) {
      setError((err as Error).message || "שגיאה בהגשת תביעה");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(claimId: string) {
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/v3/claims/${claimId}/resolve`, {
        method: "POST",
        body: { resolutionNote: resolveNote[claimId] || undefined },
      });
      await mutate();
    } catch (err) {
      setError((err as Error).message || "שגיאה בסגירת תביעה");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-[28px] font-bold text-tenant-blue mb-1">תביעות ערבות</h1>
        <p className="text-on-surface-variant text-[15px]">
          {isAdmin
            ? "ניהול וסגירת תביעות ערבות שהוגשו על ידי משכירים"
            : "הגשת תביעה נגד ערב מאושר לפי חוזה שכירות פעיל"}
        </p>
      </header>

      {isLandlord && (
        <form
          onSubmit={handleFileClaim}
          className="bg-surface-container-lowest rounded-xl p-6 soft-shadow border border-outline-variant/50 space-y-4"
        >
          <h2 className="text-[18px] font-bold text-tenant-blue">הגשת תביעה חדשה</h2>

          <div>
            <label className="block text-[13px] font-medium mb-1">ערב מאושר</label>
            <select
              value={guarantorId}
              onChange={(e) => setGuarantorId(e.target.value)}
              className="w-full rounded-lg border border-outline-variant px-3 py-2.5 bg-white text-[14px]"
              required
            >
              <option value="">בחר ערב וחוזה</option>
              {(guarantors || []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {g.apartment?.address || g.apartment?.title || g.agreementId.slice(0, 8)}
                </option>
              ))}
            </select>
            {!guarantors?.length && (
              <p className="text-[12px] text-on-surface-variant mt-1">אין ערבים מאושרים. הזמן ערב מדף החוזה.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium mb-1">סכום (₪)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1">סיבת התביעה</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              minLength={5}
              className="w-full rounded-lg border border-outline-variant px-3 py-2.5 bg-white resize-none"
              placeholder="תאר את הנזק או ההפרה..."
              required
            />
          </div>

          {error && <p className="text-[13px] text-admin-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !guarantors?.length}
            className="bg-landlord-green text-white px-6 py-2.5 rounded-full font-bold text-[14px] disabled:opacity-50"
          >
            {submitting ? "שולח..." : "הגש תביעה"}
          </button>
        </form>
      )}

      <section className="bg-surface-container-lowest rounded-xl soft-shadow border border-outline-variant/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/50">
          <h2 className="text-[18px] font-bold text-tenant-blue">תביעות ({claims?.length ?? 0})</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-on-surface-variant">טוען...</div>
        ) : !claims?.length ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline/30">gavel</span>
            <p className="text-on-surface-variant mt-2">אין תביעות ערבות</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/40">
            {claims.map((claim) => {
              const st = STATUS_LABELS[claim.status] || STATUS_LABELS.FILED;
              return (
                <li key={claim.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-bold text-tenant-blue text-[16px]">
                        ₪{Number(claim.amount).toLocaleString()} — {claim.guarantor?.name || "ערב"}
                      </p>
                      <p className="text-[13px] text-on-surface-variant mt-1">{claim.reason}</p>
                      <p className="text-[12px] text-outline mt-2">
                        {new Date(claim.createdAt).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${st.className}`}>
                      {st.label}
                    </span>
                  </div>

                  {isAdmin && claim.status !== "RESOLVED" && (
                    <div className="mt-4 flex flex-wrap gap-2 items-end">
                      <input
                        type="text"
                        placeholder="הערת סגירה (אופציונלי)"
                        value={resolveNote[claim.id] || ""}
                        onChange={(e) =>
                          setResolveNote((prev) => ({ ...prev, [claim.id]: e.target.value }))
                        }
                        className="flex-grow min-w-[200px] rounded-lg border border-outline-variant px-3 py-2 text-[13px]"
                      />
                      <button
                        type="button"
                        onClick={() => handleResolve(claim.id)}
                        disabled={submitting}
                        className="bg-tenant-blue text-white px-4 py-2 rounded-lg text-[13px] font-bold"
                      >
                        סגור תביעה
                      </button>
                    </div>
                  )}

                  {claim.resolutionNote && (
                    <p className="text-[12px] text-on-surface-variant mt-2 bg-surface-container rounded-lg p-2">
                      הערת סגירה: {claim.resolutionNote}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
