"use client";

import { useCallback, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecommendationFeed } from "./recommendation-feed";
import { NewRecommendationDialog } from "./new-recommendation-dialog";
import { GameSearch } from "./game-search";

export function RecommendationsView() {
  const [mine, setMine] = useState(false);
  // Text the feed's game titles are filtered by; "" for every game.
  const [gameTitle, setGameTitle] = useState("");
  const search = useCallback((title: string) => setGameTitle(title), []);
  const [creating, setCreating] = useState(false);
  // Bumped after posting so the feed reloads from the newest post.
  const [feedVersion, setFeedVersion] = useState(0);

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {mine ? "Your recommendations" : "From the community"}
            </h2>
            {mine && (
              <button
                type="button"
                onClick={() => setMine(false)}
                className="self-start text-sm font-medium text-primary hover:underline"
              >
                Back to all recommendations
              </button>
            )}
          </div>
          <GameSearch onSearch={search} />
        </div>
        <RecommendationFeed
          key={`${mine ? "mine" : "all"}-${gameTitle}-${feedVersion}`}
          mine={mine}
          gameTitle={gameTitle}
          emptyMessage={
            gameTitle
              ? `No recommendations for games matching "${gameTitle}".`
              : mine
              ? "You haven't recommended anything yet. Use the + button to write your first."
              : "No one has posted a recommendation yet. Be the first with the + button."
          }
        />
      </div>

      {/* Fixed to the viewport, so they stay put while the feed scrolls. */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
        <button
          type="button"
          // The title search stays, so it applies to both views.
          onClick={() => setMine((m) => !m)}
          aria-pressed={mine}
          aria-label={
            mine ? "Show all recommendations" : "Show your recommendations"
          }
          title={mine ? "All recommendations" : "Your recommendations"}
          className={cn(
            "grid size-12 place-items-center rounded-full border shadow-lg transition-colors",
            mine
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-popover text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Menu className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="New recommendation"
          title="New recommendation"
          className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <Plus className="size-6" />
        </button>
      </div>

      <NewRecommendationDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={() => setFeedVersion((v) => v + 1)}
      />
    </>
  );
}
