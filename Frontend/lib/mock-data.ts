// Frontend-only mock data for the Steam-style app.
// No real Steam API is used — everything here is illustrative sample data.

export type FriendStatus =
  | "Offline"
  | "Online"
  | "Busy"
  | "Away"
  | "Snooze"
  | "Looking to trade"
  | "Looking to play";

export type Game = {
  title: string;
  image: string;
  developer: string;
  appId: number;
};

export type Friend = {
  id: string;
  name: string;
  avatar: string;
  status: FriendStatus;
  level: number;
  countryFlag: string;
  currentAppId?: number;
  mutualFriendIds: string[];
  totalPlaytime: number; // hours
};

export type CurrentUser = {
  id: string;
  name: string;
  avatar: string;
  level: number;
  status: FriendStatus;
  memberSince: string;
  countryFlag: string;
  favoriteGameIds: string[];
};

export type RecentPlay = {
  friendId: string;
  appId: number;
  hoursTwoWeeks: number;
  lastPlayed: string;
};

export type NewsItem = {
  id: string;
  appId: number;
  title: string;
  source: string;
  date: string;
  snippet: string;
};

export type Achievement = {
  id: string;
  appId: number;
  name: string;
  description: string;
  globalPct: number; // % of all players who unlocked
  friendsPct: number; // % of your friends who unlocked
  unlockedByUser: boolean;
  unlockedDate?: string;
};

export const games: Game[] = [
  {
    title: "Nebula Drift",
    image: "/games/nebula-drift.png",
    developer: "Lumen Interactive",
    appId: 730100,
  },
  {
    title: "Ashen Kingdoms",
    image: "/games/ashen-kingdoms.png",
    developer: "Emberforge Studios",
    appId: 550220,
  },
  {
    title: "Neon Circuit",
    image: "/games/neon-circuit.png",
    developer: "Pulse Games",
    appId: 442310,
  },
  {
    title: "Verdant Hollow",
    image: "/games/verdant-hollow.png",
    developer: "Willow & Oak",
    appId: 903440,
  },
  {
    title: "Iron Vanguard",
    image: "/games/iron-vanguard.png",
    developer: "Cobalt Line",
    appId: 128870,
  },
  {
    title: "Shadowline",
    image: "/games/shadowline.png",
    developer: "Nightjar Collective",
    appId: 667012,
  },
];

export const currentUser: CurrentUser = {
  id: "u0",
  name: "Vector",
  avatar: "/avatars/user.png",
  level: 47,
  status: "Online",
  memberSince: "March 2013",
  countryFlag: "🇺🇸",
  favoriteGameIds: ["nebula-drift", "ashen-kingdoms", "shadowline"],
};

export const friends: Friend[] = [
  {
    id: "f1",
    name: "PixelWitch",
    avatar: "/avatars/friend-1.png",
    status: "Online",
    level: 62,
    countryFlag: "🇨🇦",
    currentAppId: 550220,
    mutualFriendIds: ["f2", "f3", "f7"],
    totalPlaytime: 3120,
  },
  {
    id: "f2",
    name: "GrizzlyDev",
    avatar: "/avatars/friend-2.png",
    status: "Online",
    level: 38,
    countryFlag: "🇬🇧",
    mutualFriendIds: ["f1", "f3", "f4"],
    totalPlaytime: 1890,
  },
  {
    id: "f3",
    name: "VisorKid",
    avatar: "/avatars/friend-3.png",
    status: "Online",
    level: 51,
    countryFlag: "🇩🇪",
    currentAppId: 442310,
    mutualFriendIds: ["f1", "f2", "f5", "f8"],
    totalPlaytime: 2450,
  },
  {
    id: "f4",
    name: "CrimsonJ",
    avatar: "/avatars/friend-4.png",
    status: "Offline",
    level: 29,
    countryFlag: "🇫🇷",
    mutualFriendIds: ["f2", "f6"],
    totalPlaytime: 940,
  },
  {
    id: "f5",
    name: "HelmBot",
    avatar: "/avatars/friend-5.png",
    status: "Online",
    level: 74,
    countryFlag: "🇯🇵",
    currentAppId: 128870,
    mutualFriendIds: ["f3", "f8", "f9"],
    totalPlaytime: 5210,
  },
  {
    id: "f6",
    name: "OldGuard",
    avatar: "/avatars/friend-6.png",
    status: "Offline",
    level: 33,
    countryFlag: "🇸🇪",
    mutualFriendIds: ["f4", "f7"],
    totalPlaytime: 1120,
  },
  {
    id: "f7",
    name: "NyaBeats",
    avatar: "/avatars/friend-7.png",
    status: "Online",
    level: 45,
    countryFlag: "🇰🇷",
    mutualFriendIds: ["f1", "f6", "f9"],
    totalPlaytime: 2010,
  },
  {
    id: "f8",
    name: "VoltFace",
    avatar: "/avatars/friend-8.png",
    status: "Online",
    level: 56,
    countryFlag: "🇧🇷",
    currentAppId: 730100,
    mutualFriendIds: ["f3", "f5"],
    totalPlaytime: 3380,
  },
  {
    id: "f9",
    name: "BraidRunner",
    avatar: "/avatars/friend-9.png",
    status: "Online",
    level: 41,
    countryFlag: "🇦🇺",
    currentAppId: 903440,
    mutualFriendIds: ["f5", "f7"],
    totalPlaytime: 1670,
  },
];

