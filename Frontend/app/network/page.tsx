import { FriendNetwork } from '@/components/friend-network'
import { RequireSteamKey } from '@/components/require-steam-key'

/**
 * The /network page: a heading over the FriendNetwork graph, which only loads
 * once the user has added their Steam API key and account.
 */
export default function NetworkPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Friend Network
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your social graph at a glance. Nodes are friends, edges are connections — hover to
          highlight, click to inspect.
        </p>
      </header>
      <RequireSteamKey>
        <FriendNetwork />
      </RequireSteamKey>
    </main>
  )
}
