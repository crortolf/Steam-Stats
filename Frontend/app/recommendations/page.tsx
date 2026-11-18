import { RequireSteamKey } from "@/components/require-steam-key";
import { RecommendationsView } from "@/components/recommendations/recommendations-view";

/**
 * The /recommendations page: a heading over RecommendationsView, which only
 * loads once the user has added their Steam API key and account.
 */
export default function RecommendationsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-32">
      <header className="mx-auto mb-6 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Recommendations
        </h1>
        <p className="mt-1 text-muted-foreground">
          Games other players think you should try, with the achievements they
          found most memorable.
        </p>
      </header>
      <RequireSteamKey>
        <RecommendationsView />
      </RequireSteamKey>
    </main>
  );
}
