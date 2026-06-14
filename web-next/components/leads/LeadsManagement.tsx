"use client";

import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";
import type { Match, User, Apartment } from "@/lib/types";

// Extends Match with extra properties returned by the backend leads endpoint
type Lead = Match & {
  tenant: User;
  apartment: Apartment;
  compatibilityScore?: number;
  leadScore?: number;
  qualityBadge?: "High" | "Medium" | "Low";
};

interface LeadsApiResponse {
  leads: Lead[];
  total: number;
  page: number;
  totalPages: number;
}

export function LeadsManagement() {
  const { token } = useAuth();
  
  // Component State
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "rejected">("pending");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch leads based on active status tab (pending = "חדשים", accepted = "מאושרים", rejected = "נדחו")
  const { data, isLoading, mutate } = useApi<LeadsApiResponse>(
    `/api/landlord/leads?status=${activeTab}`
  );

  // Mock fallbacks for high-fidelity empty states or first-load visuals
  const mockLeads: Lead[] = [
    {
      id: "mock-lead-1",
      tenantId: "t-1",
      landlordId: "l-1",
      apartmentId: "apt-1",
      status: "pending",
      compatibilityScore: 87,
      qualityBadge: "High",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenant: {
        id: "t-1",
        email: "itay@example.com",
        firstName: "איתי",
        lastName: "לוי",
        role: "tenant",
        activeRole: "tenant",
        kycStatus: "APPROVED",
        trustScore: 87,
        tosAcceptedAt: new Date().toISOString(),
        whatsappOptIn: true,
        avatarUrl: "https://lh3.googleusercontent.com/aida/AP1WRLt1UhsCmpE7PJWo_7nPHO1n3hRvBDyTYw_pozlSomZrZmvoQ0NCF9_JAMNHtIg9mhhwSvWC99axYNrN9v_ZVo8lpHiKyX9XRwjAp7A7NYCvXNVHtWWih2flqjWC50TggwZM5z10bduN6W6R5YuFZpPihWfjsaKHW_JM5g2J9OHnsP7rtHIhzCLBSf9hhgeoL3ujRt64R6ZuIvNGYUlGhgHR18EEaWw7rGzZGKWOnGb2LAglvWq1qD8u",
        createdAt: new Date().toISOString(),
      },
      apartment: {
        id: "apt-1",
        title: "פנטהאוז רח' הירקון 12",
        description: "",
        address: "הירקון 12, תל אביב",
        city: "תל אביב",
        price: 12000,
        rooms: 4,
        amenities: [],
        images: [],
        landlordId: "l-1",
        isActive: true,
        createdAt: new Date().toISOString(),
      }
    },
    {
      id: "mock-lead-2",
      tenantId: "t-2",
      landlordId: "l-1",
      apartmentId: "apt-2",
      status: "pending",
      compatibilityScore: 92,
      qualityBadge: "High",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenant: {
        id: "t-2",
        email: "michal@example.com",
        firstName: "מיכל",
        lastName: "כהן",
        role: "tenant",
        activeRole: "tenant",
        kycStatus: "APPROVED",
        trustScore: 92,
        tosAcceptedAt: new Date().toISOString(),
        whatsappOptIn: true,
        avatarUrl: "https://lh3.googleusercontent.com/aida/AP1WRLsGKFjTHv75NZXZdOuKoGTjSTJ1rwkB1ejk6ZEISSe4w_poH1iQk0LZjNo145ZII4H8pLfCWeSmaH4pyYDxwswESENxwFCRPp_SAvO3P7nQWlPwEasssmvQbqcdYEpM44J4MGKPsHmGy8--1za10o8lh3rYXVcXCw2mndIjNZRekJfGBcbR0ulrCQDEHVLmfcWSalHXXtICCzW1AobB889IRzZKhGAtLvCkZXhWsRADnxgDkOobY9C-UQ",
        createdAt: new Date().toISOString(),
      },
      apartment: {
        id: "apt-2",
        title: "דירת 3 חדרים, רמת גן",
        description: "",
        address: "ז'בוטינסקי 45, רמת גן",
        city: "רמת גן",
        price: 5800,
        rooms: 3,
        amenities: [],
        images: [],
        landlordId: "l-1",
        isActive: true,
        createdAt: new Date().toISOString(),
      }
    },
    {
      id: "mock-lead-3",
      tenantId: "t-3",
      landlordId: "l-1",
      apartmentId: "apt-3",
      status: "pending",
      compatibilityScore: 64,
      qualityBadge: "Medium",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenant: {
        id: "t-3",
        email: "yosi@example.com",
        firstName: "יוסי",
        lastName: "אברהם",
        role: "tenant",
        activeRole: "tenant",
        kycStatus: "APPROVED",
        trustScore: 64,
        tosAcceptedAt: new Date().toISOString(),
        whatsappOptIn: false,
        avatarUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvmx04aQlfa0KUnY9vTvywiiV__n1BQyPXjcA-30Vi5NYa4qjJZfqrCfbLUXZMfpAx-TfFw_wFMXa3zcQbV6tmTCBcABc0eoyE5ManCeml5k0E4mKOKSOhqQlWpIRn0DFg69BblSLixas1dP9Yo7ZvO78wZE1WoQpWrr8oEAVKW3BowNEHI8oYKF4pheYZ1EZz8gaFBJ90W80L0vMVTD0dZ6P-tF_db_dKGr6EmVmRyCYz077ixX0TqWA",
        createdAt: new Date().toISOString(),
      },
      apartment: {
        id: "apt-3",
        title: "סטודיו ברחוב בן יהודה",
        description: "",
        address: "בן יהודה 82, תל אביב",
        city: "תל אביב",
        price: 4500,
        rooms: 1.5,
        amenities: [],
        images: [],
        landlordId: "l-1",
        isActive: true,
        createdAt: new Date().toISOString(),
      }
    }
  ];

  const [mockLeadsState, setMockLeadsState] = useState<Record<"pending" | "accepted" | "rejected", Lead[]>>({
    pending: mockLeads,
    accepted: [],
    rejected: [],
  });

  // Action handlers: Accept (Approve) / Reject (Decline)
  const handleAccept = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening side panel
    setActionLoadingId(leadId);
    if (leadId.startsWith("mock-")) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setMockLeadsState(prev => {
        const lead = prev.pending.find(l => l.id === leadId);
        if (!lead) return prev;
        return {
          ...prev,
          pending: prev.pending.filter(l => l.id !== leadId),
          accepted: [...prev.accepted, { ...lead, status: "accepted" }],
        };
      });
      setActionLoadingId(null);
      if (selectedLead?.id === leadId) setSelectedLead(null);
      return;
    }
    try {
      await api(`/api/matches/${leadId}/accept`, {
        method: "POST",
        token: token || undefined,
      });
      mutate();
      if (selectedLead?.id === leadId) setSelectedLead(null);
    } catch (err) {
      console.error("Failed to accept lead:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening side panel
    setActionLoadingId(leadId);
    if (leadId.startsWith("mock-")) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setMockLeadsState(prev => {
        const lead = prev.pending.find(l => l.id === leadId);
        if (!lead) return prev;
        return {
          ...prev,
          pending: prev.pending.filter(l => l.id !== leadId),
          rejected: [...prev.rejected, { ...lead, status: "rejected" }],
        };
      });
      setActionLoadingId(null);
      if (selectedLead?.id === leadId) setSelectedLead(null);
      return;
    }
    try {
      await api(`/api/matches/${leadId}/reject`, {
        method: "POST",
        token: token || undefined,
      });
      mutate();
      if (selectedLead?.id === leadId) setSelectedLead(null);
    } catch (err) {
      console.error("Failed to reject lead:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeLeads = data?.leads?.length ? data.leads : mockLeadsState[activeTab];
  // Apply visual filter tabs count (mock values if not supplied by API)
  const pendingCount = activeTab === "pending"
    ? (data ? data.total : mockLeadsState.pending.length)
    : (data ? 7 : mockLeadsState.pending.length);
  const acceptedCount = activeTab === "accepted"
    ? (data ? data.total : mockLeadsState.accepted.length)
    : (data ? 23 : mockLeadsState.accepted.length);
  const rejectedCount = activeTab === "rejected"
    ? (data ? data.total : mockLeadsState.rejected.length)
    : (data ? 5 : mockLeadsState.rejected.length);

  return (
    <div className="space-y-8 text-right relative min-h-screen pb-[64px]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div className="flex flex-col items-start">
          <h1 className="font-h1-web text-h1-web text-tenant-blue text-[36px] font-bold mb-2">
            ניהול לידים נכנסים
          </h1>
          <p className="font-body text-body text-on-surface-variant text-[16px]">
            סקירה ואישור שוכרים פוטנציאליים עבור הנכסים שלך
          </p>
        </div>
        <div className="flex bg-surface-container-high p-1 rounded-xl gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg flex items-center justify-center transition-all ${
              viewMode === "grid"
                ? "bg-white shadow-sm text-tenant-blue"
                : "text-on-surface-variant opacity-50 hover:opacity-100"
            }`}
          >
            <span className="material-symbols-outlined">grid_view</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg flex items-center justify-center transition-all ${
              viewMode === "list"
                ? "bg-white shadow-sm text-tenant-blue"
                : "text-on-surface-variant opacity-50 hover:opacity-100"
            }`}
          >
            <span className="material-symbols-outlined">list</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-6 mb-8 border-b border-outline-variant">
        <button
          onClick={() => {
            setActiveTab("pending");
            setSelectedLead(null);
          }}
          className={`pb-4 px-2 border-b-2 font-bold flex items-center gap-2 transition-all ${
            activeTab === "pending"
              ? "border-landlord-green text-landlord-green"
              : "border-transparent text-on-surface-variant hover:text-tenant-blue"
          }`}
        >
          <span>חדשים</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[12px] ${
              activeTab === "pending"
                ? "bg-landlord-green text-white"
                : "bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            {pendingCount}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("accepted");
            setSelectedLead(null);
          }}
          className={`pb-4 px-2 border-b-2 font-bold flex items-center gap-2 transition-all ${
            activeTab === "accepted"
              ? "border-landlord-green text-landlord-green"
              : "border-transparent text-on-surface-variant hover:text-tenant-blue"
          }`}
        >
          <span>מאושרים</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[12px] ${
              activeTab === "accepted"
                ? "bg-landlord-green text-white"
                : "bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            {acceptedCount}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("rejected");
            setSelectedLead(null);
          }}
          className={`pb-4 px-2 border-b-2 font-bold flex items-center gap-2 transition-all ${
            activeTab === "rejected"
              ? "border-landlord-green text-landlord-green"
              : "border-transparent text-on-surface-variant hover:text-tenant-blue"
          }`}
        >
          <span>נדחו</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[12px] ${
              activeTab === "rejected"
                ? "bg-landlord-green text-white"
                : "bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* Leads Grid or List View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
          {activeLeads.map((lead) => {
            const score = lead.compatibilityScore || lead.tenant.trustScore || 50;
            const quality = lead.qualityBadge || (score >= 80 ? "High" : score >= 60 ? "Medium" : "Low");
            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="bg-white rounded-xl soft-shadow p-6 hover:shadow-md transition-all cursor-pointer group border-2 border-transparent hover:border-landlord-green/30 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4 w-full">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-sm bg-surface-container flex items-center justify-center">
                        {lead.tenant.avatarUrl ? (
                          <img
                            alt=""
                            className="w-full h-full object-cover"
                            src={lead.tenant.avatarUrl}
                          />
                        ) : (
                          <span className="text-[20px] font-bold text-tenant-blue">
                            {lead.tenant.firstName?.[0]}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-landlord-green border-2 border-white rounded-full" />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-[#62fae3]/20 text-secondary">
                        {quality === "High" ? "High Quality AI" : quality === "Medium" ? "Medium Quality" : "Basic Match"}
                      </span>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="font-bold text-tenant-blue text-[18px]">{score}%</span>
                        <div
                          className="w-12 h-12 rounded-full trust-circle flex items-center justify-center p-[2px]"
                          style={{ backgroundImage: `conic-gradient(#00cba9 ${score}%, #e1e2e8 0)` }}
                        >
                          <div className="bg-white w-full h-full rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-landlord-green text-[18px]">
                              verified_user
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 text-right">
                    <h3 className="font-h3-web text-[20px] font-semibold text-tenant-blue">
                      {lead.tenant.firstName} {lead.tenant.lastName}
                    </h3>
                    <p className="text-on-surface-variant font-label text-[14px]">
                      {lead.apartment.title}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[12px] text-on-surface-variant">מידת התאמה</span>
                      <span className="font-bold text-landlord-green text-[12px]">{score}%</span>
                    </div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-landlord-green rounded-full"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {activeTab === "pending" && (
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoadingId === lead.id}
                      onClick={(e) => handleAccept(lead.id, e)}
                      className="flex-grow bg-landlord-green text-tenant-blue font-bold h-[48px] rounded-full hover:brightness-105 active:scale-[0.97] transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {actionLoadingId === lead.id ? "טוען..." : "אישור"}
                    </button>
                    <button
                      disabled={actionLoadingId === lead.id}
                      onClick={(e) => handleReject(lead.id, e)}
                      className="w-[48px] h-[48px] border border-admin-red text-admin-red flex items-center justify-center rounded-full hover:bg-error-container/20 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl soft-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[700px]">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="p-4 text-[14px] font-bold text-on-surface-variant text-right">שוכר פוטנציאלי</th>
                  <th className="p-4 text-[14px] font-bold text-on-surface-variant text-right">נכס מבוקש</th>
                  <th className="p-4 text-[14px] font-bold text-on-surface-variant text-right">ציון התאמה</th>
                  <th className="p-4 text-[14px] font-bold text-on-surface-variant text-right">איכות הליד</th>
                  <th className="p-4 text-[14px] font-bold text-on-surface-variant text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {activeLeads.map((lead) => {
                  const score = lead.compatibilityScore || lead.tenant.trustScore || 50;
                  const quality = lead.qualityBadge || (score >= 80 ? "High" : score >= 60 ? "Medium" : "Low");
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-surface-variant/5 transition-colors cursor-pointer"
                    >
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden bg-surface-container flex items-center justify-center">
                          {lead.tenant.avatarUrl ? (
                            <img alt="" className="w-full h-full object-cover" src={lead.tenant.avatarUrl} />
                          ) : (
                            <span className="text-[14px] font-bold text-tenant-blue">{lead.tenant.firstName?.[0]}</span>
                          )}
                        </div>
                        <span className="font-semibold text-tenant-blue">
                          {lead.tenant.firstName} {lead.tenant.lastName}
                        </span>
                      </td>
                      <td className="p-4 text-[16px] text-on-surface-variant">
                        {lead.apartment.title}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-tenant-blue">{score}%</span>
                          <div className="w-24 bg-surface-container-high h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-landlord-green" style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${
                          quality === "High" ? "bg-secondary-container/30 text-secondary" : "bg-surface-container-highest text-on-surface-variant"
                        }`}>
                          {quality === "High" ? "High Quality AI" : quality === "Medium" ? "Medium Quality" : "Basic Match"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {activeTab === "pending" ? (
                          <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              disabled={actionLoadingId === lead.id}
                              onClick={(e) => handleAccept(lead.id, e)}
                              className="bg-landlord-green text-tenant-blue px-4 py-1.5 rounded-full text-[14px] font-bold hover:opacity-90 disabled:opacity-50"
                            >
                              אישור
                            </button>
                            <button
                              disabled={actionLoadingId === lead.id}
                              onClick={(e) => handleReject(lead.id, e)}
                              className="border border-admin-red text-admin-red px-3 py-1.5 rounded-full text-[14px] hover:bg-error-container/20 disabled:opacity-50"
                            >
                              דחייה
                            </button>
                          </div>
                        ) : (
                          <Link href="/chat" onClick={(e) => e.stopPropagation()}>
                            <button className="bg-tenant-blue text-white px-4 py-1.5 rounded-full text-[14px] font-bold">
                              צ'אט
                            </button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-out Tenant Profile Details Panel */}
      {selectedLead && (
        <>
          {/* Panel Overlay */}
          <div
            onClick={() => setSelectedLead(null)}
            className="fixed inset-0 bg-black/40 z-[90] backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Panel Container */}
          <div className="fixed top-0 left-0 bottom-0 w-full md:w-[480px] bg-white shadow-2xl z-[100] transition-transform duration-300 flex flex-col text-right">
            {/* Panel Header */}
            <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transform rotate-180"
                >
                  arrow_forward
                </button>
                <h2 className="text-[22px] font-bold text-tenant-blue">פרופיל שוכר</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${
                (selectedLead.compatibilityScore || 50) >= 80 ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-highest text-on-surface-variant"
              }`}>
                {(selectedLead.compatibilityScore || 50) >= 80 ? "High Quality AI" : "Medium Quality"}
              </span>
            </div>

            {/* Panel Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {/* Profile Info */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg border-4 border-white bg-surface-container flex items-center justify-center">
                  {selectedLead.tenant.avatarUrl ? (
                    <img
                      alt=""
                      className="w-full h-full object-cover"
                      src={selectedLead.tenant.avatarUrl}
                    />
                  ) : (
                    <span className="text-[32px] font-bold text-tenant-blue">
                      {selectedLead.tenant.firstName?.[0]}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <h3 className="text-[24px] font-bold text-tenant-blue">
                    {selectedLead.tenant.firstName} {selectedLead.tenant.lastName}
                  </h3>
                  <p className="text-on-surface-variant flex items-center gap-2 mt-1 text-[14px]">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    {selectedLead.apartment.city || "תל אביב"}, ישראל
                  </p>
                </div>
              </div>

              {/* Trust Score Breakdown */}
              <div className="bg-surface-container-low rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[16px] font-bold text-tenant-blue">ציון אמון מורחב</h4>
                  <span className="text-[28px] font-extrabold text-landlord-green">
                    {selectedLead.compatibilityScore || selectedLead.tenant.trustScore || 50}%
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between text-[12px] font-bold w-full">
                      <span>אימות פיננסי</span>
                      <span>98%</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden w-full">
                      <div className="h-full bg-landlord-green" style={{ width: "98%" }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between text-[12px] font-bold w-full">
                      <span>היסטוריית שכירות</span>
                      <span>82%</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden w-full">
                      <div className="h-full bg-landlord-green" style={{ width: "82%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Compatibility 8 Dimensions */}
              <div>
                <h4 className="text-[16px] font-bold text-tenant-blue mb-4">מדדי התאמה (8 מימדים)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-outline-variant rounded-lg flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-secondary">payments</span>
                    <span className="text-[12px] font-bold mt-1 text-on-surface">יציבות הכנסה</span>
                  </div>
                  <div className="p-3 border border-outline-variant rounded-lg flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-secondary">groups</span>
                    <span className="text-[12px] font-bold mt-1 text-on-surface">הרכב דיירים</span>
                  </div>
                  <div className="p-3 border border-secondary bg-[#9cefdf]/10 rounded-lg flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-secondary">pets</span>
                    <span className="text-[12px] font-bold mt-1 text-on-surface">בעלי חיים</span>
                  </div>
                  <div className="p-3 border border-outline-variant rounded-lg flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-secondary">event_repeat</span>
                    <span className="text-[12px] font-bold mt-1 text-on-surface">טווח שכירות</span>
                  </div>
                </div>
              </div>

              {/* Journal activity history */}
              <div>
                <h4 className="text-[16px] font-bold text-tenant-blue mb-4">היסטוריית פעילות (Journal)</h4>
                <div className="space-y-6 relative mr-4 border-r-2 border-surface-container-highest pr-6 text-right">
                  <div className="relative">
                    <div className="absolute -right-[33px] top-1.5 w-4 h-4 bg-landlord-green rounded-full border-4 border-white" />
                    <p className="font-bold text-[14px]">חוזה קודם הסתיים בהצלחה</p>
                    <p className="text-[12px] text-on-surface-variant">אוגוסט 2023 - רחוב רוטשילד</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -right-[33px] top-1.5 w-4 h-4 bg-landlord-green rounded-full border-4 border-white" />
                    <p className="font-bold text-[14px]">כל התשלומים בוצעו בזמן</p>
                    <p className="text-[12px] text-on-surface-variant">רצף של 12 חודשים</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer action button */}
            {selectedLead.status === "pending" && (
              <div className="p-6 bg-surface-container-lowest border-t border-outline-variant">
                <button
                  disabled={actionLoadingId === selectedLead.id}
                  onClick={(e) => handleAccept(selectedLead.id, e)}
                  className="w-full bg-landlord-green text-tenant-blue font-bold h-[48px] rounded-full hover:brightness-105 active:scale-[0.95] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">description</span>
                  <span>{actionLoadingId === selectedLead.id ? "טוען..." : "אישור למעבר לחוזה"}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
