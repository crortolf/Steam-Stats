"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage, useAuth } from "@/lib/auth";

/**
 * The profile page's password section: a "Change password" button that opens a
 * form for the current password and the new one twice. After a change, the
 * user's other devices are signed out.
 */
export function PasswordReset() {
  const { changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function close() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      close();
      setSaved(true);
    } catch (e) {
      setError(
        authErrorMessage(
          e,
          "Your password couldn't be changed. Please try again.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-2 flex flex-col items-start gap-2">
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            Your password was changed, and your other devices were signed out.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setSaved(false);
            setOpen(true);
          }}
        >
          Reset password
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving..." : "Save password"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
