import { AchievementsView } from '@/components/achievements-view'

export default function AchievementsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Achievements
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track your unlocks and see how your completion stacks up against the world and your
          friends.
        </p>
      </header>
      <AchievementsView />
    </main>
  )
}
