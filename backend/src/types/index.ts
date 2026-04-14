export interface StandingsEntry {
  participantId: number;
  playerName: string;
  teamName: string | null;
  raceName: string;
  isVeteran: boolean;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number; // wins*3 + draws*1
  tdFor: number;
  tdAgainst: number;
  tdDiff: number;
  groupNumber?: number | null;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface RosterEntryInput {
  positionId: number;
  playerName?: string;
  skillIds?: number[];
  spp?: number;
  injuries?: string;
}

export interface CreateTournamentInput {
  name: string;
  edition: string;
  year: number;
  startDate: string;
  description?: string;
  format?: 'MIXED' | 'SINGLE_ELIMINATION' | 'ROUND_ROBIN';
  groupCount?: number;
  qualifiersPerGroup?: number;
}

export interface CreatePlayerInput {
  name: string;
}

export interface RegisterParticipantInput {
  playerId: number;
  raceId: number;
  teamName?: string;
  rerolls?: number;
  hasApothecary?: boolean;
  isVeteran?: boolean;
  roster?: RosterEntryInput[];
}

export interface MatchResultInput {
  homeTDs: number;
  awayTDs: number;
  homeCas?: number;
  awayCas?: number;
}

export interface UpdateRosterInput {
  roster: RosterEntryInput[];
  rerolls?: number;
  hasApothecary?: boolean;
}
