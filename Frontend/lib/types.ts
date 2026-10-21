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
  //id: string;
  appImage: string;
  appid: number;
  title: string;
};
