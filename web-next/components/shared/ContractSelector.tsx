"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { Contract, RentalAgreementV3 } from "@/lib/types";
import {
  contractToListItem,
  legacyContractToListItem,
  mergeContractListItems,
  v3AgreementToListItem,
} from "@/lib/contract-utils";

const fetcher = <T,>(url: string) => api<T>(url);

interface ContractSelectorProps {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

export function ContractSelector({ value, onChange, label = "בחר חוזה" }: ContractSelectorProps) {
  const searchParams = useSearchParams();
  const urlContractId = searchParams.get("contractId");

  const { data: legacyData, isLoading: legacyLoading } = useSWR<{ contracts: Contract[] }>(
    "/api/contracts",
    fetcher
  );
  const { data: v3Data, isLoading: v3Loading } = useSWR<{ agreements: RentalAgreementV3[] }>(
    "/api/v3/contracts",
    fetcher
  );

  const options = useMemo(() => {
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

  useEffect(() => {
    if (value) return;
    const initial = urlContractId || options[0]?.id;
    if (initial) onChange(initial);
  }, [value, urlContractId, options, onChange]);

  const isLoading = legacyLoading || v3Loading;

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
              {opt.propertyName} — {opt.propertyAddress}
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
