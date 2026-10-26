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
