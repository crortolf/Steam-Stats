export type NewsItem = {
  author: string;
  contents: string;
  date: number;
  title: string;
};

export type Player = {
  avatar: string;
  name: string;
};

export type GameNews = {
  game: Game;
  news: NewsItem[];
  players: Player[];
};

export type Game = {
  appImage: string;
  appid: number;
  title: string;
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
