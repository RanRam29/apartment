"use client";

import Link from "next/link";
import type { Apartment } from "@/lib/types";

interface ApartmentCardProps {
  apartment: Apartment;
  viewMode: "grid" | "list";
}

const amenityIcons: Record<string, { icon: string; label: string }> = {
  parking: { icon: "local_parking", label: "חניה" },
  balcony: { icon: "balcony", label: "מרפסת" },
  elevator: { icon: "elevator", label: "מעלית" },
  ac: { icon: "ac_unit", label: "מיזוג" },
  storage: { icon: "warehouse", label: "מחסן" },
  furnished: { icon: "chair", label: "מרוהטת" },
  pets_allowed: { icon: "pets", label: "חיות" },
  sun_boiler: { icon: "solar_power", label: "דוד שמש" },
};

function FallbackImage() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-surface-container to-surface-container-high flex flex-col items-center justify-center">
      <span className="material-symbols-outlined text-[48px] text-outline/30">apartment</span>
      <span className="text-[11px] text-outline/40 mt-1">אין תמונה</span>
    </div>
  );
}

export function ApartmentCard({ apartment, viewMode }: ApartmentCardProps) {
  const apt = apartment;
  const hasImage = apt.images && apt.images.length > 0;
  const topAmenities = (apt.amenities || []).slice(0, 4);

  if (viewMode === "list") {
    return (
      <Link href={`/apartment/${apt.id}`} className="block">
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden soft-shadow border border-outline-variant/50 hover:border-landlord-green/40 transition-all hover:-translate-y-0.5 flex">
          {/* Image */}
          <div className="w-[240px] h-[160px] shrink-0 relative overflow-hidden">
            {hasImage ? (
              <img src={apt.images[0]} alt={apt.address} className="w-full h-full object-cover" />
            ) : (
              <FallbackImage />
            )}
            {apt.images && apt.images.length > 1 && (
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full">
                {apt.images.length} תמונות
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-grow p-4 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-[16px] font-bold text-tenant-blue truncate">{apt.address}</h3>
                <span className="text-[20px] font-bold text-landlord-green shrink-0 mr-3">
                  ₪ {apt.price?.toLocaleString()}
                  <span className="text-[12px] font-normal text-on-surface-variant">/חודש</span>
                </span>
              </div>
              <p className="text-[13px] text-on-surface-variant flex items-center gap-1 mb-2">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                {apt.city}{apt.neighborhood ? ` • ${apt.neighborhood}` : ""}
              </p>
            </div>

            <div className="flex items-center justify-between">
              {/* Stats */}
              <div className="flex items-center gap-4 text-[13px] text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">bed</span>
                  {apt.rooms} חד׳
                </span>
                {apt.size && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">straighten</span>
                    {apt.size} מ&quot;ר
                  </span>
                )}
                {apt.floor && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">layers</span>
                    קומה {apt.floor}
                  </span>
                )}
              </div>

              {/* Amenities pills */}
              <div className="flex gap-1.5">
                {topAmenities.map((a) => {
                  const info = amenityIcons[a];
                  if (!info) return null;
                  return (
                    <span key={a} className="bg-surface-container px-2 py-1 rounded-md text-[11px] text-on-surface-variant flex items-center gap-1" title={info.label}>
                      <span className="material-symbols-outlined text-[13px]">{info.icon}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Grid view (default)
  return (
    <Link href={`/apartment/${apt.id}`} className="block group">
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden soft-shadow border border-outline-variant/50 hover:border-landlord-green/40 transition-all hover:-translate-y-1 hover:shadow-lg">
        {/* Image */}
        <div className="relative h-[200px] overflow-hidden">
          {hasImage ? (
            <img
              src={apt.images[0]}
              alt={apt.address}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <FallbackImage />
          )}

          {/* Price badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-[18px] font-bold text-landlord-green">₪ {apt.price?.toLocaleString()}</span>
            <span className="text-[11px] text-on-surface-variant">/חודש</span>
          </div>

          {/* Photo count */}
          {apt.images && apt.images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">photo_library</span>
              {apt.images.length}
            </div>
          )}

          {/* Landlord verified badge */}
          {apt.landlord?.isVerified && (
            <div className="absolute top-3 right-3 bg-tenant-blue/90 text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              מאומת
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-[16px] font-bold text-tenant-blue mb-1 truncate">{apt.address}</h3>
          <p className="text-[13px] text-on-surface-variant flex items-center gap-1 mb-3">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {apt.city}{apt.neighborhood ? ` • ${apt.neighborhood}` : ""}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-[13px] text-on-surface-variant mb-3 pb-3 border-b border-outline-variant/30">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">bed</span>
              {apt.rooms} חד׳
            </span>
            {apt.size && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">straighten</span>
                {apt.size} מ&quot;ר
              </span>
            )}
            {apt.floor && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">layers</span>
                קומה {apt.floor}
              </span>
            )}
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-1.5">
            {topAmenities.map((a) => {
              const info = amenityIcons[a];
              if (!info) return null;
              return (
                <span key={a} className="bg-surface-container px-2 py-1 rounded-md text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">{info.icon}</span>
                  {info.label}
                </span>
              );
            })}
            {(apt.amenities?.length || 0) > 4 && (
              <span className="bg-surface-container px-2 py-1 rounded-md text-[11px] text-on-surface-variant">
                +{(apt.amenities?.length || 0) - 4}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
