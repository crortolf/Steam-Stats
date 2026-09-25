import { GamesNews } from '@/components/games-news'

export default function GamesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Games &amp; News
        </h1>
        <p className="mt-1 text-muted-foreground">
          What your friends are playing right now, paired with the latest news for each title.
        </p>
      </header>
      <GamesNews />
    </main>
  )
}
