"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ExternalLink, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import type { Recommendation } from "@/lib/types";
import { ImageGallery } from "./image-gallery";

const fullDate = new Intl.DateTimeFormat(undefined, {
  dateStyle: "long",
  timeStyle: "short",
});

/** Colour the score badge by how positive it is. */
function scoreTone(score: number) {
  if (score >= 8) return "border-status-Online/40 bg-status-Online/15 text-status-Online";
  if (score >= 5) return "border-primary/40 bg-primary/15 text-primary";
  return "border-destructive/40 bg-destructive/15 text-destructive";
}

export function RecommendationCard({
  recommendation: r,
  onDelete,
}: {
  recommendation: Recommendation;
  /** Shown only on the viewer's own posts. Resolves once deleted. */
  onDelete?: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      {/* author */}
      <header className="flex items-center gap-3 px-4 pt-4 sm:px-5">
        {r.author.avatar ? (
          <Image
            src={r.author.avatar}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-md"
          />
        ) : (
          <div className="size-10 rounded-md bg-secondary" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-semibold text-foreground">
            {r.author.name}
            {r.isYours && (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                You
              </Badge>
            )}
          </p>
          <time
            dateTime={r.createdAt}
            title={fullDate.format(new Date(r.createdAt))}
            className="text-xs text-muted-foreground"
          >
            {timeAgo(r.createdAt)}
          </time>
        </div>

        {r.isYours && onDelete && (
          <div className="flex shrink-0 items-center gap-1">
            {confirming ? (
              <>
                <span className="text-xs text-muted-foreground">Delete?</span>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await onDelete(r.id);
                    } finally {
                      setDeleting(false);
                      setConfirming(false);
                    }
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Delete this recommendation"
                className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* game */}
      <a
        href={`https://store.steampowered.com/app/${r.game.id}`}
        target="_blank"
        rel="noreferrer"
        className="group mx-4 mt-3 flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2 hover:border-primary/40 sm:mx-5"
        title="Open on the Steam Store"
      >
        {r.game.image && (
          <Image
            src={r.game.image}
            alt=""
            width={184}
            height={86}
            className="h-12 w-auto shrink-0 rounded sm:h-14"
          />
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-foreground group-hover:text-primary">
          {r.game.name}
        </span>
        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        {r.score !== null && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-sm font-semibold",
              scoreTone(r.score),
            )}
            aria-label={`Scored ${r.score} out of 10`}
          >
            <Star className="size-3.5" aria-hidden />
            {r.score}
            <span className="text-xs font-normal opacity-70">/10</span>
          </span>
        )}
      </a>

      {/* the recommendation itself */}
      <p className="whitespace-pre-wrap break-words px-4 pt-3 text-sm leading-relaxed text-foreground sm:px-5">
        {r.body}
      </p>

      {r.images.length > 0 && (
        <div className="mx-4 mt-3 sm:mx-5">
          <ImageGallery images={r.images} />
        </div>
      )}

      {/* highlighted achievements */}
      {r.achievements.length > 0 && (
        <section className="mx-4 mt-4 sm:mx-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Highlighted achievements
          </h3>
          <ul className="flex flex-col gap-2">
            {r.achievements.map((a) => (
              <li
                key={a.apiName}
                className="rounded-lg border border-border bg-secondary/20 p-3"
              >
                <div className="flex items-start gap-3">
                  <Image
                    src={a.icon}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-foreground">
                      {a.name}
                      {a.unlocked && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-normal text-status-Online">
                          <Check className="size-3" aria-hidden /> Unlocked
                        </span>
                      )}
                    </p>
                    {a.description && (
                      <p className="text-xs text-muted-foreground">
                        {a.description}
                      </p>
                    )}
                  </div>
                </div>
                {a.comment && (
                  <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-primary/50 pl-3 text-sm text-foreground">
                    {a.comment}
                  </blockquote>
                )}
                {a.images.length > 0 && (
                  <div className="mt-2">
                    <ImageGallery images={a.images} small />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="h-4 sm:h-5" />
    </article>
  );
}
