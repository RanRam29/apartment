"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

const fetcher = <T,>(url: string) => api<T>(url);

interface Lead {
  id: string;
  tenantId: string;
  apartmentId: string;
  tenant?: { id: string; firstName: string; lastName: string; email?: string };
  apartment?: { id: string; title: string };
}

interface LeadsResponse {
  leads: Lead[];
}

interface InviteTenantFormProps {
  contractId: string;
  propertyId: string;
  onInvited: () => void;
}

export function InviteTenantForm({ contractId, propertyId, onInvited }: InviteTenantFormProps) {
  const [tenantUserId, setTenantUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: leadsData } = useSWR<LeadsResponse>(
    "/api/landlord/leads?status=accepted&limit=50",
    fetcher
  );

  const matchingLeads = (leadsData?.leads || []).filter(
    (l) => l.apartmentId === propertyId || l.apartment?.id === propertyId
  );
  const allLeads = leadsData?.leads || [];

  async function handleInvite(userId: string) {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/v3/contracts/${contractId}/invite-tenant`, {
        method: "POST",
        body: { tenantUserId: userId },
      });
      setTenantUserId("");
      onInvited();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant soft-shadow">
      <h2 className="text-[18px] font-semibold text-tenant-blue mb-2">הזמנת שוכר</h2>
      <p className="text-[14px] text-on-surface-variant mb-4">
        בחר שוכר ממאצ&apos;ים שאושרו או הזן מזהה משתמש.
      </p>

      {(matchingLeads.length > 0 ? matchingLeads : allLeads).length > 0 && (
        <div className="space-y-2 mb-4">
          {(matchingLeads.length > 0 ? matchingLeads : allLeads).slice(0, 5).map((lead) => (
            <button
              key={lead.id}
              type="button"
              disabled={loading}
              onClick={() => handleInvite(lead.tenantId || lead.tenant?.id || "")}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:border-landlord-green text-right transition-colors"
            >
              <span className="material-symbols-outlined text-landlord-green">person_add</span>
              <span className="text-[14px] font-medium text-tenant-blue">
                {lead.tenant?.firstName} {lead.tenant?.lastName}
                {lead.apartment?.title && (
                  <span className="text-on-surface-variant font-normal"> · {lead.apartment.title}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={tenantUserId}
          onChange={(e) => setTenantUserId(e.target.value)}
          placeholder="מזהה משתמש (UUID)"
          className="flex-1 h-[48px] rounded-lg border border-outline-variant px-4 focus:border-landlord-green focus:ring-1 focus:ring-landlord-green"
        />
        <button
          type="button"
          disabled={loading || !tenantUserId.trim()}
          onClick={() => handleInvite(tenantUserId.trim())}
          className="h-[48px] px-6 bg-landlord-green text-white font-bold rounded-full disabled:opacity-50 shrink-0"
        >
          {loading ? "..." : "הזמן"}
        </button>
      </div>

      {error && <p className="text-[13px] text-[#c62828] mt-3">{error}</p>}
    </div>
  );
}
