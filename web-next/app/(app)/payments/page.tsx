"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { api, apiUpload } from "@/lib/api";
import type { LedgerRowV3 } from "@/lib/types";
import { LEDGER_STATUS_LABELS, formatCurrency } from "@/lib/contract-utils";
import { ContractSelector } from "@/components/shared/ContractSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const fetcher = <T,>(url: string) => api<T>(url);

function PaymentsContent() {
  const { user } = useAuth();
  const [contractId, setContractId] = useState("");
  const [reportRowId, setReportRowId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLandlord = user?.activeRole === "landlord" || user?.role === "landlord";

  const { data: rows, error: fetchError, isLoading, mutate } = useSWR<LedgerRowV3[]>(
    contractId ? `/api/v3/ledger/agreement/${contractId}` : null,
    fetcher
  );

  async function handleReport() {
    if (!reportRowId) return;
    setActionLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (receiptFile) formData.append("receipt", receiptFile);
      await apiUpload(`/api/v3/ledger/${reportRowId}/report`, formData);
      setReportRowId(null);
      setReceiptFile(null);
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLandlordAction(rowId: string, action: "confirm" | "reject") {
    setActionLoading(true);
    setError(null);
    try {
      await api(`/api/v3/ledger/${rowId}/${action}`, { method: "POST" });
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-tenant-blue">תשלומים</h1>
        <p className="text-on-surface-variant text-[14px] mt-1">מעקב אחר תשלומי שכירות לפי חוזה</p>
      </div>

      <ContractSelector value={contractId} onChange={setContractId} />

      {error && (
        <div className="bg-[#ffcdd2]/30 border border-[#c62828]/30 rounded-xl p-4 text-[14px] text-[#c62828]">
          {error}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant soft-shadow">
        {isLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : fetchError ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-destructive mb-4">error</span>
            <p className="text-on-surface-variant mb-4">{(fetchError as Error).message}</p>
            <button type="button" onClick={() => mutate()} className="h-[40px] px-6 bg-landlord-green text-white font-bold rounded-full">
              נסה שוב
            </button>
          </div>
        ) : !contractId ? (
          <div className="p-12 text-center text-on-surface-variant">בחר חוזה להצגת תשלומים</div>
        ) : !rows?.length ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline/30 mb-4 block">receipt_long</span>
            <p className="text-on-surface-variant">אין רשומות תשלום לחוזה זה</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[700px]">
              <thead className="bg-surface-container-low border-b border-outline-variant text-[14px]">
                <tr>
                  <th className="px-6 py-4 font-bold">תקופה</th>
                  <th className="px-6 py-4 font-bold">תאריך יעד</th>
                  <th className="px-6 py-4 font-bold">סכום</th>
                  <th className="px-6 py-4 font-bold">סטטוס</th>
                  <th className="px-6 py-4 font-bold">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.map((row) => {
                  const meta = LEDGER_STATUS_LABELS[row.status] || LEDGER_STATUS_LABELS.PENDING;
                  return (
                    <tr key={row.id}>
                      <td className="px-6 py-4 text-[14px]">{row.period}</td>
                      <td className="px-6 py-4 text-[14px] text-on-surface-variant">{row.dueDate}</td>
                      <td className="px-6 py-4 font-bold text-tenant-blue">
                        {formatCurrency(Number(row.amount))}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {row.receiptR2Key && (
                            <span className="material-symbols-outlined text-[20px] text-landlord-green" title="קבלה מצורפת">
                              receipt
                            </span>
                          )}
                          {!isLandlord && row.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => setReportRowId(row.id)}
                              className="h-9 px-4 bg-landlord-green text-white text-[13px] font-bold rounded-full"
                            >
                              דווח תשלום
                            </button>
                          )}
                          {isLandlord && row.status === "REPORTED" && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleLandlordAction(row.id, "confirm")}
                                className="h-9 px-3 bg-landlord-green text-white text-[13px] font-bold rounded-full"
                              >
                                אשר ✓
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleLandlordAction(row.id, "reject")}
                                className="h-9 px-3 border border-[#c62828] text-[#c62828] text-[13px] font-bold rounded-full"
                              >
                                דחה ✗
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!reportRowId} onOpenChange={(v) => !v && setReportRowId(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-tenant-blue">דיווח תשלום</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block">
              <span className="text-[14px] text-on-surface-variant mb-2 block">העלאת קבלה (אופציונלי)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full text-[14px]"
              />
            </label>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleReport}
              className="w-full h-[48px] bg-landlord-green text-white font-bold rounded-full disabled:opacity-50"
            >
              {actionLoading ? "שולח..." : "שלח דיווח"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <PaymentsContent />
    </Suspense>
  );
}
