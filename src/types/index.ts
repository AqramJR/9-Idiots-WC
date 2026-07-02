// Core domain types for 9 idiots WC

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface User {
  id: string;
  name: string;
  avatar: string;
  points: number;
  exactPredictions: number;
  correctOutcomes: number;
  wrongPredictions: number;
  totalPredictions: number;
  createdAt: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string; // emoji flag, e.g. "🇧🇷"
  awayFlag: string;
  kickoff: number; // epoch millis
  group?: string;
  stage?: string; // e.g. "Group Stage", "Quarter-Final"
  finalHome: number | null;
  finalAway: number | null;
  status: MatchStatus;
}

export interface Prediction {
  id: string; // `${userId}_${matchId}`
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  points: number | null; // null until match is scored
  outcome: 'exact' | 'correct' | 'wrong' | null;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry extends User {
  rank: number;
}

export interface StoredIdentity {
  userId: string;
  name: string;
  avatar: string;
}
