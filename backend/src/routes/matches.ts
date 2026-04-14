import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { generateNextEliminationRound, generateEliminationBracket, getGroupStageQualifiers } from '../lib/bracket';
import { MatchResultInput } from '../types';

const router = Router();

// POST /api/matches/:id/result
router.post('/:id/result', async (req: Request, res: Response): Promise<void> => {
  try {
    const matchId = parseInt(req.params.id, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: 'ID de partido inválido.' });
      return;
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        round: {
          include: { tournament: true },
        },
      },
    });

    if (!match) {
      res.status(404).json({ error: `Partido con id=${matchId} no encontrado.` });
      return;
    }

    // Check tournament is ACTIVE
    if (match.round.tournament.status !== 'ACTIVE') {
      res.status(400).json({
        error: 'Solo se pueden registrar resultados en torneos con estado ACTIVE.',
      });
      return;
    }

    const body = req.body as MatchResultInput;
    if (typeof body.homeTDs !== 'number' || typeof body.awayTDs !== 'number') {
      res.status(400).json({ error: 'Los campos "homeTDs" y "awayTDs" son requeridos y deben ser números.' });
      return;
    }
    if (body.homeTDs < 0 || body.awayTDs < 0) {
      res.status(400).json({ error: 'Los touchdowns no pueden ser negativos.' });
      return;
    }

    // Determine winner
    let winnerId: number | null = null;
    if (body.homeTDs > body.awayTDs) {
      winnerId = match.homeParticipantId;
    } else if (body.awayTDs > body.homeTDs) {
      winnerId = match.awayParticipantId;
    }
    // null = draw

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeTDs: body.homeTDs,
        awayTDs: body.awayTDs,
        homeCas: body.homeCas ?? null,
        awayCas: body.awayCas ?? null,
        status: 'COMPLETED',
        winnerId,
      },
    });

    // Check if all matches in the round are completed
    const roundMatches = await prisma.match.findMany({
      where: { roundId: match.roundId },
    });
    const allCompleted = roundMatches.every((m) => m.status === 'COMPLETED');

    if (allCompleted && match.round.phase === 'ELIMINATION') {
      await generateNextEliminationRound(match.roundId, prisma);
    }

    // Auto-generate elimination bracket when all group stage matches are done
    if (match.round.phase === 'GROUP_STAGE' && match.round.tournament.format === 'MIXED') {
      const allGroupRounds = await prisma.round.findMany({
        where: { tournamentId: match.round.tournamentId, phase: 'GROUP_STAGE' },
        include: { matches: true },
      });
      const allGroupDone =
        allGroupRounds.length > 0 &&
        allGroupRounds.every((r) => r.matches.every((m) => m.status === 'COMPLETED'));

      if (allGroupDone) {
        const elimExists = await prisma.round.count({
          where: { tournamentId: match.round.tournamentId, phase: 'ELIMINATION' },
        });
        if (elimExists === 0) {
          const qualifiersPerGroup = match.round.tournament.qualifiersPerGroup ?? 2;
          const qualifiers = await getGroupStageQualifiers(
            match.round.tournamentId, qualifiersPerGroup, prisma
          );
          if (qualifiers.length >= 2) {
            const lastRound = await prisma.round.findFirst({
              where: { tournamentId: match.round.tournamentId },
              orderBy: { number: 'desc' },
            });
            const startingRound = (lastRound?.number ?? 0) + 1;
            await generateEliminationBracket(qualifiers, match.round.tournamentId, prisma, startingRound);
          }
        }
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar resultado', details: String(err) });
  }
});

export default router;
