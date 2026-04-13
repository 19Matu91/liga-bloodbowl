import { Router, Request, Response } from 'express';
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
        alias: body.alias?.trim() ?? null,
        email: body.email?.trim() ?? null,
        phone: body.phone?.trim() ?? null,
      },
    });
    res.status(201).json(player);
  } catch (err) {
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

// DELETE /api/players/:id — soft delete: preserve history
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

    // Soft delete: anonymize personal data but keep participation history
    await prisma.player.update({
      where: { id },
      data: {
        name: `[Eliminado #${id}]`,
        alias: null,
        email: null,
        phone: null,
      },
    });

    res.json({ message: 'Jugador eliminado correctamente. El historial se ha conservado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar jugador', details: String(err) });
  }
});

export default router;
