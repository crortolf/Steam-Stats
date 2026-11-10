export type AuthUser = {
  email: string;
  steamApiKey: string | null;
  // 64-bit Steam ID of the account whose data the site shows to this user.
  steamId: string | null;
};

export type NewsItem = {
  gid: string;
  url: string;
  author: string;
  //full article in steam's BBCode markup, see lib/steam-bbcode.ts
  contents: string;
  date: number;
  title: string;
};

// Returned by GET /friendWeb/getPlayerCard. Dates are ISO strings; Steam hides
// several fields (e.g. timeCreated) on private profiles, so those may be null.
export type PlayerCardData = {
  steamid: string;
  username: string;
  avatar: string;
  status: import("./mock-data").FriendStatus;
  realName: string | null;
  profileUrl: string | null;
  countryCode: string | null;
  isPublic: boolean;
  currentGame: string | null;
  // Store app id of the current game; null for non-Steam games.
  currentGameAppId: number | null;
  // When this player and the viewing user became friends (null if not friends).
  friendSince: string | null;
  lastLogoff: string | null;
  timeCreated: string | null;
  // When the backend last fetched this summary from Steam.
  fetchedAt: string;
};

// ---- Recommendations (GET/POST /recommendations) ----

// An uploaded image; served from /recommendations/images/:id.
export type RecommendationImage = {
  id: string;
  width: number;
  height: number;
};

export type RecommendationAchievement = {
  apiName: string;
  name: string;
  description: string;
  icon: string;
  iconGray: string;
  // Whether the author had unlocked it when they posted.
  unlocked: boolean;
  // The author's comment on it; empty if they didn't write one.
  comment: string;
  images: RecommendationImage[];
};

export type Recommendation = {
  id: string;
  author: { steamId: string; name: string; avatar: string | null };
  isYours: boolean;
  game: { id: number; name: string; image: string };
  body: string;
  // Out of 10, or null if the author didn't score it.
  score: number | null;
  images: RecommendationImage[];
  achievements: RecommendationAchievement[];
  createdAt: string;
};

export type RecommendationPage = {
  items: Recommendation[];
  // Pass as ?before= for the next (older) page; null when there are no more.
  nextCursor: string | null;
};

// A game the recommendation form can pick (GET /recommendations/games).
export type GameOption = {
  id: number;
  name: string;
  image: string | null;
  owned?: boolean;
};

// An achievement the form can highlight (GET /recommendations/achievements).
export type AchievementOption = Omit<
  RecommendationAchievement,
  "comment" | "images"
>;

export type Player = {
  avatar: string;
  name: string;
};

export type FriendGame = {
  game: Game;
  players: Player[];
};

export type NewsPage = {
  news: NewsItem[];
  hasMore: boolean;
};

export type Game = {
  image: string;
  id: number;
  name: string;
};

export type Achievement = {
  aId: string;
  achieved: number;
  time: string;
  name: string;
  description: string;
};

export type AchievementsData = {
  achievements: Achievement[];
  totalAchieved: number;
};

export type QuickGameInfo = {
  appId: string;
  title: string;
  playtime: string;
  lastPlayed: string;
  appImage: string;
};

export type SumAchievementData = {
  totalFriendsAchievements: number;
  id: number;
  totalFriendsScanned: number;
  totalAchieves: number;
  totalAchieved: number;
  totalGlobalAchievesPercent: number;
  achievements: Record<string, SumAchievement>;
  name: string;
  icon: string;
  image: string;
  description: string;
  publishDate: string;
  developers: string[];
  publishers: string[];
};

export type SumAchievement = {
  achieved: number;
  time: string;
  name: string;
  description: string;
  friendsAchieved: number;
  icon: string;
  icongray: string;
  globalPercent: number;
};
