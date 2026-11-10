"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import axios from "axios";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  AchievementOption,
  GameOption,
  Recommendation,
  RecommendationImage,
} from "@/lib/types";
import { apiErrorMessage, recommendationsApi } from "./api";
import { ImageUploader } from "./image-uploader";

// Keep in step with the limits in the backend's recommendationsController.js.
const MAX_BODY_LENGTH = 4000;
const MAX_COMMENT_LENGTH = 500;
const MAX_HIGHLIGHTS = 10;
const MAX_POST_IMAGES = 4;
const MAX_ACHIEVEMENT_IMAGES = 2;
const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SEARCH_DEBOUNCE_MS = 300;

type Highlight = { comment: string; images: RecommendationImage[] };
// apiName -> what the author added for it, in the order they were picked.
type Highlights = Map<string, Highlight>;

const textareaClass =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function NewRecommendationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (recommendation: Recommendation) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-popover shadow-xl outline-none">
          <header className="flex items-center gap-4 border-b border-border p-4 sm:px-5">
            <Dialog.Title className="flex-1 text-lg font-semibold text-foreground">
              New recommendation
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-5" />
            </Dialog.Close>
          </header>
          {/* Remounted each time it opens, so every recommendation starts blank. */}
          {open && (
            <RecommendationForm
              onCreated={(r) => {
                onCreated(r);
                onOpenChange(false);
              }}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RecommendationForm({
  onCreated,
}: {
  onCreated: (recommendation: Recommendation) => void;
}) {
  const [game, setGame] = useState<GameOption | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<RecommendationImage[]>([]);
  const [highlights, setHighlights] = useState<Highlights>(new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Uploaders with an upload still running; posting waits for them.
  const [busyUploaders, setBusyUploaders] = useState<Set<string>>(new Set());
  const setUploaderBusy = useCallback((key: string, busy: boolean) => {
    setBusyUploaders((prev) => {
      if (prev.has(key) === busy) return prev;
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const uploading = busyUploaders.size > 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!game) return;
    setSaving(true);
    setError(null);
    try {
      const res = await recommendationsApi.post<Recommendation>("/", {
        appId: String(game.id),
        body,
        score,
        images: images.map((img) => img.id),
        achievements: [...highlights].map(([apiName, h]) => ({
          apiName,
          comment: h.comment,
          images: h.images.map((img) => img.id),
        })),
      });
      onCreated(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't post your recommendation."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-5">
        {/* 1. game */}
        <section className="flex flex-col gap-2">
          <Label>Game</Label>
          {game ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2 pl-3">
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {game.name}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setGame(null);
                  setHighlights(new Map());
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <GamePicker onPick={setGame} />
          )}
        </section>

        {game && (
          <>
            {/* 2. score */}
            <section className="flex flex-col gap-2">
              <Label id="score-label">
                Score{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <div
                role="radiogroup"
                aria-labelledby="score-label"
                className="flex flex-wrap items-center gap-1.5"
              >
                {SCORES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={score === n}
                    // Clicking the chosen score again clears it.
                    onClick={() => setScore((s) => (s === n ? null : n))}
                    className={cn(
                      "grid size-8 place-items-center rounded-md border text-sm font-medium transition-colors",
                      score === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <span className="ml-1 text-sm text-muted-foreground">
                  {score === null ? "No score" : `${score}/10`}
                </span>
              </div>
            </section>

            {/* 3. the recommendation */}
            <section className="flex flex-col gap-2">
              <Label htmlFor="recommendation-body">Your recommendation</Label>
              <textarea
                id="recommendation-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={MAX_BODY_LENGTH}
                rows={5}
                required
                placeholder="What makes this game worth playing (or not)?"
                className={textareaClass}
              />
              <p className="self-end text-xs text-muted-foreground">
                {body.length}/{MAX_BODY_LENGTH}
              </p>
            </section>

            {/* images for the whole recommendation */}
            <section className="flex flex-col gap-2">
              <Label>
                Images{" "}
                <span className="font-normal text-muted-foreground">
                  (optional, up to {MAX_POST_IMAGES})
                </span>
              </Label>
              <ImageUploader
                images={images}
                onChange={setImages}
                max={MAX_POST_IMAGES}
                label="Add images to your recommendation"
                onBusyChange={(busy) => setUploaderBusy("post", busy)}
              />
            </section>

            {/* 4. achievements */}
            <AchievementHighlights
              key={game.id}
              appId={game.id}
              highlights={highlights}
              onChange={setHighlights}
              onUploaderBusy={setUploaderBusy}
            />
          </>
        )}
      </div>

      <footer className="flex items-center justify-end gap-3 border-t border-border p-3 sm:px-5">
        {error && (
          <p role="alert" className="mr-auto text-sm text-destructive">
            {error}
          </p>
        )}
        <Dialog.Close
          render={<Button type="button" variant="outline" size="sm" />}
        >
          Cancel
        </Dialog.Close>
        <Button
          type="submit"
          size="sm"
          disabled={!game || body.trim() === "" || saving || uploading}
        >
          {saving
            ? "Posting…"
            : uploading
              ? "Uploading images…"
              : "Post recommendation"}
        </Button>
      </footer>
    </form>
  );
}

/** Search your library and games the site knows, or paste a store link. */
function GamePicker({ onPick }: { onPick: (game: GameOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError(null);
        recommendationsApi
          .get<GameOption[]>("/games", {
            params: { q: query },
            signal: controller.signal,
          })
          .then((res) => setResults(res.data))
          .catch((err) => {
            if (!axios.isCancel(err))
              setError(apiErrorMessage(err, "Couldn't search games."));
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      // The first (empty) search runs straight away.
      query === "" ? 0 : SEARCH_DEBOUNCE_MS,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, or paste a Steam Store link"
          className="pl-8"
          autoFocus
          aria-label="Search games"
        />
      </div>
      <ul
        className="max-h-64 overflow-y-auto rounded-lg border border-border"
        aria-busy={loading}
      >
        {results.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => onPick(g)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary/60"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {g.name}
              </span>
              {g.owned && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  In your library
                </span>
              )}
            </button>
          </li>
        ))}
        {!loading && results.length === 0 && !error && (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            {query
              ? "No games found. Try pasting the game's Steam Store link."
              : "Search for a game to recommend."}
          </li>
        )}
        {loading && results.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            Searching…
          </li>
        )}
        {error && (
          <li className="px-3 py-4 text-center text-sm text-destructive">
            {error}
          </li>
        )}
      </ul>
    </div>
  );
}

/** Pick any of the game's achievements (earned or not) and comment on them. */
function AchievementHighlights({
  appId,
  highlights,
  onChange,
  onUploaderBusy,
}: {
  appId: number;
  highlights: Highlights;
  onChange: (update: (prev: Highlights) => Highlights) => void;
  onUploaderBusy: (key: string, busy: boolean) => void;
}) {
  const [options, setOptions] = useState<AchievementOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    recommendationsApi
      .get<AchievementOption[]>("/achievements", {
        params: { appId },
        signal: controller.signal,
      })
      .then((res) => setOptions(res.data))
      .catch((err) => {
        if (!axios.isCancel(err))
          setError(apiErrorMessage(err, "Couldn't load achievements."));
      });
    return () => controller.abort();
  }, [appId]);

  const byApiName = useMemo(
    () => new Map((options ?? []).map((a) => [a.apiName, a])),
    [options],
  );
  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (options ?? []).filter(
      (a) =>
        !needle ||
        a.name.toLowerCase().includes(needle) ||
        a.description.toLowerCase().includes(needle),
    );
  }, [options, filter]);

  const toggle = (apiName: string) =>
    onChange((prev) => {
      const next = new Map(prev);
      if (next.has(apiName)) next.delete(apiName);
      else if (next.size < MAX_HIGHLIGHTS)
        next.set(apiName, { comment: "", images: [] });
      return next;
    });
  // Functional, so an upload finishing late doesn't undo a newer edit.
  const update = (apiName: string, change: Partial<Highlight>) =>
    onChange((prev) => {
      const current = prev.get(apiName);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(apiName, { ...current, ...change });
      return next;
    });

  return (
    <section className="flex flex-col gap-2">
      <Label>
        Highlight achievements{" "}
        <span className="font-normal text-muted-foreground">
          (optional, up to {MAX_HIGHLIGHTS})
        </span>
      </Label>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {options === null && !error && (
        <p className="text-sm text-muted-foreground">Loading achievements…</p>
      )}
      {options !== null && options.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This game doesn&apos;t have any achievements.
        </p>
      )}

      {/* chosen highlights, each with an optional comment */}
      {highlights.size > 0 && (
        <ul className="flex flex-col gap-2">
          {[...highlights].map(([apiName, h]) => {
            const a = byApiName.get(apiName);
            if (!a) return null;
            return (
              <li
                key={apiName}
                className="rounded-lg border border-primary/40 bg-primary/5 p-3"
              >
                <div className="flex items-start gap-3">
                  <Image
                    src={a.icon}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {a.name}
                    </p>
                    {a.description && (
                      <p className="text-xs text-muted-foreground">
                        {a.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(apiName)}
                    aria-label={`Remove ${a.name}`}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <textarea
                  value={h.comment}
                  onChange={(e) => update(apiName, { comment: e.target.value })}
                  maxLength={MAX_COMMENT_LENGTH}
                  rows={2}
                  placeholder="Comment on your experience (optional)"
                  aria-label={`Comment on ${a.name}`}
                  className={cn(textareaClass, "mt-2")}
                />
                <div className="mt-2">
                  <ImageUploader
                    images={h.images}
                    onChange={(images) => update(apiName, { images })}
                    max={MAX_ACHIEVEMENT_IMAGES}
                    label={`Add images for ${a.name}`}
                    onBusyChange={(busy) =>
                      onUploaderBusy(`achievement:${apiName}`, busy)
                    }
                    compact
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {options !== null && options.length > 0 && (
        <>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Filter ${options.length} achievements`}
            aria-label="Filter achievements"
          />
          <ul className="max-h-60 overflow-y-auto rounded-lg border border-border">
            {visible.map((a) => {
              const picked = highlights.has(a.apiName);
              const full = !picked && highlights.size >= MAX_HIGHLIGHTS;
              return (
                <li key={a.apiName}>
                  <button
                    type="button"
                    onClick={() => toggle(a.apiName)}
                    disabled={full}
                    aria-pressed={picked}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50",
                      picked && "bg-primary/10",
                    )}
                  >
                    <Image
                      src={a.unlocked ? a.icon : a.iconGray}
                      alt=""
                      width={28}
                      height={28}
                      className="size-7 shrink-0 rounded"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {a.name}
                      </span>
                      {a.description && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {a.description}
                        </span>
                      )}
                    </span>
                    {a.unlocked && (
                      <span className="shrink-0 text-xs text-status-Online">
                        Unlocked
                      </span>
                    )}
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded border",
                        picked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                      aria-hidden
                    >
                      {picked && <Check className="size-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                No achievements match.
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
