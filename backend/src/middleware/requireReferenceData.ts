import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function requireReferenceData(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const count = await prisma.race.count();
    if (count === 0) {
      res.status(503).json({
        error: 'Datos de referencia no disponibles. Ejecuta el scraper primero.',
      });
      return;
    }
    next();
  } catch {
    res.status(503).json({
      error: 'Datos de referencia no disponibles. Ejecuta el scraper primero.',
    });
  }
}
