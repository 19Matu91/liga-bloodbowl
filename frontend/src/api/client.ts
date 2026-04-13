import type {
  Tournament,
  Player,
  Participant,
  BracketData,
  StandingsEntry,
  GlobalStats,
  FactionStats,
  Race,
  Skill,
  Position,
  CreateTournamentInput,
  CreatePlayerInput,
  RegisterParticipantInput,
} from '../types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Tournaments
export const tournaments = {
  getAll: () => request<Tournament[]>('/api/tournaments'),
  getById: (id: number) => request<Tournament>(`/api/tournaments/${id}`),
  create: (data: CreateTournamentInput) =>
    request<Tournament>('/api/tournaments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateTournamentInput>) =>
    request<Tournament>(`/api/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ message: string }>(`/api/tournaments/${id}`, { method: 'DELETE' }),
  generateBracket: (id: number) =>
    request<{ message: string; rounds: unknown[] }>(`/api/tournaments/${id}/generate-bracket`, {
      method: 'POST',
    }),
  generateElimination: (id: number) =>
    request<{ message: string; rounds: unknown[] }>(`/api/tournaments/${id}/generate-elimination`, {
      method: 'POST',
    }),
  getBracket: (id: number) => request<BracketData>(`/api/tournaments/${id}/bracket`),
  getStandings: (id: number) => request<StandingsEntry[]>(`/api/tournaments/${id}/standings`),
};

// Players
export const players = {
  getAll: () => request<Player[]>('/api/players'),
  getById: (id: number) => request<Player & { participants: Participant[] }>(`/api/players/${id}`),
  create: (data: CreatePlayerInput) =>
    request<Player>('/api/players', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ message: string }>(`/api/players/${id}`, { method: 'DELETE' }),
};

// Participants
export const participants = {
  register: (tournamentId: number, data: RegisterParticipantInput) =>
    request<Participant>(`/api/tournaments/${tournamentId}/participants`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getById: (id: number) =>
    request<Participant & { roster: unknown[] }>(`/api/participants/${id}`),
  updateRoster: (participantId: number, roster: unknown[], rerolls?: number, hasApothecary?: boolean) =>
    request<unknown[]>(`/api/participants/${participantId}/roster`, {
      method: 'PUT',
      body: JSON.stringify({ roster, rerolls, hasApothecary }),
    }),
};

// Matches
export const matches = {
  submitResult: (matchId: number, homeTDs: number, awayTDs: number) =>
    request<unknown>(`/api/matches/${matchId}/result`, {
      method: 'POST',
      body: JSON.stringify({ homeTDs, awayTDs }),
    }),
};

// Reference data
export const reference = {
  getRaces: () => request<Race[]>('/api/reference/races'),
  getSkills: () => request<Skill[]>('/api/reference/skills'),
  getRacePositions: (raceId: number) =>
    request<Position[]>(`/api/reference/races/${raceId}/positions`),
};

// Stats
export const stats = {
  getGlobal: () => request<GlobalStats[]>('/api/stats/global'),
  getFactions: () => request<FactionStats[]>('/api/stats/factions'),
};
