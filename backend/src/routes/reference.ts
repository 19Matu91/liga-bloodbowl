import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/reference/races
router.get('/races', async (_req: Request, res: Response): Promise<void> => {
  try {
    const races = await prisma.race.findMany({
      include: {
        positions: {
          include: {
            skills: {
              include: { skill: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(races);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener razas', details: String(err) });
  }
});

// GET /api/reference/races/:id/positions
router.get('/races/:id/positions', async (req: Request, res: Response): Promise<void> => {
  try {
    const raceId = parseInt(req.params.id, 10);
    if (isNaN(raceId)) {
      res.status(400).json({ error: 'ID de raza inválido.' });
      return;
    }
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) {
      res.status(404).json({ error: `Raza con id=${raceId} no encontrada.` });
      return;
    }
    const positions = await prisma.position.findMany({
      where: { raceId },
      include: {
        skills: { include: { skill: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener posiciones', details: String(err) });
  }
});

// GET /api/reference/skills
router.get('/skills', async (_req: Request, res: Response): Promise<void> => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener habilidades', details: String(err) });
  }
});

export default router;
