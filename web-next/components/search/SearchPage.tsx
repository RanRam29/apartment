"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Apartment } from "@/lib/types";
import { ApartmentCard } from "./ApartmentCard";
import { SearchFilters, type FilterState } from "./SearchFilters";
import { NlpSearchBar } from "./NlpSearchBar";

interface FeedResponse {
  apartments: Apartment[];
  total: number;
  page: number;
  totalPages: number;
  fromCache?: boolean;
}

interface NlpResponse {
  apartments: Apartment[];
  filters: Record<string, unknown>;
  total: number;
  relaxed: boolean;
}

type ViewMode = "grid" | "list";

const CITIES = [
  "תל אביב", "ירושלים", "חיפה", "רמת גן", "גבעתיים",
  "הרצליה", "נתניה", "ראשון לציון", "פתח תקווה", "באר שבע",
  "אשדוד", "רחובות", "כפר סבא", "רעננה", "הוד השרון",
];

function buildFeedQuery(filters: FilterState, page: number): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.rooms) params.set("rooms", String(filters.rooms));
  params.set("page", String(page));
  params.set("limit", "18");
  return `/api/apartments/feed?${params.toString()}`;
}

export function SearchPage() {
  const { user, token } = useAuth();
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [nlpResults, setNlpResults] = useState<NlpResponse | null>(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpQuery, setNlpQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");

  // Feed-based results (when no NLP query is active)
  const feedUrl = nlpResults ? null : buildFeedQuery(filters, page);
  const { data: feedData, isLoading: feedLoading } = useApi<FeedResponse>(feedUrl);

  // Determine which results to show
  const apartments = nlpResults ? nlpResults.apartments : (feedData?.apartments || []);
  const total = nlpResults ? nlpResults.total : (feedData?.total || 0);
  const totalPages = nlpResults ? 1 : (feedData?.totalPages || 1);
  const isLoading = nlpLoading || feedLoading;

  // Sort apartments client-side
  const sortedApartments = [...apartments].sort((a, b) => {
    switch (sortBy) {
      case "price_asc": return (a.price || 0) - (b.price || 0);
      case "price_desc": return (b.price || 0) - (a.price || 0);
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // NLP search handler
  const handleNlpSearch = useCallback(async (query: string) => {
    if (!query.trim() || !token) return;
    setNlpQuery(query);
    setNlpLoading(true);
    try {
      const res = await api<NlpResponse>("/api/recommendations/search", {
        method: "POST",
        body: { query, ...filters },
        token,
      });
      setNlpResults(res);
    } catch (err) {
      console.error("NLP search failed:", err);
      setNlpResults(null);
    } finally {
      setNlpLoading(false);
    }
  }, [token, filters]);

  // Clear NLP search and go back to feed
  const clearNlpSearch = useCallback(() => {
    setNlpResults(null);
    setNlpQuery("");
    setPage(1);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
    // If NLP is active, re-search with new filters
    if (nlpQuery) {
      // Reset NLP and let feed handle it
      setNlpResults(null);
      setNlpQuery("");
    }
  }, [nlpQuery]);

  return (
    <div className="min-h-[calc(100vh-88px)]">
      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-[28px] leading-[36px] font-bold text-tenant-blue mb-1">
          חיפוש דירות
        </h1>
        <p className="text-[16px] text-on-surface-variant">
          {total > 0 ? `${total} דירות נמצאו` : "חפש דירה שמתאימה לך"}
        </p>
      </header>

      {/* NLP Search Bar */}
      <NlpSearchBar
        onSearch={handleNlpSearch}
        onClear={clearNlpSearch}
        isLoading={nlpLoading}
        activeQuery={nlpQuery}
      />

      {/* NLP Result Banner */}
      {nlpResults && (
        <div className="mt-4 mb-2 flex items-center gap-3 bg-secondary-container/50 rounded-xl px-5 py-3">
          <span className="material-symbols-outlined text-on-secondary-container text-[20px]">auto_awesome</span>
          <div className="flex-grow">
            <p className="text-[14px] font-medium text-on-secondary-container">
              חיפוש חכם: &ldquo;{nlpQuery}&rdquo;
              {nlpResults.relaxed && (
                <span className="text-[12px] text-on-surface-variant mr-2">(הורחבו הפילטרים לתוצאות נוספות)</span>
              )}
            </p>
          </div>
          <button onClick={clearNlpSearch} className="text-on-secondary-container/70 hover:text-on-secondary-container transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}

      <div className="flex gap-6 mt-6">
        {/* Filters Sidebar */}
        <SearchFilters
          filters={filters}
          onChange={handleFilterChange}
          cities={CITIES}
        />

        {/* Results Area */}
        <div className="flex-grow min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 bg-surface-container-lowest rounded-xl px-5 py-3 soft-shadow border border-outline-variant/50">
            <div className="flex items-center gap-4">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-[14px] text-on-surface bg-transparent border-none font-medium cursor-pointer focus:outline-none"
                >
                  <option value="newest">חדש ביותר</option>
                  <option value="price_asc">מחיר: נמוך לגבוה</option>
                  <option value="price_desc">מחיר: גבוה לנמוך</option>
                </select>
              </div>

              <div className="w-px h-5 bg-outline-variant" />

              {/* Results Count */}
              <span className="text-[13px] text-on-surface-variant">
                {total} תוצאות
              </span>
            </div>

            {/* View Toggle */}
            <div className="flex bg-surface-container rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white soft-shadow text-tenant-blue" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white soft-shadow text-tenant-blue" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                <span className="material-symbols-outlined text-[20px]">view_list</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-landlord-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-on-surface-variant text-[16px]">
                  {nlpLoading ? "מנתח את החיפוש שלך..." : "טוען דירות..."}
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && sortedApartments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest rounded-xl soft-shadow">
              <span className="material-symbols-outlined text-[64px] text-outline/30 mb-4">search_off</span>
              <h3 className="text-[20px] font-bold text-tenant-blue mb-2">לא נמצאו דירות</h3>
              <p className="text-on-surface-variant text-[14px] mb-6 max-w-md text-center">
                נסה לשנות את הפילטרים או לחפש עם מילות חיפוש אחרות.
                <br />אפשר גם לנסות חיפוש טבעי כמו &ldquo;דירת 3 חדרים בתל אביב עד 6000&rdquo;
              </p>
              <button
                onClick={() => { handleFilterChange({}); clearNlpSearch(); }}
                className="bg-landlord-green text-white px-6 py-2.5 rounded-full font-bold text-[14px] hover:opacity-90 transition-opacity"
              >
                נקה את כל הפילטרים
              </button>
            </div>
          )}

          {/* Results Grid / List */}
          {!isLoading && sortedApartments.length > 0 && (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              : "space-y-4"
            }>
              {sortedApartments.map((apt) => (
                <ApartmentCard
                  key={apt.id}
                  apartment={apt}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}

          {/* Pagination (feed mode only) */}
          {!nlpResults && totalPages > 1 && !isLoading && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center disabled:opacity-30 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 rounded-lg text-[14px] font-medium transition-all ${
                      page === pageNum
                        ? "bg-tenant-blue text-white"
                        : "border border-outline-variant hover:bg-surface-container"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center disabled:opacity-30 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
