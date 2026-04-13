export type TournamentStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';
export type TournamentFormat = 'MIXED' | 'SINGLE_ELIMINATION' | 'ROUND_ROBIN';
export type MatchStatus = 'PENDING' | 'COMPLETED';
export type RoundPhase = 'GROUP_STAGE' | 'ELIMINATION';

export interface Race {
  id: number;
  name: string;
  rerollCost: number;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  description: string;
}

export interface Position {
  id: number;
  raceId: number;
  name: string;
  cost: number;
  ma: number;
  st: number;
  ag: number;
  pa: number | null;
  av: number;
  maxCount: number;
  skills: Array<{ skill: Skill }>;
}

export interface Player {
  id: number;
  name: string;
  alias: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: number;
  playerId: number;
  tournamentId: number;
  raceId: number;
  teamName: string | null;
  groupNumber: number | null;
  rerolls: number;
  hasApothecary: boolean;
  teamValue: number;
  player: Player;
  race: Race;
}

export interface Match {
  id: number;
  roundId: number;
  homeParticipantId: number | null;
  awayParticipantId: number | null;
  homeParticipant: Participant | null;
  awayParticipant: Participant | null;
  homeTDs: number | null;
  awayTDs: number | null;
  status: MatchStatus;
  winnerId: number | null;
}

export interface Round {
  id: number;
  tournamentId: number;
  number: number;
  phase: RoundPhase;
  matches: Match[];
}

export interface Tournament {
  id: number;
  name: string;
  edition: string;
  year: number;
  startDate: string;
  endDate: string | null;
  description: string | null;
  status: TournamentStatus;
  format: TournamentFormat;
  groupCount: number | null;
  qualifiersPerGroup: number | null;
  participants?: Participant[];
  rounds?: Round[];
  _count?: { participants: number };
  createdAt: string;
  updatedAt: string;
}

export interface BracketData {
  tournamentId: number;
  format: TournamentFormat;
  rounds: Round[];
}

export interface StandingsEntry {
  participantId: number;
  playerName: string;
  teamName: string | null;
  raceName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  tdFor: number;
  tdAgainst: number;
  tdDiff: number;
  groupNumber?: number | null;
}

export interface GlobalStats {
  playerId: number;
  playerName: string;
  alias: string | null;
  tournamentsPlayed: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  tdFor: number;
  tdAgainst: number;
  tdDiff: number;
}

export interface FactionStats {
  raceId: number;
  raceName: string;
  timesUsed: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  tdFor: number;
  tdAgainst: number;
  tdDiff: number;
  winRate: number;
}

export interface CreateTournamentInput {
  name: string;
  edition: string;
  year: number;
  startDate: string;
  endDate?: string;
  description?: string;
  format?: TournamentFormat;
  groupCount?: number;
  qualifiersPerGroup?: number;
}

export interface CreatePlayerInput {
  name: string;
  alias?: string;
  email?: string;
  phone?: string;
}

export interface RegisterParticipantInput {
  playerId: number;
  raceId: number;
  teamName?: string;
  rerolls?: number;
  hasApothecary?: boolean;
  roster?: RosterEntryInput[];
}

export interface RosterEntryInput {
  positionId: number;
  playerName?: string;
  skillIds?: number[];
  spp?: number;
  injuries?: string;
}