// The current user is connected to every friend in this dataset.
export const userFriendIds: string[] = friends.map((f) => f.id);

export const recentPlays: RecentPlay[] = [
  {
    friendId: "f1",
    appId: 550220,
    hoursTwoWeeks: 22.4,
    lastPlayed: "Playing now",
  },
  {
    friendId: "f3",
    appId: 442310,
    hoursTwoWeeks: 14.1,
    lastPlayed: "Playing now",
  },
  {
    friendId: "f5",
    appId: 128870,
    hoursTwoWeeks: 31.7,
    lastPlayed: "Playing now",
  },
  {
    friendId: "f8",
    appId: 730100,
    hoursTwoWeeks: 18.9,
    lastPlayed: "Playing now",
  },
  {
    friendId: "f9",
    appId: 903440,
    hoursTwoWeeks: 9.3,
    lastPlayed: "2 hours ago",
  },
  {
    friendId: "f2",
    appId: 128870,
    hoursTwoWeeks: 6.5,
    lastPlayed: "Yesterday",
  },
  {
    friendId: "f7",
    appId: 730100,
    hoursTwoWeeks: 11.2,
    lastPlayed: "Yesterday",
  },
  {
    friendId: "f4",
    appId: 667012,
    hoursTwoWeeks: 4.8,
    lastPlayed: "3 days ago",
  },
  {
    friendId: "f6",
    appId: 550220,
    hoursTwoWeeks: 7.6,
    lastPlayed: "4 days ago",
  },
  {
    friendId: "f1",
    appId: 667012,
    hoursTwoWeeks: 3.2,
    lastPlayed: "5 days ago",
  },
];

export const news: NewsItem[] = [
  {
    id: "n1",
    appId: 550220,
    title: "Ashen Kingdoms — The Emberfall Update is live",
    source: "Emberforge Studios",
    date: "Aug 14, 2026",
    snippet:
      "A new region opens beyond the Ashen Gate, bringing three boss encounters, a reworked parry system, and 40 new achievements to hunt.",
  },
  {
    id: "n2",
    appId: 730100,
    title: "Nebula Drift Season 4: Voidrunners begins",
    source: "Lumen Interactive",
    date: "Aug 13, 2026",
    snippet:
      "Season 4 introduces the co-op Deep Void raid, a new carrier-class ship, and cross-fleet leaderboards for the whole squadron.",
  },
  {
    id: "n3",
    appId: 442310,
    title: "Neon Circuit patch 2.7 rebalances drift scoring",
    source: "Pulse Games",
    date: "Aug 11, 2026",
    snippet:
      "Drift chains now reward consistency over risk, plus two night-city tracks and a photo mode land in this week’s update.",
  },
  {
    id: "n4",
    appId: 128870,
    title: "Iron Vanguard competitive ladder resets for Act III",
    source: "Cobalt Line",
    date: "Aug 10, 2026",
    snippet:
      "Ranked resets across all regions as Act III adds the Foundry map, a new support mech, and anti-cheat improvements.",
  },
  {
    id: "n5",
    appId: 903440,
    title: "Verdant Hollow: Autumn Harvest festival returns",
    source: "Willow & Oak",
    date: "Aug 8, 2026",
    snippet:
      "Decorate your homestead, trade rare seeds with neighbors, and unlock the limited Golden Scarecrow before the season ends.",
  },
  {
    id: "n6",
    appId: 667012,
    title: "Shadowline developer diary: designing silent takedowns",
    source: "Nightjar Collective",
    date: "Aug 6, 2026",
    snippet:
      "The team breaks down the new reactive AI, dynamic shadows, and how the upcoming heist DLC reshapes level design.",
  },
  {
    id: "n7",
    appId: 730100,
    title: "Community spotlight: the Nebula Drift photo contest winners",
    source: "Lumen Interactive",
    date: "Aug 4, 2026",
    snippet:
      "We rounded up the most breathtaking captures from across the galaxy. Check out the top ten shots from the community.",
  },
];

