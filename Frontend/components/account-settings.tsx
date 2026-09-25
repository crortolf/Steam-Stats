'use client'

import { useState } from 'react'
import { currentUser } from '@/lib/mock-data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type Visibility = 'public' | 'friends' | 'private'

export function AccountSettings() {
  const [displayName, setDisplayName] = useState(currentUser.name)
  const [realName, setRealName] = useState('Alex Rivera')
  const [summary, setSummary] = useState(
    'Space sim enthusiast, part-time stealth archer. Add me if you play Nebula Drift.',
  )
  const [profileVis, setProfileVis] = useState<Visibility>('friends')
  const [gameDetails, setGameDetails] = useState(true)
  const [showOnline, setShowOnline] = useState(true)
  const [friendActivity, setFriendActivity] = useState(true)
  const [emailNews, setEmailNews] = useState(false)

  return (
    <Tabs defaultValue="profile">
      <TabsList className="bg-secondary/40">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="privacy">Privacy</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      {/* Profile */}
      <TabsContent value="profile" className="mt-4">
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="realName">Real name (optional)</Label>
            <Input
              id="realName"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="summary">Profile summary</Label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <SaveBar />
        </div>
      </TabsContent>

      {/* Privacy */}
      <TabsContent value="privacy" className="mt-4">
        <div className="flex flex-col rounded-xl border border-border bg-card p-6">
          <div className="grid gap-2">
            <Label htmlFor="profileVis">Profile visibility</Label>
            <div className="flex flex-wrap gap-2" id="profileVis">
              {(['public', 'friends', 'private'] as Visibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setProfileVis(v)}
                  className={
                    profileVis === v
                      ? 'rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-medium capitalize text-primary-foreground'
                      : 'rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm font-medium capitalize text-muted-foreground hover:text-foreground'
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Separator className="my-5" />
          <ToggleRow
            label="Show game details"
            desc="Let others see your game library and playtime."
            checked={gameDetails}
            onChange={setGameDetails}
          />
          <ToggleRow
            label="Show online status"
            desc="Display when you're online or in a game."
            checked={showOnline}
            onChange={setShowOnline}
          />
          <ToggleRow
            label="Show me in friends' activity"
            desc="Appear in the recent activity feeds of your friends."
            checked={friendActivity}
            onChange={setFriendActivity}
          />
          <SaveBar />
        </div>
      </TabsContent>

      {/* Notifications */}
      <TabsContent value="notifications" className="mt-4">
        <div className="flex flex-col rounded-xl border border-border bg-card p-6">
          <ToggleRow
            label="Email me game news"
            desc="Weekly digest of news for games in your library."
            checked={emailNews}
            onChange={setEmailNews}
          />
          <ToggleRow
            label="Friend activity alerts"
            desc="Notify me when friends start playing a shared game."
            checked={friendActivity}
            onChange={setFriendActivity}
          />
          <SaveBar />
        </div>
      </TabsContent>
    </Tabs>
  )
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SaveBar() {
  return (
    <div className="mt-2 flex items-center gap-3">
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
        Save changes
      </Button>
      <span className="text-xs text-muted-foreground">Demo only — nothing is stored.</span>
    </div>
  )
}
