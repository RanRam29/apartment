"use client";

import { Suspense, useEffect, useState } from "react";
import useSWR from "swr";
import { api, apiUpload } from "@/lib/api";
import type { AgreementRoom, RentalAgreementV3 } from "@/lib/types";
import { ContractSelector } from "@/components/shared/ContractSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const fetcher = <T,>(url: string) => api<T>(url);

type CheckMode = "CHECK_IN" | "CHECK_OUT";

function CheckinContent() {
  const { user } = useAuth();
  const [contractId, setContractId] = useState("");
  const [mode, setMode] = useState<CheckMode>("CHECK_IN");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fixRound, setFixRound] = useState(0);

  const isLandlord = user?.activeRole === "landlord" || user?.role === "landlord";

  const { data: agreement, isLoading, mutate } = useSWR<RentalAgreementV3>(
    contractId ? `/api/v3/contracts/${contractId}` : null,
    fetcher
  );

  const rooms = agreement?.rooms || [];
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length || !contractId || !activeRoom) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      Array.from(files).slice(0, 20).forEach((f) => formData.append("photos", f));
      const endpoint =
        mode === "CHECK_IN"
          ? `/api/v3/contracts/${contractId}/checkin/${activeRoom.id}/photos`
          : `/api/v3/contracts/${contractId}/checkout/${activeRoom.id}/photos`;
      await apiUpload(endpoint, formData);
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCompleteCheckin() {
    if (!contractId) return;
    setUploading(true);
    try {
      await api(`/api/v3/contracts/${contractId}/checkin/complete`, { method: "POST" });
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCheckoutReview(approved: boolean) {
    if (!contractId || !activeRoom) return;
    setUploading(true);
    try {
      await api(`/api/v3/contracts/${contractId}/checkout/review`, {
        method: "POST",
        body: { roomId: activeRoom.id, notes: reviewNotes, approved },
      });
      if (!approved) setFixRound((r) => r + 1);
      setReviewNotes("");
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCompleteCheckout() {
    if (!contractId) return;
    setUploading(true);
    try {
      await api(`/api/v3/contracts/${contractId}/checkout/complete`, { method: "POST" });
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function roomPhotos(room: AgreementRoom): string[] {
    return mode === "CHECK_IN" ? room.checkinPhotos || [] : room.checkoutPhotos || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-tenant-blue">כניסה / יציאה</h1>
        <p className="text-on-surface-variant text-[14px] mt-1">תיעוד מצב הדירה בכניסה וביציאה</p>
      </div>

      <ContractSelector value={contractId} onChange={setContractId} />

      <div className="flex gap-2">
        {(["CHECK_IN", "CHECK_OUT"] as CheckMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-5 py-2 rounded-full text-[14px] font-medium ${
              mode === m
                ? "bg-landlord-green text-white"
                : "bg-surface-container-low border border-outline-variant text-on-surface-variant"
            }`}
          >
            {m === "CHECK_IN" ? "כניסה" : "יציאה"}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-[#ffcdd2]/30 border border-[#c62828]/30 rounded-xl p-4 text-[14px] text-[#c62828]">
          {error}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !agreement ? (
        <div className="p-12 text-center text-on-surface-variant">בחר חוזה פעיל</div>
      ) : agreement.status !== "ACTIVE" ? (
        <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant">
          <p className="text-on-surface-variant">כניסה/יציאה זמינה רק לחוזים פעילים</p>
        </div>
      ) : (
        <>
          {mode === "CHECK_OUT" && fixRound > 0 && (
            <p className="text-[13px] text-[#856404] bg-[#fff3cd]/50 rounded-lg px-4 py-2">
              סבב תיקון {fixRound}/3
              {fixRound >= 3 && " — אישור אוטומטי לאחר 3 סבבים"}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setActiveRoomId(room.id)}
                className={`px-4 py-2 rounded-lg text-[14px] font-medium ${
                  activeRoom?.id === room.id
                    ? "bg-tenant-blue text-white"
                    : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>

          {activeRoom && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
                <h2 className="text-[18px] font-semibold text-tenant-blue mb-4">{activeRoom.name}</h2>

                {!isLandlord && (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-outline-variant rounded-xl cursor-pointer hover:border-landlord-green mb-4">
                    <span className="material-symbols-outlined text-[32px] text-outline mb-1">add_a_photo</span>
                    <span className="text-[13px] text-on-surface-variant">
                      {uploading ? "מעלה..." : "העלה עד 20 תמונות"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => handlePhotoUpload(e.target.files)}
                    />
                  </label>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {roomPhotos(activeRoom).map((key, i) => (
                    <div
                      key={`${key}-${i}`}
                      className="aspect-square bg-surface-container-low rounded-lg flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-outline">image</span>
                    </div>
                  ))}
                </div>

                {activeRoom.checkoutNotes && mode === "CHECK_OUT" && (
                  <p className="mt-4 text-[13px] text-[#c62828] p-3 bg-[#ffcdd2]/20 rounded-lg">
                    הערת משכיר: {activeRoom.checkoutNotes}
                  </p>
                )}
              </div>

              {mode === "CHECK_OUT" && (
                <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
                  <h3 className="text-[16px] font-semibold text-tenant-blue mb-3">השוואה לכניסה</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(activeRoom.checkinPhotos || []).map((key, i) => (
                      <div key={`in-${i}`} className="aspect-square bg-surface-container-low rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-outline text-[20px]">image</span>
                      </div>
                    ))}
                  </div>
                  {!activeRoom.checkinPhotos?.length && (
                    <p className="text-[13px] text-on-surface-variant mt-2">אין תמונות כניסה לחדר זה</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {isLandlord && mode === "CHECK_IN" && !agreement.checkinCompletedAt && (
              <button
                type="button"
                disabled={uploading}
                onClick={handleCompleteCheckin}
                className="h-[48px] px-8 bg-landlord-green text-white font-bold rounded-full"
              >
                אשר כניסה ✓
              </button>
            )}
            {isLandlord && mode === "CHECK_OUT" && activeRoom && (
              <>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleCheckoutReview(true)}
                  className="h-[48px] px-6 bg-landlord-green text-white font-bold rounded-full"
                >
                  אשר ✓
                </button>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="הערות לתיקון"
                  className="h-[48px] flex-1 min-w-[200px] rounded-lg border border-outline-variant px-4"
                />
                <button
                  type="button"
                  disabled={uploading || !reviewNotes.trim()}
                  onClick={() => handleCheckoutReview(false)}
                  className="h-[48px] px-6 border border-[#c62828] text-[#c62828] font-bold rounded-full"
                >
                  בקש תיקון
                </button>
              </>
            )}
            {!isLandlord && mode === "CHECK_OUT" && (
              <button
                type="button"
                disabled={uploading}
                onClick={handleCompleteCheckout}
                className="h-[48px] px-8 bg-landlord-green text-white font-bold rounded-full"
              >
                סיים יציאה
              </button>
            )}
          </div>

          {agreement.checkinCompletedAt && mode === "CHECK_IN" && (
            <p className="text-[14px] text-[#0b6f63] flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              כניסה אושרה ב-{new Date(agreement.checkinCompletedAt).toLocaleDateString("he-IL")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <CheckinContent />
    </Suspense>
  );
}
