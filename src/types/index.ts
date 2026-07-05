// Core domain types for 9 idiots WC

export type MatchStatus = 'scheduled' | 'live' | 'finished';
export type PenaltyWinner = 'home' | 'away';

export interface User {
  id: string;
  username: string; // lowercase, immutable login identifier
  name: string; // mutable display name — can differ from username, editable in-app
  avatar: string;
  points: number; // auto-computed from scored predictions — recalculation ALWAYS overwrites this
  bonusPoints: number; // manual admin adjustments + troll penalties — recalculation NEVER touches this, so it persists forever
  exactPredictions: number; // auto-computed — overwritten by recalculation
  correctOutcomes: number; // auto-computed — overwritten by recalculation
  wrongPredictions: number; // auto-computed — overwritten by recalculation
  totalPredictions: number; // auto-computed — overwritten by recalculation
  bonusExact: number; // manual baseline (e.g. imported WhatsApp history) — never touched by recalculation
  bonusCorrect: number; // manual baseline — never touched by recalculation
  bonusTotalPredictions: number; // manual baseline — never touched by recalculation
  streakBonusPoints: number; // auto-computed by recalculation: +3 per consecutive exact score beyond the first in a row (2-in-a-row = +3, 3-in-a-row = +6, ...). Resets to 0 whenever a chronologically-next finished match is wrong or merely "correct".
  createdAt: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string; // emoji flag or image URL
  awayFlag: string;
  kickoff: number; // epoch millis
  group?: string | null; // present for group-stage matches, null/absent for knockout matches
  stage?: string; // e.g. "Group Stage", "Quarter-Final"
  finalHome: number | null;
  finalAway: number | null;
  // Only relevant for knockout matches that ended level after full time —
  // who won the penalty shootout. null/undefined for group-stage matches
  // and for knockout matches that didn't need penalties.
  finalPenaltyWinner?: PenaltyWinner | null;
  status: MatchStatus;
}

export interface Prediction {
  id: string; // `${userId}_${matchId}`
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  // Only used for knockout matches where the user predicted a tie — who
  // they think wins on penalties. Required (by the UI) whenever a knockout
  // prediction is tied.
  predictedPenaltyWinner?: PenaltyWinner | null;
  points: number | null; // null until match is scored
  outcome: 'exact' | 'correct' | 'wrong' | null;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry extends User {
  rank: number;
  totalPoints: number; // points + bonusPoints + streakBonusPoints
  totalExact: number; // exactPredictions + bonusExact
  totalCorrect: number; // correctOutcomes + bonusCorrect
  totalPredictionsCount: number; // totalPredictions + bonusTotalPredictions
}

export interface StoredIdentity {
  userId: string;
  name: string;
  avatar: string;
}
