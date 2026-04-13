import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/stats/global — historical ranking aggregating all tournaments per player
router.get('/global', async (_req: Request, res: Response): Promise<void> => {
  try {
    const players = await prisma.player.findMany({
      include: {
        participants: {
          include: {
            race: true,
            tournament: true,
            homeMatches: true,
            awayMatches: true,
          },
        },
      },
    });

    const globalStats = players.map((player) => {
      let played = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let tdFor = 0;
      let tdAgainst = 0;

      for (const participant of player.participants) {
        for (const match of participant.homeMatches) {
          if (match.status !== 'COMPLETED') continue;
          if (match.homeTDs == null || match.awayTDs == null) continue;
          played++;
          tdFor += match.homeTDs;
          tdAgainst += match.awayTDs;
          if (match.homeTDs > match.awayTDs) wins++;
          else if (match.homeTDs < match.awayTDs) losses++;
          else draws++;
        }
        for (const match of participant.awayMatches) {
          if (match.status !== 'COMPLETED') continue;
          if (match.homeTDs == null || match.awayTDs == null) continue;
          played++;
          tdFor += match.awayTDs;
          tdAgainst += match.homeTDs;
          if (match.awayTDs > match.homeTDs) wins++;
          else if (match.awayTDs < match.homeTDs) losses++;
          else draws++;
        }
      }

      return {
        playerId: player.id,
        playerName: player.name,
        tournamentsPlayed: player.participants.length,
        played,
        wins,
        draws,
        losses,
        points: wins * 3 + draws,
        tdFor,
        tdAgainst,
        tdDiff: tdFor - tdAgainst,
      };
    });

    globalStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.tdDiff !== a.tdDiff) return b.tdDiff - a.tdDiff;
      return b.tdFor - a.tdFor;
    });

    res.json(globalStats);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas globales', details: String(err) });
  }
});

// GET /api/stats/factions — stats per race across all tournaments
router.get('/factions', async (_req: Request, res: Response): Promise<void> => {
  try {
    const races = await prisma.race.findMany({
      include: {
        participants: {
          include: {
            homeMatches: true,
            awayMatches: true,
          },
        },
      },
    });

    const factionStats = races.map((race) => {
      let played = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let tdFor = 0;
      let tdAgainst = 0;

      for (const participant of race.participants) {
        for (const match of participant.homeMatches) {
          if (match.status !== 'COMPLETED') continue;
          if (match.homeTDs == null || match.awayTDs == null) continue;
          played++;
          tdFor += match.homeTDs;
          tdAgainst += match.awayTDs;
          if (match.homeTDs > match.awayTDs) wins++;
          else if (match.homeTDs < match.awayTDs) losses++;
          else draws++;
        }
        for (const match of participant.awayMatches) {
          if (match.status !== 'COMPLETED') continue;
          if (match.homeTDs == null || match.awayTDs == null) continue;
          played++;
          tdFor += match.awayTDs;
          tdAgainst += match.homeTDs;
          if (match.awayTDs > match.homeTDs) wins++;
          else if (match.awayTDs < match.homeTDs) losses++;
          else draws++;
        }
      }

      return {
        raceId: race.id,
        raceName: race.name,
        timesUsed: race.participants.length,
        played,
        wins,
        draws,
        losses,
        tdFor,
        tdAgainst,
        tdDiff: tdFor - tdAgainst,
        winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
      };
    });

    factionStats.sort((a, b) => b.winRate - a.winRate || b.played - a.played);

    res.json(factionStats);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas por facción', details: String(err) });
  }
});

export default router;
