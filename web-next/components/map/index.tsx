"use client";

// Leaflet touches `window` at import time — must load client-side only
import dynamic from "next/dynamic";

function MapLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-surface-variant">
      <div className="w-8 h-8 border-4 border-tenant-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export const ApartmentLocationMap = dynamic(() => import("./ApartmentLocationMap"), {
  ssr: false,
  loading: MapLoading,
});

export const SearchResultsMap = dynamic(() => import("./SearchResultsMap"), {
  ssr: false,
  loading: MapLoading,
});
