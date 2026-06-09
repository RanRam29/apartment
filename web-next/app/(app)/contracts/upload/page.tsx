"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api, apiUpload } from "@/lib/api";
import type { Apartment, ContractUploadResponse } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = <T,>(url: string) => api<T>(url);

interface LandlordDashboard {
  listings: Apartment[];
}

const STEPS = ["העלאת קובץ", "סקירת נתונים", "אישור ושליחה"];

export default function ContractUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [propertyId, setPropertyId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [fields, setFields] = useState({
    startDate: "",
    endDate: "",
    monthlyRentIls: "",
    paymentDueDay: "1",
    cpiLinked: false,
  });

  const { data: dashboard, isLoading: listingsLoading } = useSWR<LandlordDashboard>(
    "/api/landlord/dashboard",
    fetcher
  );

  const listings = dashboard?.listings || [];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const valid =
      selected.type === "application/pdf" ||
      selected.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      selected.name.endsWith(".pdf") ||
      selected.name.endsWith(".docx");
    if (!valid) {
      setError("ניתן להעלות רק קבצי PDF או DOCX");
      return;
    }
    setFile(selected);
    setError(null);
  }

  async function handleUpload() {
    if (!file || !propertyId) {
      setError("יש לבחור נכס ולהעלות קובץ");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("contract", file);
      formData.append("propertyId", propertyId);

      const result = await apiUpload<ContractUploadResponse>("/api/v3/contracts/upload", formData);
      const extracted = result.extracted || {};
      const agreement = result.agreement;

      setAgreementId(agreement.id);
      setFields({
        startDate: String(extracted.startDate || agreement.startDate || ""),
        endDate: String(extracted.endDate || agreement.endDate || ""),
        monthlyRentIls: String(extracted.monthlyRent || agreement.monthlyRentIls || ""),
        paymentDueDay: String(extracted.paymentDay || agreement.paymentDueDay || "1"),
        cpiLinked: Boolean(extracted.cpiLinked ?? agreement.cpiLinked),
      });
      setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveAndSend() {
    if (!agreementId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/v3/contracts/${agreementId}/fields`, {
        method: "PATCH",
        body: {
          startDate: fields.startDate || undefined,
          endDate: fields.endDate || undefined,
          monthlyRentIls: fields.monthlyRentIls ? Number(fields.monthlyRentIls) : undefined,
          paymentDueDay: fields.paymentDueDay ? Number(fields.paymentDueDay) : undefined,
          cpiLinked: fields.cpiLinked,
        },
      });

      try {
        await api(`/api/v3/contracts/${agreementId}/transition`, {
          method: "POST",
          body: { targetStatus: "PENDING_SIGN" },
        });
      } catch {
        // Transition may fail if tenant not invited — still redirect to detail
      }

      router.push(`/contracts/${agreementId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (listingsLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contracts" className="text-on-surface-variant hover:text-tenant-blue">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[28px] font-bold text-tenant-blue">העלאת חוזה</h1>
      </div>

      <div className="flex items-center justify-between gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold ${
                i <= step
                  ? "bg-landlord-green text-white"
                  : "bg-surface-container-low text-on-surface-variant border border-outline-variant"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-[12px] text-center ${i <= step ? "text-tenant-blue font-medium" : "text-on-surface-variant"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-[#ffcdd2]/30 border border-[#c62828]/30 rounded-xl p-4 text-[14px] text-[#c62828]">
          {error}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant soft-shadow">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="block text-[14px] font-medium text-tenant-blue mb-2">בחר נכס</label>
              {listings.length > 0 ? (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full h-[48px] rounded-lg border border-outline-variant px-4 bg-surface-container-lowest focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
                >
                  <option value="">— בחר נכס —</option>
                  {listings.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.title} — {apt.city}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-on-surface-variant text-[14px]">
                  אין נכסים פעילים.{" "}
                  <Link href="/dashboard" className="text-landlord-green font-medium">
                    הוסף נכס בלוח הבקרה
                  </Link>
                </p>
              )}
            </div>

            <div>
              <label className="block text-[14px] font-medium text-tenant-blue mb-2">
                קובץ חוזה (PDF / DOCX)
              </label>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-outline-variant rounded-xl cursor-pointer hover:border-landlord-green transition-colors bg-surface-container-low">
                <span className="material-symbols-outlined text-[40px] text-outline mb-2">cloud_upload</span>
                <span className="text-[14px] text-on-surface-variant">
                  {file ? file.name : "לחץ לבחירת קובץ"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <button
              type="button"
              disabled={uploading || !file || !propertyId}
              onClick={handleUpload}
              className="w-full h-[48px] bg-landlord-green text-white font-bold rounded-full disabled:opacity-50"
            >
              {uploading ? "מעלה ומנתח..." : "המשך לסקירה"}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <p className="text-[14px] text-on-surface-variant">
              Gemini חילץ את הנתונים מהחוזה. בדוק ותקן לפני השליחה.
            </p>
            <div className="grid gap-4">
              <div>
                <label className="block text-[12px] text-on-surface-variant mb-1">תאריך התחלה</label>
                <input
                  type="date"
                  value={fields.startDate}
                  onChange={(e) => setFields((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full h-[48px] rounded-lg border border-outline-variant px-4 focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
                />
              </div>
              <div>
                <label className="block text-[12px] text-on-surface-variant mb-1">תאריך סיום</label>
                <input
                  type="date"
                  value={fields.endDate}
                  onChange={(e) => setFields((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full h-[48px] rounded-lg border border-outline-variant px-4 focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
                />
              </div>
              <div>
                <label className="block text-[12px] text-on-surface-variant mb-1">שכר דירה (₪)</label>
                <input
                  type="number"
                  value={fields.monthlyRentIls}
                  onChange={(e) => setFields((f) => ({ ...f, monthlyRentIls: e.target.value }))}
                  className="w-full h-[48px] rounded-lg border border-outline-variant px-4 focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
                />
              </div>
              <div>
                <label className="block text-[12px] text-on-surface-variant mb-1">יום תשלום בחודש</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={fields.paymentDueDay}
                  onChange={(e) => setFields((f) => ({ ...f, paymentDueDay: e.target.value }))}
                  className="w-full h-[48px] rounded-lg border border-outline-variant px-4 focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fields.cpiLinked}
                  onChange={(e) => setFields((f) => ({ ...f, cpiLinked: e.target.checked }))}
                  className="w-5 h-5 accent-landlord-green"
                />
                <span className="text-[14px] text-tenant-blue">שכר דירה צמוד למדד</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex-1 h-[48px] border border-outline-variant rounded-full font-medium"
              >
                חזרה
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 h-[48px] bg-landlord-green text-white font-bold rounded-full"
              >
                המשך לאישור
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-[18px] font-semibold text-tenant-blue">סיכום לפני שליחה</h2>
            <div className="bg-surface-container-low rounded-lg p-4 space-y-2 text-[14px]">
              <p><span className="text-on-surface-variant">תאריכים:</span> {fields.startDate} – {fields.endDate}</p>
              <p><span className="text-on-surface-variant">שכר דירה:</span> ₪ {Number(fields.monthlyRentIls || 0).toLocaleString("he-IL")}</p>
              <p><span className="text-on-surface-variant">יום תשלום:</span> {fields.paymentDueDay}</p>
              <p><span className="text-on-surface-variant">צמוד למדד:</span> {fields.cpiLinked ? "כן" : "לא"}</p>
            </div>
            <p className="text-[13px] text-on-surface-variant">
              לאחר האישור, החוזה יישמר במערכת. תוכל להזמין שוכר ולשלוח לחתימה מדף פרטי החוזה.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-[48px] border border-outline-variant rounded-full font-medium"
              >
                חזרה
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveAndSend}
                className="flex-1 h-[48px] bg-landlord-green text-white font-bold rounded-full disabled:opacity-50"
              >
                {submitting ? "שומר..." : "אשר ושלח לחתימה"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
