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
