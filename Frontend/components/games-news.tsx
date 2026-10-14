'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Clock, Newspaper } from 'lucide-react'
import {
  NewsItem,
  Game,
} from '@/lib/mock-data'
import { GameCapsule } from '@/components/game-capsule'
import { StatusDot } from '@/components/status-dot'
import { cn } from '@/lib/utils'
import axios from 'axios'

//TODO: replace with persistant user data
const TEMP_USERDATA = 76561198045843433

export async function GamesNews() {
  const games: Game[] = await axios.get("http://localhost:5011/circleNews/getNews", {
    params: {
      id: TEMP_USERDATA,
    }
  }).then(res => {
    return res.data
  });

  const filteredNews: NewsItem[] = [];
  
  return (
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Recently played by friends */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="size-4" /> Recently played by friends
          </h2>
          <ul className="flex flex-col gap-3">
            {games.map((p, i) => {
              const game = getGame(p.gameId)
              const friend = getFriend(p.friendId)
              if (!game || !friend) return null
              const playingNow = p.lastPlayed === 'Playing now'
              return (
                <li
                  key={`${p.friendId}-${p.gameId}-${i}`}
                  className="flex gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="w-28 shrink-0 sm:w-36">
                    <GameCapsule game={game} sizes="144px" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate font-semibold text-foreground">{game.title}</p>
                    <p className="text-xs text-muted-foreground">{game.genre}</p>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <div className="relative">
                        <Image
                          src={friend.avatar || '/placeholder.svg'}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded"
                        />
                        <StatusDot
                          status={friend.status as FriendStatus}
                          className="absolute -bottom-0.5 -right-0.5 size-2 ring-2 ring-card"
                        />
                      </div>
                      <span className="truncate text-sm text-foreground">{friend.name}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">
                        {p.hoursTwoWeeks}h past 2 weeks
                      </span>
                      <span className={cn(playingNow ? 'text-status-ingame' : 'text-muted-foreground')}>
                        {p.lastPlayed}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
            {games.length === 0 && (
              <li className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No friends have played this recently.
              </li>
            )}
          </ul>
        </section>

        {/* News feed */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Newspaper className="size-4" /> Game news
          </h2>
          <ul className="flex flex-col gap-3">
            {filteredNews.map((n) => {
              const game = getGame(n.gameId)
              return (
                <li
                  key={n.id}
                  className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
                >
                  <article className="flex flex-col">
                    {game && (
                      <div className="relative aspect-[460/215] w-full">
                        <Image
                          src={game.capsule || '/placeholder.svg'}
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 100vw, 480px"
                          className="object-cover"
                        />
                        <span className="absolute left-2 top-2 rounded bg-popover/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                          {game.title}
                        </span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">{n.source}</span>
                        <span aria-hidden>·</span>
                        <time>{n.date}</time>
                      </div>
                      <h3 className="mt-1 text-pretty font-semibold leading-snug text-foreground">
                        {n.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {n.snippet}
                      </p>
                    </div>
                  </article>
                </li>
              )
            })}
            {filteredNews.length === 0 && (
              <li className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No news for this game right now.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
