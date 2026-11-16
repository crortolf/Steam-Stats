"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { RecommendationCard } from "./recommendation-card";
import { apiErrorMessage, recommendationsApi } from "./api";
import type { Recommendation, RecommendationPage } from "@/lib/types";

const PAGE_SIZE = 10;

/** Whose recommendations a feed shows. */
export type FeedScope = "all" | "friends" | "mine";

const ENDPOINT_BY_SCOPE: Record<FeedScope, string> = {
  all: "/",
  friends: "/friends",
  mine: "/mine",
};

/**
 * A blog-style feed, newest first, that loads older posts as you scroll.
 * Remount it (change `key`) to start again from the newest post, e.g. after
 * posting a new recommendation.
 */
export function RecommendationFeed({
  scope,
  gameTitle,
  emptyMessage,
  onDeleted,
}: {
  /** Everyone's posts, the viewer's Steam friends' posts, or only their own. */
  scope: FeedScope;
  /** Only games whose title contains this text; "" for every game. */
  gameTitle: string;
  emptyMessage: string;
  /** Called after one of the viewer's posts is deleted. */
  onDeleted?: () => void;
}) {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);
  // Guards against the observer firing twice for the same page.
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const loadMore = useCallback(
    async (cursor: string | null) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError(null);
      const ctrl = new AbortController();
      controller.current = ctrl;
      try {
        const res = await recommendationsApi.get<RecommendationPage>(
          ENDPOINT_BY_SCOPE[scope],
          {
            params: {
              limit: PAGE_SIZE,
              ...(cursor ? { before: cursor } : {}),
              ...(gameTitle ? { game: gameTitle } : {}),
            },
            signal: ctrl.signal,
          },
        );
        setItems((prev) => {
          // Skip anything already shown (e.g. a post we just added).
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...res.data.items.filter((r) => !seen.has(r.id))];
        });
        setNextCursor(res.data.nextCursor);
        setDone(res.data.nextCursor === null);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError(apiErrorMessage(err, "Couldn't load recommendations."));
        }
      } finally {
        // A request aborted by cleanup has already been replaced; leave the
        // newer request's state alone.
        if (controller.current === ctrl) {
          inFlight.current = false;
          setLoading(false);
        }
      }
    },
    [scope, gameTitle],
  );

  // First page.
  useEffect(() => {
    loadMore(null);
    return () => {
      controller.current?.abort();
      controller.current = null;
      // Let the next mount (or React's dev double-run) start a fresh load.
      inFlight.current = false;
    };
  }, [loadMore]);

  // Load the next page when the bottom of the list scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor) loadMore(nextCursor);
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, done, error, loadMore]);

  const remove = async (id: string) => {
    try {
      await recommendationsApi.delete(`/${id}`);
      setItems((prev) => prev.filter((r) => r.id !== id));
      onDeleted?.();
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't delete that recommendation."));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((r) => (
        <RecommendationCard key={r.id} recommendation={r} onDelete={remove} />
      ))}

      {done && items.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span role="alert">{error}</span>
          <button
            type="button"
            onClick={() => loadMore(items.length === 0 ? null : nextCursor)}
            className="shrink-0 font-medium underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      )}
      {done && items.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          You&apos;ve reached the oldest recommendation.
        </p>
      )}

      <div ref={sentinel} aria-hidden />
    </div>
  );
}
