"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { NewsArticleDialog } from "@/components/news-article-dialog";
import { firstImage, stripBBCode } from "@/lib/steam-bbcode";
import type { Game, NewsItem, NewsPage } from "@/lib/types";

const NEWS_PAGE_SIZE = 5;
const MAX_NEWS_ARTICLES = 50;
const NEWS_UNAVAILABLE_MESSAGE =
  "News isn't available right now. Please try again another time.";

//the article's first image, renders nothing if it has none or the image fails to load
function NewsCardImage({
  contents,
  gameName,
}: {
  contents: string;
  gameName: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = firstImage(contents);
  if (src === null || failed) return null;

  return (
    <div className="relative aspect-[460/215] w-full">
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 480px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
      <span className="absolute left-2 top-2 rounded bg-popover/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
        {gameName}
      </span>
    </div>
  );
}

//loads a game's articles when it mounts, render with key={game.id} so each game starts fresh
export function GameNewsFeed({ game }: { game: Game }) {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  function loadPage(offset: number) {
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(false);

    axios
      .get<NewsPage>("http://localhost:5011/circleNews/getNewsPage", {
        params: { appid: game.id, offset, count: NEWS_PAGE_SIZE },
        withCredentials: true,
        signal: controller.signal,
      })
      .then((res) => {
        setArticles((current) => {
          //the stored list can refresh between pages and repeat a story
          const seen = new Set(current.map((n) => n.gid));
          return [...current, ...res.data.news.filter((n) => !seen.has(n.gid))];
        });
        setHasMore(res.data.hasMore);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }

  useEffect(() => {
    loadPage(0);
    return () => controllerRef.current?.abort();
  }, []);

  if (articles.length === 0) {
    if (loading) return <p className="text-sm">Loading news...</p>;
    if (error) return <p className="text-sm">{NEWS_UNAVAILABLE_MESSAGE}</p>;
    return <p className="text-sm">No recent news for {game.name}.</p>;
  }

  return (
    <>
      <ul className="h-170 space-y-3 overflow-y-scroll">
        {articles.map((n) => {
          return (
            <li
              key={n.gid}
              className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
            >
              <article className="relative flex flex-col">
                <NewsCardImage contents={n.contents} gameName={game.name} />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-primary">
                      Author: {n.author}
                    </span>
                    <span aria-hidden>·</span>

                    <time>{new Date(n.date).toLocaleString()}</time>
                  </div>
                  <h3 className="mt-1 text-pretty font-semibold leading-snug text-foreground">
                    {/* after: stretches the click area over the whole card */}
                    <button
                      type="button"
                      onClick={() => setSelectedArticle(n)}
                      className="cursor-pointer text-left outline-none after:absolute after:inset-0 focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                    >
                      {n.title}
                    </button>
                  </h3>
                  <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                    {stripBBCode(n.contents)}
                  </p>
                </div>
              </article>
            </li>
          );
        })}

        {error && (
          <li className="py-2 text-center text-sm text-muted-foreground">
            {NEWS_UNAVAILABLE_MESSAGE}
          </li>
        )}

        {!error && hasMore && (
          <li className="flex justify-center py-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => loadPage(articles.length)}
              className="cursor-pointer rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-default disabled:opacity-60"
            >
              {loading ? "Loading..." : "Show more stories"}
            </button>
          </li>
        )}

        {!error && articles.length >= MAX_NEWS_ARTICLES && (
          <li className="py-2 text-center text-sm text-muted-foreground">
            Showing the latest {MAX_NEWS_ARTICLES} stories
          </li>
        )}
      </ul>

      <NewsArticleDialog
        article={selectedArticle}
        gameName={game.name}
        onClose={() => setSelectedArticle(null)}
      />
    </>
  );
}
