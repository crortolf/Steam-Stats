"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage, useAuth } from "@/lib/auth";

/**
 * The profile page's Steam account section: shows the saved Steam ID as a link
 * to the profile, and a form to add or change it. Accepts a Steam ID, profile
 * URL or custom URL name.
 */
export function SteamId({ steamId }: { steamId: string | null }) {
  const { saveSteamId } = useAuth();
  const [changing, setChanging] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = steamId === null || changing;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveSteamId(draft);
      setDraft("");
      setChanging(false);
    } catch (e) {
      setError(
        authErrorMessage(e, "Your Steam ID couldn't be saved. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      {steamId !== null ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://steamcommunity.com/profiles/${steamId}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {steamId}
          </a>
          {!changing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setChanging(true)}
            >
              Change
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add your Steam account so the site can show your friends, games and
          achievements.
        </p>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="steam-id">
              {steamId === null ? "Steam ID or profile URL" : "New Steam ID"}
            </Label>
            <Input
              id="steam-id"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="76561198000000000 or steamcommunity.com/id/yourname"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              required
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              To find your profile URL, open Steam, click your name in the top
              menu and choose <span className="font-medium">Profile</span>.
              Then right-click anywhere on the page and choose{" "}
              <span className="font-medium">Copy Page URL</span>. On{" "}
              <a
                href="https://steamcommunity.com/my/profile"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                steamcommunity.com
              </a>
              , copy the URL from your browser&apos;s address bar instead.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Steam ID"}
            </Button>
            {steamId !== null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft("");
                  setError(null);
                  setChanging(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
