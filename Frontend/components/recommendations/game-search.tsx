"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

/**
 * Filters a feed by game title. Reports the trimmed text a moment after
 * typing stops, so the feed isn't reloaded on every keystroke.
 */
export function GameSearch({
  onSearch,
}: {
  /** The text to match game titles against; "" for every game. */
  onSearch: (title: string) => void;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => onSearch(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, onSearch]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search by game title"
        aria-label="Search recommendations by game title"
        maxLength={100}
        className="bg-card pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            onSearch("");
          }}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
