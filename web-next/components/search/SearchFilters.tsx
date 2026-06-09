"use client";

import { useState } from "react";

export interface FilterState {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  petsAllowed?: boolean;
  amenities?: string[];
}

interface SearchFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  cities: string[];
}

const ROOM_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6];

const PRICE_RANGES = [
  { label: "עד 3,000 ₪", max: 3000 },
  { label: "3,000 - 5,000 ₪", min: 3000, max: 5000 },
  { label: "5,000 - 7,000 ₪", min: 5000, max: 7000 },
  { label: "7,000 - 10,000 ₪", min: 7000, max: 10000 },
  { label: "10,000+ ₪", min: 10000 },
];

const AMENITIES = [
  { key: "parking", label: "חניה", icon: "local_parking" },
  { key: "balcony", label: "מרפסת", icon: "balcony" },
  { key: "elevator", label: "מעלית", icon: "elevator" },
  { key: "ac", label: "מיזוג", icon: "ac_unit" },
  { key: "storage", label: "מחסן", icon: "warehouse" },
  { key: "furnished", label: "מרוהטת", icon: "chair" },
];

export function SearchFilters({ filters, onChange, cities }: SearchFiltersProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const updateFilter = (key: keyof FilterState, value: unknown) => {
    const newFilters = { ...filters, [key]: value };
    // Remove undefined/null values
    if (value === undefined || value === null || value === "" || value === false) {
      delete newFilters[key];
    }
    onChange(newFilters);
  };

  const toggleAmenity = (amenity: string) => {
    const current = filters.amenities || [];
    const next = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    updateFilter("amenities", next.length > 0 ? next : undefined);
  };

  const clearAll = () => onChange({});
  const activeCount = Object.keys(filters).filter(k => {
    const val = filters[k as keyof FilterState];
    return val !== undefined && val !== null && val !== false && !(Array.isArray(val) && val.length === 0);
  }).length;

  return (
    <aside className={`shrink-0 transition-all duration-300 ${isCollapsed ? "w-[48px]" : "w-[280px]"}`}>
      <div className="bg-surface-container-lowest rounded-xl soft-shadow border border-outline-variant/50 sticky top-[88px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-tenant-blue">tune</span>
              <h3 className="text-[16px] font-bold text-tenant-blue">סינון</h3>
              {activeCount > 0 && (
                <span className="bg-landlord-green text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
              {isCollapsed ? "chevron_left" : "chevron_right"}
            </span>
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-4 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* City */}
            <FilterSection title="עיר">
              <select
                value={filters.city || ""}
                onChange={(e) => updateFilter("city", e.target.value || undefined)}
                className="w-full h-10 bg-surface-container rounded-lg px-3 text-[14px] text-on-surface border border-outline-variant/50 focus:outline-none focus:border-landlord-green transition-colors"
              >
                <option value="">כל הערים</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </FilterSection>

            {/* Price Range */}
            <FilterSection title="טווח מחירים">
              <div className="space-y-2">
                {PRICE_RANGES.map((range) => {
                  const isActive = filters.minPrice === range.min && filters.maxPrice === range.max;
                  return (
                    <button
                      key={range.label}
                      onClick={() => {
                        if (isActive) {
                          const { minPrice, maxPrice, ...rest } = filters;
                          onChange(rest);
                        } else {
                          onChange({ ...filters, minPrice: range.min, maxPrice: range.max });
                        }
                      }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-[13px] transition-all ${
                        isActive
                          ? "bg-landlord-green/10 text-landlord-green font-bold border border-landlord-green/30"
                          : "hover:bg-surface-container text-on-surface-variant border border-transparent"
                      }`}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>
              {/* Custom range */}
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  placeholder="מ-"
                  value={filters.minPrice ?? ""}
                  onChange={(e) => updateFilter("minPrice", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full h-9 bg-surface-container rounded-lg px-2 text-[13px] text-center border border-outline-variant/50 focus:outline-none focus:border-landlord-green"
                />
                <span className="text-on-surface-variant text-[12px] shrink-0">עד</span>
                <input
                  type="number"
                  placeholder="עד"
                  value={filters.maxPrice ?? ""}
                  onChange={(e) => updateFilter("maxPrice", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full h-9 bg-surface-container rounded-lg px-2 text-[13px] text-center border border-outline-variant/50 focus:outline-none focus:border-landlord-green"
                />
              </div>
            </FilterSection>

            {/* Rooms */}
            <FilterSection title="חדרים">
              <div className="flex flex-wrap gap-2">
                {ROOM_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => updateFilter("rooms", filters.rooms === r ? undefined : r)}
                    className={`min-w-[40px] h-9 px-2.5 rounded-lg text-[13px] font-medium transition-all ${
                      filters.rooms === r
                        ? "bg-tenant-blue text-white"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/30"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Amenities */}
            <FilterSection title="מאפיינים">
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map(({ key, label, icon }) => {
                  const isActive = filters.amenities?.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleAmenity(key)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                        isActive
                          ? "bg-landlord-green/10 text-landlord-green border border-landlord-green/30"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-transparent"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{icon}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* Pets */}
            <FilterSection title="חיות מחמד">
              <button
                onClick={() => updateFilter("petsAllowed", !filters.petsAllowed)}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  filters.petsAllowed
                    ? "bg-landlord-green/10 text-landlord-green border border-landlord-green/30"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-transparent"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">pets</span>
                מותר חיות מחמד
              </button>
            </FilterSection>

            {/* Clear All */}
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="w-full py-2.5 text-[13px] font-bold text-admin-red hover:bg-admin-red/5 rounded-lg transition-colors"
              >
                נקה את כל הפילטרים
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[13px] font-bold text-on-surface mb-2">{title}</h4>
      {children}
    </div>
  );
}
