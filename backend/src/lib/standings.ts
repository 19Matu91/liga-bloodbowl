import { Match, Participant, Player, Race } from '@prisma/client';
import { StandingsEntry } from '../types';

type ParticipantWithRelations = Participant & {
  player: Player;
  race: Race;
};

type MatchWithStatus = Pick<
  Match,
  'homeParticipantId' | 'awayParticipantId' | 'homeTDs' | 'awayTDs' | 'status' | 'winnerId'
>;

export function calculateStandings(
  matches: MatchWithStatus[],
  participants: ParticipantWithRelations[]
): StandingsEntry[] {
  const map = new Map<number, StandingsEntry>();

  for (const p of participants) {
    map.set(p.id, {
      participantId: p.id,
      playerName: p.player.name,
      teamName: p.teamName,
      raceName: p.race.name,
      isVeteran: p.isVeteran,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      tdFor: 0,
      tdAgainst: 0,
      tdDiff: 0,
      groupNumber: p.groupNumber,
    });
  }

  for (const match of matches) {
    if (match.status !== 'COMPLETED') continue;
    if (match.homeParticipantId == null || match.awayParticipantId == null) continue;
    if (match.homeTDs == null || match.awayTDs == null) continue;

    const home = map.get(match.homeParticipantId);
    const away = map.get(match.awayParticipantId);

    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.tdFor += match.homeTDs;
    home.tdAgainst += match.awayTDs;
    away.tdFor += match.awayTDs;
    away.tdAgainst += match.homeTDs;

    if (match.homeTDs > match.awayTDs) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (match.homeTDs < match.awayTDs) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      home.points += 1;
      away.draws++;
      away.points += 1;
    }
  }

  for (const entry of map.values()) {
    entry.tdDiff = entry.tdFor - entry.tdAgainst;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.tdDiff !== a.tdDiff) return b.tdDiff - a.tdDiff;
    return b.tdFor - a.tdFor;
  });
}
