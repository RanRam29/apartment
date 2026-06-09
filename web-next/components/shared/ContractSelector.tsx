"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { Contract } from "@/lib/types";
import { contractToListItem, legacyContractToListItem } from "@/lib/contract-utils";

const fetcher = <T,>(url: string) => api<T>(url);

interface ContractSelectorProps {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

export function ContractSelector({ value, onChange, label = "בחר חוזה" }: ContractSelectorProps) {
  const searchParams = useSearchParams();
  const urlContractId = searchParams.get("contractId");

  const { data, isLoading } = useSWR<{ contracts: Contract[] }>("/api/contracts", fetcher);

  const options = useMemo(() => {
    const raw = data?.contracts || [];
    return raw.map((c) => {
      const legacy = c as unknown as Record<string, unknown>;
      const item = legacy.apartmentTitle || legacy._id
        ? legacyContractToListItem(legacy)
        : contractToListItem(c);
      return { id: item.id, label: `${item.propertyName} — ${item.propertyAddress}` };
    });
  }, [data]);

  useEffect(() => {
    if (value) return;
    const initial = urlContractId || options[0]?.id;
    if (initial) onChange(initial);
  }, [value, urlContractId, options, onChange]);

  return (
    <div>
      <label className="block text-[14px] font-medium text-tenant-blue mb-2">{label}</label>
      {isLoading ? (
        <div className="h-[48px] rounded-lg bg-surface-container-low animate-pulse" />
      ) : options.length > 0 ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-[48px] rounded-lg border border-outline-variant px-4 bg-surface-container-lowest focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-[14px] text-on-surface-variant">
          אין חוזים זמינים.{" "}
          <a href="/contracts" className="text-landlord-green font-medium">
            עבור לחוזים
          </a>
        </p>
      )}
    </div>
  );
}
