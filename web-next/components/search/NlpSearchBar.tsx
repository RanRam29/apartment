"use client";

import { useState, useRef, useCallback } from "react";

interface NlpSearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading: boolean;
  activeQuery: string;
}

const SUGGESTIONS = [
  "דירת 3 חדרים בתל אביב עד 6000",
  "דירה עם מרפסת בהרצליה",
  "סטודיו מרוהט ליד האוניברסיטה",
  "דירה עם חניה בירושלים עד 5000",
  "4 חדרים ברמת גן, מותר חיות",
];

export function NlpSearchBar({ onSearch, onClear, isLoading, activeQuery }: NlpSearchBarProps) {
  const [query, setQuery] = useState(activeQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  }, [query, onSearch]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery("");
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-surface-container-lowest rounded-2xl soft-shadow border-2 border-transparent focus-within:border-landlord-green transition-colors overflow-hidden">
          {/* AI icon */}
          <div className="flex items-center justify-center w-12 h-12 shrink-0 mr-1">
            <span className="material-symbols-outlined text-landlord-green text-[24px]">auto_awesome</span>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder='חיפוש חכם — נסה "דירת 3 חדרים בתל אביב עם מרפסת עד 6000 ₪"'
            className="flex-grow h-[56px] bg-transparent text-[16px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none px-2"
            dir="rtl"
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}

          {/* Search button */}
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="h-[44px] px-6 ml-1.5 bg-landlord-green text-white rounded-xl font-bold text-[14px] hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2 shrink-0"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                מחפש...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">search</span>
                חפש
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && !activeQuery && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-xl soft-shadow border border-outline-variant/50 overflow-hidden z-20">
          <div className="px-4 py-2.5 border-b border-outline-variant/30">
            <p className="text-[12px] text-on-surface-variant font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">lightbulb</span>
              חיפוש לדוגמה
            </p>
          </div>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(suggestion); }}
              className="w-full text-right px-4 py-3 text-[14px] text-on-surface hover:bg-surface-container transition-colors flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">search</span>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
