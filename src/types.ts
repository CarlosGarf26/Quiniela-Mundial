export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  points: number;
  fcmTokens: string[];
  isAdmin?: boolean;
}

export type MatchStatus = 'pending' | 'finished';

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag?: string;
  awayFlag?: string;
  date: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsEarned?: number;
  isDefinitive?: boolean;
}