export const achievements: Achievement[] = [
  {
    id: "a1",
    appId: 550220,
    name: "First Ember",
    description: "Light the first bonfire beyond the Ashen Gate.",
    globalPct: 78.4,
    friendsPct: 85,
    unlockedByUser: true,
    unlockedDate: "Jul 2, 2026",
  },
  {
    id: "a2",
    appId: 550220,
    name: "Parry Master",
    description: "Perfectly parry 100 attacks.",
    globalPct: 31.2,
    friendsPct: 44,
    unlockedByUser: true,
    unlockedDate: "Jul 19, 2026",
  },
  {
    id: "a3",
    appId: 550220,
    name: "The Long Dark",
    description: "Defeat the Warden of Ash without taking damage.",
    globalPct: 4.7,
    friendsPct: 11,
    unlockedByUser: false,
  },
  {
    id: "a4",
    appId: 550220,
    name: "Ashbringer",
    description: "Reach the true ending.",
    globalPct: 12.9,
    friendsPct: 22,
    unlockedByUser: true,
    unlockedDate: "Aug 5, 2026",
  },
  {
    id: "a5",
    appId: 550220,
    name: "Completionist",
    description: "Collect every relic in the world.",
    globalPct: 2.1,
    friendsPct: 6,
    unlockedByUser: false,
  },
  {
    id: "a6",
    appId: 730100,
    name: "Maiden Voyage",
    description: "Complete the tutorial jump.",
    globalPct: 94.1,
    friendsPct: 100,
    unlockedByUser: true,
    unlockedDate: "Jun 1, 2026",
  },
  {
    id: "a7",
    appId: 730100,
    name: "Ace Pilot",
    description: "Win 50 dogfights.",
    globalPct: 27.8,
    friendsPct: 38,
    unlockedByUser: true,
    unlockedDate: "Jun 24, 2026",
  },
  {
    id: "a8",
    appId: 730100,
    name: "Deep Void",
    description: "Clear the Deep Void raid on legendary.",
    globalPct: 3.3,
    friendsPct: 9,
    unlockedByUser: false,
  },
  {
    id: "a9",
    appId: 730100,
    name: "Fleet Commander",
    description: "Lead a full squadron to victory.",
    globalPct: 15.6,
    friendsPct: 25,
    unlockedByUser: true,
    unlockedDate: "Jul 30, 2026",
  },
  {
    id: "a10",
    appId: 667012,
    name: "Ghost",
    description: "Finish a mission fully undetected.",
    globalPct: 22.5,
    friendsPct: 30,
    unlockedByUser: true,
    unlockedDate: "Jul 12, 2026",
  },
  {
    id: "a11",
    appId: 667012,
    name: "No Alarms",
    description: "Complete the heist without triggering a single alarm.",
    globalPct: 6.8,
    friendsPct: 14,
    unlockedByUser: false,
  },
  {
    id: "a12",
    appId: 667012,
    name: "Silent Legend",
    description: "Earn every stealth commendation.",
    globalPct: 1.9,
    friendsPct: 5,
    unlockedByUser: false,
  },
];

// ---- helpers ----

export function getGame(id: number): Game | undefined {
  return games.find((g) => g.appId === id);
}

export function getFriend(id: string): Friend | undefined {
  return friends.find((f) => f.id === id);
}

export function getFriendName(id: string): string {
  return friends.find((f) => f.id === id)?.name ?? "Unknown";
}

export const statusLabel: Record<FriendStatus, string> = {
  Online: "Online",
  Offline: "Offline",
  Away: "Away",
  "Looking to play": "Looking to play",
  "Looking to trade": "Looking to trade",
  Busy: "Busy",
  Snooze: "Snooze",
};
