"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink, X } from "lucide-react";
import { SteamArticleBody } from "@/components/steam-article-body";
import { safeUrl } from "@/lib/steam-bbcode";
import type { NewsItem } from "@/lib/types";

/**
 * A popup with a full news article: its title, author, date, formatted body
 * and a link to read it on Steam. Open whenever article isn't null.
 */
export function NewsArticleDialog({
  article,
  gameName,
  onClose,
}: {
  article: NewsItem | null;
  gameName: string;
  onClose: () => void;
}) {
  if (article === null) return null;
  const steamUrl = safeUrl(article.url);

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-popover shadow-xl outline-none">
          <header className="flex items-start gap-4 border-b border-border p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-primary">{gameName}</p>
              <Dialog.Title className="mt-1 text-pretty text-lg font-semibold leading-snug text-foreground">
                {article.title}
              </Dialog.Title>
              <p className="mt-1 text-xs text-muted-foreground">
                {article.author && `Author: ${article.author} · `}
                <time>{new Date(article.date).toLocaleString()}</time>
              </p>
            </div>
            <Dialog.Close
              aria-label="Close article"
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-5" />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-5">
            <SteamArticleBody contents={article.contents} />
          </div>

          {steamUrl && (
            <footer className="border-t border-border p-3 sm:px-5">
              <a
                href={steamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                View on Steam <ExternalLink className="size-3.5" />
              </a>
            </footer>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
