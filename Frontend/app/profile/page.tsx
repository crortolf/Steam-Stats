import Image from 'next/image'
import { Trophy, Gamepad2, Clock } from 'lucide-react'
import {
  currentUser,
  friends,
  achievements,
  games,
  getGame,
  statusLabel,
} from '@/lib/mock-data'
import { StatusDot } from '@/components/status-dot'
import { GameCapsule } from '@/components/game-capsule'
import { AccountSettings } from '@/components/account-settings'

export default function ProfilePage() {
  const favoriteGames = currentUser.favoriteGameIds
    .map((id) => getGame(id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g))

  const totalPlaytime = 4820
  const unlockedCount = achievements.filter((a) => a.unlockedByUser).length

  // Build a small recent-activity feed from unlocked achievements.
  const activity = achievements
    .filter((a) => a.unlockedByUser && a.unlockedDate)
    .sort((a, b) => Date.parse(b.unlockedDate!) - Date.parse(a.unlockedDate!))
    .slice(0, 5)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Profile header */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          className="h-28 w-full sm:h-36"
          style={{
            background:
              'linear-gradient(120deg, #1a9fff 0%, #2a475e 45%, #171a21 100%)',
          }}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
          <div className="relative -mt-16 sm:-mt-20">
            <Image
              src={currentUser.avatar || '/placeholder.svg'}
              alt=""
              width={112}
              height={112}
              className="rounded-lg ring-4 ring-card"
            />
            <StatusDot
              status={currentUser.status}
              className="absolute bottom-1 right-1 size-4 ring-2 ring-card"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {currentUser.name}
              </h1>
              <span aria-hidden className="text-xl">
                {currentUser.countryFlag}
              </span>
            </div>
            <p className="text-sm text-status-online">{statusLabel[currentUser.status]}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid size-14 place-items-center rounded-full border-2 border-primary bg-primary/10">
              <span className="font-mono text-lg font-bold text-primary">{currentUser.level}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Steam Level</p>
              <p>Member since {currentUser.memberSince}</p>
            </div>
          </div>
        </div>

        {/* quick stats */}
        <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
          <Stat icon={<Gamepad2 className="size-4" />} label="Games" value={String(games.length)} />
          <Stat
            icon={<Clock className="size-4" />}
            label="Hours played"
            value={totalPlaytime.toLocaleString()}
          />
          <Stat
            icon={<Trophy className="size-4" />}
            label="Achievements"
            value={String(unlockedCount)}
          />
          <Stat
            icon={<StatusDot status="online" className="size-3" />}
            label="Friends"
            value={String(friends.length)}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Favorite games showcase */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold text-foreground">Favorite games</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {favoriteGames.map((g) => (
                <div key={g.id}>
                  <GameCapsule game={g} sizes="(max-width: 640px) 100vw, 200px" />
                  <p className="mt-2 truncate text-sm font-medium text-foreground">{g.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{g.genre}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Account settings */}
          <section>
            <h2 className="mb-4 font-semibold text-foreground">Account settings</h2>
            <AccountSettings />
          </section>
        </div>

        {/* Right column: recent activity */}
        <aside className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-semibold text-foreground">Recent activity</h2>
          <ul className="flex flex-col gap-4">
            {activity.map((a) => {
              const game = getGame(a.gameId)
              return (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                    <Trophy className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      Unlocked <span className="font-medium">{a.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {game?.title} · {a.unlockedDate}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.globalPct}% of players have this
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </aside>
      </div>
    </main>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 bg-card px-5 py-4">
      <span className="grid size-9 place-items-center rounded-md bg-secondary/50 text-primary">
        {icon}
      </span>
      <div>
        <p className="font-mono text-lg font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
