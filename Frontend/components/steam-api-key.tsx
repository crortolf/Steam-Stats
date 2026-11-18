"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage, useAuth } from "@/lib/auth";

/**
 * The profile page's Steam API key section: shows the saved key hidden (with a
 * show/hide button), and a form to add or replace it. The backend checks the
 * key with Steam before saving.
 */
export function SteamApiKey({ apiKey }: { apiKey: string | null }) {
  const { saveSteamApiKey } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = apiKey === null || replacing;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveSteamApiKey(draft);
      setDraft("");
      setRevealed(false);
      setReplacing(false);
    } catch (e) {
      setError(
        authErrorMessage(e, "Your key couldn't be saved. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      {apiKey !== null && (
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 break-all font-mono text-sm text-muted-foreground">
            {revealed ? apiKey : `${"•".repeat(28)}${apiKey.slice(-4)}`}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? "Hide" : "Show"}
          </Button>
          {!replacing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReplacing(true)}
            >
              Replace
            </Button>
          )}
        </div>
      )}

      {apiKey === null && (
        <p className="text-sm text-muted-foreground">
          You haven't added a Steam API key yet.
        </p>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="steam-api-key">
              {apiKey === null ? "Add your key" : "New key"}
            </Label>
            <Input
              id="steam-api-key"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              required
            />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p>To get a Steam Web API key:</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                <li>
                  Go to{" "}
                  <a
                    href="https://steamcommunity.com/dev/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    steamcommunity.com/dev/apikey
                  </a>{" "}
                  and sign in to Steam.
                </li>
                <li>
                  Enter any domain name, such as{" "}
                  <span className="font-mono">localhost</span>, agree to the
                  terms and click <span className="font-medium">Register</span>.
                </li>
                <li>
                  Copy the 32-character key shown on the page and paste it
                  here.
                </li>
              </ol>
              <p className="mt-1">
                Steam may ask you to confirm in the Steam mobile app, and
                limited accounts (ones that haven&apos;t spent at least $5)
                can&apos;t create a key. Keep your key private.
              </p>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save key"}
            </Button>
            {apiKey !== null && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft("");
                  setError(null);
                  setReplacing(false);
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
