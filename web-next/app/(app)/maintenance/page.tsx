"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { api, apiUpload } from "@/lib/api";
import type { MaintenanceTicketV3 } from "@/lib/types";
import { TICKET_STATUS_LABELS } from "@/lib/contract-utils";
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

function MaintenanceContent() {
  const { user } = useAuth();
  const [contractId, setContractId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicketV3 | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLandlord = user?.activeRole === "landlord" || user?.role === "landlord";

  const { data: tickets, error: fetchError, isLoading, mutate } = useSWR<MaintenanceTicketV3[]>(
    contractId ? `/api/v3/maintenance/agreement/${contractId}` : null,
    fetcher
  );

  async function handleCreate() {
    if (!contractId || !description.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("agreementId", contractId);
      formData.append("description", description);
      if (photo) formData.append("photo", photo);
      await apiUpload("/api/v3/maintenance", formData);
      setCreateOpen(false);
      setDescription("");
      setPhoto(null);
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRespond(ticketId: string) {
    setActionLoading(true);
    try {
      await api(`/api/v3/maintenance/${ticketId}/respond`, {
        method: "POST",
        body: { response: "handling", note: "אני מטפל" },
      });
      await mutate();
      setSelectedTicket(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose(ticketId: string) {
    setActionLoading(true);
    try {
      await api(`/api/v3/maintenance/${ticketId}/close`, { method: "POST" });
      await mutate();
      setSelectedTicket(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-tenant-blue">תחזוקה</h1>
            <p className="text-on-surface-variant text-[14px] mt-1">דיווח וטיפול בתקלות בנכס</p>
          </div>
          {!isLandlord && contractId && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-[48px] px-6 bg-landlord-green text-white font-bold rounded-full"
            >
              פתח קריאה
            </button>
          )}
          {isLandlord && (
            <a
              href="https://www.midrag.co.il"
              target="_blank"
              rel="noopener noreferrer"
              className="h-[48px] px-6 flex items-center gap-2 border border-outline-variant rounded-full text-[14px] font-medium hover:border-landlord-green"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              midrag.co.il
            </a>
          )}
        </div>

        <ContractSelector value={contractId} onChange={setContractId} />

        {error && (
          <div className="bg-[#ffcdd2]/30 border border-[#c62828]/30 rounded-xl p-4 text-[14px] text-[#c62828]">
            {error}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant soft-shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : fetchError ? (
            <div className="p-12 text-center text-on-surface-variant">{(fetchError as Error).message}</div>
          ) : !tickets?.length ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-outline/30 mb-4 block">build</span>
              <p className="text-on-surface-variant">אין קריאות תחזוקה</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {tickets.map((t) => {
                const meta = TICKET_STATUS_LABELS[t.status] || TICKET_STATUS_LABELS.OPEN;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full text-right p-4 hover:bg-surface-container-low transition-colors ${
                      selectedTicket?.id === t.id ? "bg-surface-container-low" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-tenant-blue truncate">
                          {t.description.slice(0, 80)}
                        </p>
                        <p className="text-[12px] text-on-surface-variant mt-1">
                          {new Date(t.createdAt).toLocaleDateString("he-IL")}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[12px] font-medium ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedTicket && (
        <aside className="w-[360px] shrink-0 bg-surface-container-lowest rounded-xl border border-outline-variant soft-shadow p-6 hidden lg:block">
          <h2 className="text-[18px] font-semibold text-tenant-blue mb-4">פרטי קריאה</h2>
          <p className="text-[14px] text-on-surface-variant mb-4">{selectedTicket.description}</p>
          <p className="text-[12px] text-on-surface-variant mb-6">
            נפתח: {new Date(selectedTicket.createdAt).toLocaleString("he-IL")}
          </p>
          {selectedTicket.landlordNote && (
            <p className="text-[14px] mb-4 p-3 bg-surface-container-low rounded-lg">
              {selectedTicket.landlordNote}
            </p>
          )}
          <div className="space-y-2">
            {isLandlord && selectedTicket.status === "OPEN" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRespond(selectedTicket.id)}
                className="w-full h-[40px] bg-landlord-green text-white font-bold rounded-full"
              >
                אני מטפל
              </button>
            )}
            {selectedTicket.status !== "CLOSED" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleClose(selectedTicket.id)}
                className="w-full h-[40px] border border-outline-variant rounded-full font-medium"
              >
                סגור קריאה
              </button>
            )}
          </div>
        </aside>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-tenant-blue">פתיחת קריאת תחזוקה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תאר את התקלה..."
              rows={4}
              className="w-full rounded-lg border border-outline-variant p-4 focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="w-full text-[14px]"
            />
            <button
              type="button"
              disabled={actionLoading || !description.trim()}
              onClick={handleCreate}
              className="w-full h-[48px] bg-landlord-green text-white font-bold rounded-full disabled:opacity-50"
            >
              {actionLoading ? "שולח..." : "פתח קריאה"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <MaintenanceContent />
    </Suspense>
  );
}
