import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import tournamentRoutes from './routes/tournaments';
import playerRoutes from './routes/players';
import matchRoutes from './routes/matches';
import referenceRoutes from './routes/reference';
import statsRoutes from './routes/stats';
import participantRoutes from './routes/participants';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/participants', participantRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (err instanceof SyntaxError && 'body' in (err as object)) {
    res.status(400).json({ error: 'JSON inválido en el cuerpo de la petición.' });
    return;
  }

  const e = err as { code?: string; status?: number; message?: string };

  // Prisma unique constraint violation
  if (e?.code === 'P2002') {
    res.status(409).json({ error: 'Conflicto: ya existe un registro con esos datos únicos.' });
    return;
  }

  // Prisma record not found
  if (e?.code === 'P2025') {
    res.status(404).json({ error: 'Recurso no encontrado.' });
    return;
  }

  const status = e?.status ?? 500;
  const message = isProduction
    ? 'Error interno del servidor.'
    : (e?.message ?? 'Error interno del servidor.');

  res.status(status).json({ error: message });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.listen(PORT, () => {
  console.log(`🏈 Blood Bowl API running on http://localhost:${PORT}`);
});

export default app;
