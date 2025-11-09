// src/types/league.ts

export type Outcome = "win" | "loss" | "tie" | "unknown";

export interface LeagueMatchView {
  matchId: string;
  opponent: string;
  status: string;
  picked: string[];
  banned: string[];
  locations: string[];
  ourScore?: number;
  oppScore?: number;
  outcome: Outcome;
  url?: string;
  sortKey?: number;
}

export interface MapStats {
  [mapName: string]: {
    played: number;
  };
}

export interface PlayerMapStatsPerMap {
  kills: number;
  deaths: number;
  adrSum: number;
  hsKills: number;
  rounds: number;
}

export interface PlayerMapSummary {
  nickname: string;
  playerId: string;
  maps: Record<string, PlayerMapStatsPerMap>;
}

export interface PlayerView {
  playerId: string; // from /teams
  nickname: string;
  faceitElo?: number;
}
