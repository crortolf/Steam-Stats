"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import Image from "next/image";
import { PixelateFilterDefs } from "@/components/pixelate-filter";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Gamepad2,
  Lock,
  MapPin,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { StatusDot } from "@/components/status-dot";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/mock-data";
import type { PlayerCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

/** Player data is refetched once the cached copy is older than this. */
const MAX_AGE_MS = 5 * 60 * 1000;
/** Floor for the auto-refresh timer, so a backend that keeps returning old
 *  data (e.g. Steam is down) doesn't cause a tight refetch loop. */
const MIN_RETRY_MS = 30 * 1000;

// Shared across every PlayerCard so switching back to a player is instant
// while their data is still fresh.
const cache = new Map<string, PlayerCardData>();

const ageOf = (data: PlayerCardData) =>
  Date.now() - new Date(data.fetchedAt).getTime();
const isFresh = (data: PlayerCardData | undefined): data is PlayerCardData =>
  data !== undefined && ageOf(data) < MAX_AGE_MS;

const dateFormat = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** "6 years, 2 months", "3 months", "12 days" — how long since `iso`. */
function durationSince(iso: string) {
  const from = new Date(iso);
  const now = new Date();
  let months =
    (now.getFullYear() - from.getFullYear()) * 12 +
    (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months--;
  const plural = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (months <= 0) {
    const days = Math.max(
      0,
      Math.floor((now.getTime() - from.getTime()) / 86_400_000),
    );
    return days === 0 ? "Today" : plural(days, "day");
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return plural(rest, "month");
  return rest === 0
    ? plural(years, "year")
    : `${plural(years, "year")}, ${plural(rest, "month")}`;
}

/** Regional-indicator emoji flag for a two-letter country code. */
const flagOf = (code: string) =>
  code.length === 2
    ? String.fromCodePoint(
        ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
      )
    : "";

type Props = {
  steamid: string;
  /** Shown straight away while the full card loads. */
  fallback?: { username: string; avatar: string; censored?: boolean };
  /** Marks the card as the signed-in user's own profile. */
  isUser?: boolean;
  /** Steam id of the viewing user, used to show how long they've been friends. */
  friendOf?: string;
  className?: string;
};

/**
 * The details panel for the player selected in the friend network: avatar,
 * name, status, country, current game, how long they've been friends with the
 * user, and when they joined Steam and were last online. Cached between
 * players, and refreshed from the backend once the data is five minutes old.
 */
export function PlayerCard({
  steamid,
  fallback,
  isUser,
  friendOf,
  className,
}: Props) {
  // friendSince depends on who's viewing, so it's part of the cache key.
  const cacheKey = `${friendOf ?? ""}|${steamid}`;
  const [data, setData] = useState<PlayerCardData | undefined>(() =>
    cache.get(cacheKey),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Re-render every minute so "x minutes ago" labels stay current and the
  // staleness check below re-runs.
  const [, setTick] = useState(0);
  // The card currently shown, so late responses can be ignored.
  const currentKey = useRef(cacheKey);
  currentKey.current = cacheKey;

  const load = useCallback(
    async (force = false) => {
      const cached = cache.get(cacheKey);
      if (!force && isFresh(cached)) {
        setData(cached);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<PlayerCardData>(
          "http://localhost:5011/friendWeb/getPlayerCard/",
          {
            params: friendOf ? { steamid, friendOf } : { steamid },
            withCredentials: true,
          },
        );
        cache.set(cacheKey, res.data);
        // Ignore late responses for a player who is no longer selected.
        if (currentKey.current === cacheKey) setData(res.data);
      } catch (err) {
        console.log(err);
        if (currentKey.current === cacheKey)
          setError("Couldn't load this player's profile.");
      } finally {
        if (currentKey.current === cacheKey) setLoading(false);
      }
    },
    [cacheKey, steamid, friendOf],
  );

  // Show cached data (if any) for the new player immediately, then refresh
  // it if it's older than five minutes.
  useEffect(() => {
    setData(cache.get(cacheKey));
    setError(null);
    setLoading(false);
    load();
  }, [cacheKey, load]);

  // While the card is open, refetch as soon as the data turns five minutes
  // old, and tick every minute to keep relative times accurate.
  useEffect(() => {
    if (!data) return;
    const untilStale = Math.max(MIN_RETRY_MS, MAX_AGE_MS - ageOf(data));
    const refresh = setTimeout(() => load(), untilStale);
    const tick = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => {
      clearTimeout(refresh);
      clearInterval(tick);
    };
  }, [data, load]);

  const shown = data?.steamid === steamid ? data : undefined;
  const username = shown?.username ?? fallback?.username ?? "Loading…";
  const avatar = shown?.avatar ?? fallback?.avatar;
  const censored = shown?.censored ?? fallback?.censored ?? false;
  const online = shown != null && shown.status !== "Offline";

  return (
    <aside
      className={cn("rounded-xl border border-border bg-card p-5", className)}
      aria-busy={loading}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {censored && <PixelateFilterDefs id="pixelate-card" size={10} />}
          {avatar ? (
            <Image
              src={avatar}
              alt=""
              width={64}
              height={64}
              className={cn("rounded-md", isUser && "ring-2 ring-primary")}
              style={censored ? { filter: "url(#pixelate-card)" } : undefined}
              unoptimized
            />
          ) : (
            <div className="size-16 animate-pulse rounded-md bg-secondary" />
          )}
          {shown && (
            <StatusDot
              status={shown.status}
              className="absolute -bottom-1 -right-1 size-3.5 ring-2 ring-card"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {username}{" "}
            {shown?.countryCode && (
              <span aria-label={shown.countryCode}>
                {flagOf(shown.countryCode)}
              </span>
            )}
          </h2>
          {shown?.realName && (
            <p className="truncate text-sm text-muted-foreground">
              {shown.realName}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {isUser && (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                You
              </Badge>
            )}
            {shown && (
              <span className="text-sm text-muted-foreground">
                {statusLabel[shown.status]}
              </span>
            )}
          </div>
        </div>
      </div>

      {shown?.currentGame && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-status-Online/30 bg-status-Online/10 px-3 py-2 text-sm">
          <Gamepad2 className="size-4 shrink-0 text-status-Online" />
          <span className="truncate text-foreground">
            In-game:{" "}
            {shown.currentGameAppId ? (
              <a
                href={`https://store.steampowered.com/app/${shown.currentGameAppId}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-2 hover:text-primary hover:underline"
                title="Open on the Steam Store"
              >
                {shown.currentGame}
              </a>
            ) : (
              // Non-Steam games have no store page to link to.
              <span className="font-medium">{shown.currentGame}</span>
            )}
          </span>
        </div>
      )}

      {error && !shown && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      {shown && (
        <dl className="mt-5 flex flex-col gap-3">
          <InfoRow
            icon={<Clock className="size-4" />}
            label="Last online"
            value={
              online
                ? "Online now"
                : shown.lastLogoff
                  ? timeAgo(shown.lastLogoff)
                  : "Hidden"
            }
            title={
              !online && shown.lastLogoff
                ? dateTimeFormat.format(new Date(shown.lastLogoff))
                : undefined
            }
          />
          <InfoRow
            icon={<CalendarDays className="size-4" />}
            label="Profile created"
            value={
              shown.timeCreated
                ? dateFormat.format(new Date(shown.timeCreated))
                : "Hidden"
            }
            title={shown.timeCreated ? timeAgo(shown.timeCreated) : undefined}
          />
          {shown.friendSince && (
            <InfoRow
              icon={<UserPlus className="size-4" />}
              label="Friends for"
              value={durationSince(shown.friendSince)}
              title={`Friends since ${dateFormat.format(new Date(shown.friendSince))}`}
            />
          )}
          {shown.countryCode && (
            <InfoRow
              icon={<MapPin className="size-4" />}
              label="Country"
              value={shown.countryCode}
            />
          )}
        </dl>
      )}

      {shown && !shown.isPublic && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> This profile is private, so some
          details are hidden.
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          {shown ? `Updated ${timeAgo(shown.fetchedAt)}` : "Loading profile…"}
        </span>
        <div className="flex items-center gap-3">
          {shown?.profileUrl && (
            <a
              href={shown.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              Steam profile <ExternalLink className="size-3" />
            </a>
          )}
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-1 hover:text-foreground disabled:opacity-50"
            aria-label="Refresh player data"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * One labelled line in the PlayerCard, ex: "Friends for 6 years".
 */
function InfoRow({
  icon,
  label,
  value,
  title,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-secondary/40 px-3 py-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="ml-auto text-sm font-medium text-foreground" title={title}>
        {value}
      </dd>
    </div>
  );
}
