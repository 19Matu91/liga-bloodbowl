import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreatePlayerInput } from '../types';

const router = Router();

// GET /api/players
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener jugadores', details: String(err) });
  }
});

// POST /api/players
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreatePlayerInput;
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      res.status(400).json({ error: 'El campo "name" es requerido.' });
      return;
    }

    const player = await prisma.player.create({
      data: {
        name: body.name.trim(),
      },
    });
    res.status(201).json(player);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un jugador con el nombre "${(req.body as CreatePlayerInput).name?.trim()}".` });
      return;
    }
    res.status(500).json({ error: 'Error al crear jugador', details: String(err) });
  }
});

// GET /api/players/:id — profile with full participation history
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            tournament: true,
            race: true,
            homeMatches: {
              include: { round: true },
            },
            awayMatches: {
              include: { round: true },
            },
            roster: {
              include: {
                position: true,
                skills: { include: { skill: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!player) {
      res.status(404).json({ error: `Jugador con id=${id} no encontrado.` });
      return;
    }

    res.json(player);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener jugador', details: String(err) });
  }
});

// PUT /api/players/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      res.status(404).json({ error: `Jugador con id=${id} no encontrado.` });
      return;
    }

    const body = req.body as Partial<CreatePlayerInput>;
    if (body.name !== undefined && (!body.name || body.name.trim() === '')) {
      res.status(400).json({ error: 'El campo "name" no puede estar vacío.' });
      return;
    }

    const updated = await prisma.player.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
      },
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un jugador con el nombre "${(req.body as Partial<CreatePlayerInput>).name?.trim()}".` });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar jugador', details: String(err) });
  }
});

// DELETE /api/players/:id — hard delete, cascade through participations
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      res.status(404).json({ error: `Jugador con id=${id} no encontrado.` });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Borrar en cascada todo lo relacionado con las participaciones del jugador
      await tx.rosterEntrySkill.deleteMany({
        where: { rosterEntry: { participant: { playerId: id } } },
      });
      await tx.rosterEntry.deleteMany({
        where: { participant: { playerId: id } },
      });
      await tx.rosterHistory.deleteMany({
        where: { participant: { playerId: id } },
      });
      // Nullify winnerId en partidos donde este jugador ganó
      const participantIds = (await tx.participant.findMany({
        where: { playerId: id },
        select: { id: true },
      })).map((p) => p.id);

      if (participantIds.length > 0) {
        await tx.match.updateMany({
          where: { winnerId: { in: participantIds } },
          data: { winnerId: null },
        });
        // Nullify home/away participant references in matches
        await tx.match.updateMany({
          where: { homeParticipantId: { in: participantIds } },
          data: { homeParticipantId: null },
        });
        await tx.match.updateMany({
          where: { awayParticipantId: { in: participantIds } },
          data: { awayParticipantId: null },
        });
      }

      await tx.participant.deleteMany({ where: { playerId: id } });
      await tx.player.delete({ where: { id } });
    });

    res.json({ message: 'Jugador eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar jugador', details: String(err) });
  }
});

export default router;
