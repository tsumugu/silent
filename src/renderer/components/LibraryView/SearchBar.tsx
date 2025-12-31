import React, { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search songs, albums, playlists...",
  debounceMs = 400
}) => {
  const [query, setQuery] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.trim().length >= 2) {
      timeoutRef.current = setTimeout(() => {
        onSearch(query.trim());
      }, debounceMs);
    } else if (query.trim().length === 0) {
      onSearch('');
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceMs, onSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Escape to clear search
      if (e.key === 'Escape') {
        setQuery('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="sticky top-0 z-20 px-8 pt-8 pb-4 backdrop-blur-md bg-black/10">
      <div className="relative group">
        {/* Search Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-white/40 group-focus-within:text-white/60 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 bg-white/5 backdrop-blur-md rounded-lg text-white placeholder-white/30
                     border border-white/10 focus:border-white/30 focus:bg-white/10
                     outline-none transition-all duration-200 text-sm"
        />

        {/* Clear Button */}
        {query.length > 0 && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Hint Text */}
        {query.trim().length > 0 && query.trim().length < 2 && (
          <div className="absolute left-0 -bottom-6 text-white/30 text-xs">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
};
