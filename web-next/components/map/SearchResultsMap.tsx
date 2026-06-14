"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import Link from "next/link";
import type { Apartment } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface SearchResultsMapProps {
  apartments: Apartment[];
}

function priceIcon(price: number) {
  return divIcon({
    className: "",
    html: `<div style="background:#1a3c8f;color:#fff;font-weight:700;font-size:12px;padding:4px 10px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);transform:translate(-50%,-100%);direction:rtl">₪${price.toLocaleString()}</div>`,
    iconSize: [0, 0],
  });
}

const ISRAEL_CENTER: [number, number] = [32.0853, 34.7818];

export default function SearchResultsMap({ apartments }: SearchResultsMapProps) {
  const located = apartments.filter(
    (a) => typeof a.latitude === "number" && typeof a.longitude === "number"
  );

  const center: [number, number] = located.length
    ? [
        located.reduce((s, a) => s + (a.latitude as number), 0) / located.length,
        located.reduce((s, a) => s + (a.longitude as number), 0) / located.length,
      ]
    : ISRAEL_CENTER;

  if (located.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-low text-center p-8">
        <span className="material-symbols-outlined text-[56px] text-outline/40 mb-3">map</span>
        <h3 className="text-[18px] font-bold text-tenant-blue mb-2">אין מיקומים על המפה</h3>
        <p className="text-[14px] text-on-surface-variant max-w-md">
          לדירות בתוצאות החיפוש אין עדיין קואורדינטות GPS. נסה חיפוש בעיר אחרת או חזור לתצוגת רשת.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {located.length < apartments.length && (
        <div className="absolute top-3 right-3 z-[500] bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg text-[12px] text-on-surface-variant shadow-sm">
          {located.length} מתוך {apartments.length} דירות עם מיקום
        </div>
      )}
      <MapContainer center={center} zoom={located.length > 1 ? 12 : 14} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((apt) => (
          <Marker
            key={apt.id}
            position={[apt.latitude as number, apt.longitude as number]}
            icon={priceIcon(apt.price)}
          >
            <Popup>
              <div dir="rtl" className="text-right min-w-[180px]">
                <p className="font-bold text-[14px] mb-1">
                  דירת {apt.rooms} חדרים, {apt.city}
                </p>
                <p className="text-[12px] text-gray-600 mb-2">{apt.neighborhood || apt.address || ""}</p>
                <p className="font-bold text-[14px] mb-2">₪{apt.price.toLocaleString()} לחודש</p>
                <Link href={`/apartment/${apt.id}`} className="text-[13px] font-bold underline">
                  לפרטי הדירה
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
