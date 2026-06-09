"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { Contract, RentalAgreementV3 } from "@/lib/types";
import {
  contractToListItem,
  legacyContractToListItem,
  mergeContractListItems,
  v3AgreementToListItem,
} from "@/lib/contract-utils";
import { ContractStatusBadge } from "@/components/shared/ContractStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const fetcher = <T,>(url: string) => api<T>(url);

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "UPLOAD", label: "הועלה" },
  { value: "PENDING_SIGN", label: "ממתין לחתימה" },
  { value: "ACTIVE", label: "פעיל" },
  { value: "EXPIRING", label: "לקראת סיום" },
  { value: "ENDED", label: "הסתיים" },
];

export default function ContractsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const isLandlord = user?.activeRole === "landlord" || user?.role === "landlord";

  const { data: legacyData, error: legacyError, isLoading: legacyLoading, mutate } = useSWR<{
    contracts: Contract[];
  }>("/api/contracts", fetcher);

  const { data: v3Data, error: v3Error, isLoading: v3Loading } = useSWR<{
    agreements: RentalAgreementV3[];
  }>("/api/v3/contracts", fetcher);

  const isLoading = legacyLoading || v3Loading;
  const error = legacyError || v3Error;

  const items = useMemo(() => {
    const legacyItems = (legacyData?.contracts || []).map((c) => {
      const legacy = c as unknown as Record<string, unknown>;
      if (legacy.apartmentTitle || legacy._id) {
        return legacyContractToListItem(legacy);
      }
      return contractToListItem(c);
    });
    const v3Items = (v3Data?.agreements || []).map((a) => v3AgreementToListItem(a));
    return mergeContractListItems(legacyItems, v3Items);
  }, [legacyData, v3Data]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((c) => String(c.status).toUpperCase() === statusFilter);
  }, [items, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-outline-variant soft-shadow">
        <span className="material-symbols-outlined text-[48px] text-destructive mb-4">error</span>
        <h2 className="text-[22px] font-semibold text-tenant-blue mb-2">שגיאה בטעינת החוזים</h2>
        <p className="text-on-surface-variant mb-6">{(error as Error).message}</p>
        <button
          type="button"
          onClick={() => mutate()}
          className="h-[48px] px-8 bg-landlord-green text-white font-bold rounded-full"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-tenant-blue">חוזים</h1>
          <p className="text-on-surface-variant text-[14px] mt-1">
            ניהול חוזי שכירות, חתימות ותיקונים
          </p>
        </div>
        {isLandlord && (
          <Link
            href="/contracts/upload"
            className="inline-flex items-center justify-center gap-2 h-[48px] px-6 bg-landlord-green text-white font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            העלאת חוזה
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={`px-4 py-2 rounded-full text-[14px] font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-landlord-green text-white"
                : "bg-surface-container-low text-on-surface-variant border border-outline-variant hover:border-landlord-green"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant soft-shadow">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[720px]">
              <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant text-[14px] font-medium">
                <tr>
                  <th className="px-6 py-4 font-bold">נכס</th>
                  <th className="px-6 py-4 font-bold">סטטוס</th>
                  <th className="px-6 py-4 font-bold">תאריכים</th>
                  <th className="px-6 py-4 font-bold">שכ&quot;ד</th>
                  <th className="px-6 py-4 font-bold">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-[14px] font-medium text-tenant-blue">{c.propertyName}</p>
                      <p className="text-[12px] text-on-surface-variant">{c.propertyAddress}</p>
                    </td>
                    <td className="px-6 py-4">
                      <ContractStatusBadge status={String(c.status)} />
                    </td>
                    <td className="px-6 py-4 text-[12px] text-on-surface-variant whitespace-nowrap">
                      {c.startDate} – {c.endDate}
                    </td>
                    <td className="px-6 py-4 font-bold text-tenant-blue whitespace-nowrap">
                      ₪ {c.monthlyRent.toLocaleString("he-IL")}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/contracts/${c.id}`}
                        className="inline-flex items-center gap-1 text-[#006b5f] hover:text-[#0b6f63] text-[14px] font-medium"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                        צפייה
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[64px] text-outline/30 mb-4 block">
              description
            </span>
            <h3 className="text-[18px] font-semibold text-tenant-blue mb-2">אין חוזים להצגה</h3>
            <p className="text-on-surface-variant text-[14px] mb-6">
              {statusFilter !== "all"
                ? "לא נמצאו חוזים בסטטוס זה. נסה לשנות את הפילטר."
                : isLandlord
                  ? "העלה חוזה ראשון כדי להתחיל בתהליך החתימה הדיגיטלית."
                  : "כשתתווסף לחוזה, הוא יופיע כאן."}
            </p>
            {isLandlord && statusFilter === "all" && (
              <Link
                href="/contracts/upload"
                className="inline-flex items-center gap-2 h-[48px] px-8 bg-landlord-green text-white font-bold rounded-full"
              >
                <span className="material-symbols-outlined">upload_file</span>
                העלאת חוזה
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
