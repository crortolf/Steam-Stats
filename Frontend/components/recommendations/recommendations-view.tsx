"use client";

import { useCallback, useState } from "react";
import { Globe, Menu, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecommendationFeed, type FeedScope } from "./recommendation-feed";
import { NewRecommendationDialog } from "./new-recommendation-dialog";
import { GameSearch } from "./game-search";

/** Who the community feed shows posts from. */
type Audience = Exclude<FeedScope, "mine">;

const AUDIENCES: { value: Audience; label: string; icon: typeof Globe }[] = [
  { value: "all", label: "Global", icon: Globe },
  { value: "friends", label: "Friends", icon: Users },
];

const HEADINGS: Record<FeedScope, string> = {
  all: "From the community",
  friends: "From your friends",
  mine: "Your recommendations",
};

const EMPTY_MESSAGES: Record<FeedScope, string> = {
  all: "No one has posted a recommendation yet. Be the first with the + button.",
  friends:
    "None of your Steam friends have posted a recommendation yet. If your friends list is private, Steam won't share it.",
  mine: "You haven't recommended anything yet. Use the + button to write your first.",
};

export function RecommendationsView() {
  const [mine, setMine] = useState(false);
  // Kept while viewing your own posts, so going back returns to the same feed.
  const [audience, setAudience] = useState<Audience>("all");
  const scope: FeedScope = mine ? "mine" : audience;
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
              {HEADINGS[scope]}
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {!mine && (
              <div
                role="group"
                aria-label="Show recommendations from"
                className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px]"
              >
                {AUDIENCES.map(({ value, label, icon: Icon }) => {
                  const active = audience === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAudience(value)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-background text-foreground shadow-sm dark:bg-input/30"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            <GameSearch onSearch={search} />
          </div>
        </div>
        <RecommendationFeed
          key={`${scope}-${gameTitle}-${feedVersion}`}
          scope={scope}
          gameTitle={gameTitle}
          emptyMessage={
            gameTitle
              ? `No recommendations for games matching "${gameTitle}".`
              : EMPTY_MESSAGES[scope]
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
