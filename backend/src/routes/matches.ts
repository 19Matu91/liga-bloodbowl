import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { generateNextEliminationRound } from '../lib/bracket';
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

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar resultado', details: String(err) });
  }
});

export default router;
