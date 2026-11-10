"use client";

import { useLayoutEffect, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export type SortOption<K extends string> = {
  key: K;
  label: string;
};

type Props<K extends string> = {
  options: readonly SortOption<K>[];
  activeKey: K;
  direction: SortDirection;
  /** Called with the clicked option; the parent decides how to flip/switch. */
  onSelect: (key: K) => void;
  /** Describes the current order, e.g. "A to Z", for the active chip's tooltip. */
  describe?: (key: K, direction: SortDirection) => string;
  ariaLabel: string;
  className?: string;
};

const MOVE_MS = 320;
const MOVE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

/**
 * A row of sort chips. The active chip is always first, and when the active
 * sort changes every chip glides from its old spot to its new one (FLIP), so
 * the newly picked chip visibly slides to the far left.
 */
export function SortChips<K extends string>({
  options,
  activeKey,
  direction,
  onSelect,
  describe,
  ariaLabel,
  className,
}: Props<K>) {
  // Active option first, the rest keep their original order.
  const ordered = [
    ...options.filter((o) => o.key === activeKey),
    ...options.filter((o) => o.key !== activeKey),
  ];

  const chipRefs = useRef(new Map<K, HTMLButtonElement>());
  // Layout positions from the previous render. offsetLeft/Top ignore CSS
  // transforms, so a chip that's mid-animation is still measured correctly.
  const lastPositions = useRef(new Map<K, { left: number; top: number }>());
  const lastActive = useRef(activeKey);

  useLayoutEffect(() => {
    const activeChanged = lastActive.current !== activeKey;
    lastActive.current = activeKey;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    chipRefs.current.forEach((chip, key) => {
      const next = { left: chip.offsetLeft, top: chip.offsetTop };
      const prev = lastPositions.current.get(key);
      lastPositions.current.set(key, next);
      if (!activeChanged || reduceMotion || !prev) return;

      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (dx === 0 && dy === 0) return;
      // Start where the chip was and slide to where it is now.
      chip.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: MOVE_MS, easing: MOVE_EASING },
      );
    });
  });

  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      role="group"
      aria-label={ariaLabel}
    >
      <span className="text-xs text-muted-foreground">Sort:</span>
      {/* relative so chips' offsetLeft/Top are measured from this row */}
      <div className="relative flex flex-wrap items-center gap-1.5">
        {ordered.map(({ key, label }) => {
          const active = key === activeKey;
          return (
            <button
              key={key}
              ref={(el) => {
                if (el) chipRefs.current.set(key, el);
                else chipRefs.current.delete(key);
              }}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={active}
              title={
                active
                  ? `${describe ? describe(key, direction) : direction === "asc" ? "Ascending" : "Descending"}. Click to reverse.`
                  : `Sort by ${label.toLowerCase()}`
              }
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? // drawn above the chips it slides past
                    "relative z-10 border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {label}
              {active && <Arrow className="size-3.5" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
