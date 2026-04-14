import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireReferenceData } from '../middleware/requireReferenceData';
import { validateRoster } from '../lib/validation';
import { calculateStandings } from '../lib/standings';
import {
  generateGroupStage,
  generateEliminationBracket,
  getGroupStageQualifiers,
  autoAssignGroups,
} from '../lib/bracket';
import {
  CreateTournamentInput,
  RegisterParticipantInput,
  RosterEntryInput,
} from '../types';

const router = Router();

// GET /api/tournaments
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { participants: true } },
      },
    });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener torneos', details: String(err) });
  }
});

// POST /api/tournaments
router.post('/', requireReferenceData, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateTournamentInput;

    if (!body.name || !body.edition || !body.year || !body.startDate) {
      res.status(400).json({
        error: 'Los campos "name", "edition", "year" y "startDate" son requeridos.',
      });
      return;
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: body.name.trim(),
        edition: body.edition.trim(),
        year: Number(body.year),
        startDate: new Date(body.startDate),
        description: body.description?.trim() ?? null,
        format: body.format ?? 'MIXED',
        groupCount: body.groupCount ?? null,
        qualifiersPerGroup: body.qualifiersPerGroup ?? null,
      },
    });
    res.status(201).json(tournament);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === 'P2002') {
      res.status(409).json({
        error: 'Ya existe un torneo con ese nombre y año.',
      });
      return;
    }
    res.status(500).json({ error: 'Error al crear torneo', details: String(err) });
  }
});

// GET /api/tournaments/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          include: { player: true, race: true },
        },
        rounds: {
          include: {
            matches: {
              include: {
                homeParticipant: { include: { player: true, race: true } },
                awayParticipant: { include: { player: true, race: true } },
              },
            },
          },
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!tournament) {
      res.status(404).json({ error: `Torneo con id=${id} no encontrado.` });
      return;
    }

    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener torneo', details: String(err) });
  }
});

// PUT /api/tournaments/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: `Torneo con id=${id} no encontrado.` });
      return;
    }

    const body = req.body as Partial<CreateTournamentInput>;
    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.edition && { edition: body.edition.trim() }),
        ...(body.year && { year: Number(body.year) }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.description !== undefined && { description: body.description?.trim() ?? null }),
        ...(body.format && { format: body.format }),
        ...(body.groupCount !== undefined && { groupCount: body.groupCount }),
        ...(body.qualifiersPerGroup !== undefined && { qualifiersPerGroup: body.qualifiersPerGroup }),
      },
    });
    res.json(updated);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un torneo con ese nombre y año.' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar torneo', details: String(err) });
  }
});

// DELETE /api/tournaments/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: `Torneo con id=${id} no encontrado.` });
      return;
    }

    // Borrar en cascada: roster skills → roster entries → roster history →
    // match results → matches → rounds → participants → tournament
    await prisma.$transaction(async (tx) => {
      // 1. RosterEntrySkill de todos los participantes del torneo
      await tx.rosterEntrySkill.deleteMany({
        where: { rosterEntry: { participant: { tournamentId: id } } },
      });
      // 2. RosterEntry
      await tx.rosterEntry.deleteMany({
        where: { participant: { tournamentId: id } },
      });
      // 3. RosterHistory
      await tx.rosterHistory.deleteMany({
        where: { participant: { tournamentId: id } },
      });
      // 4. Matches (nullify winners first to avoid self-reference issues)
      await tx.match.updateMany({
        where: { round: { tournamentId: id } },
        data: { winnerId: null },
      });
      await tx.match.deleteMany({
        where: { round: { tournamentId: id } },
      });
      // 5. Rounds
      await tx.round.deleteMany({ where: { tournamentId: id } });
      // 6. Participants
      await tx.participant.deleteMany({ where: { tournamentId: id } });
      // 7. Tournament
      await tx.tournament.delete({ where: { id } });
    });

    res.json({ message: 'Torneo eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar torneo', details: String(err) });
  }
});

// PATCH /api/tournaments/:id/complete
router.patch('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: `Torneo con id=${id} no encontrado.` });
      return;
    }

    if (existing.status === 'COMPLETED') {
      res.status(409).json({ error: 'El torneo ya está completado.' });
      return;
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al completar torneo', details: String(err) });
  }
});

// POST /api/tournaments/:id/auto-assign-groups
router.post('/:id/auto-assign-groups', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido.' }); return; }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!tournament) { res.status(404).json({ error: `Torneo con id=${id} no encontrado.` }); return; }
    if (tournament.participants.length < 2) {
      res.status(400).json({ error: 'Se necesitan al menos 2 participantes.' }); return;
    }

    const existingRounds = await prisma.round.count({ where: { tournamentId: id } });
    if (existingRounds > 0) {
      res.status(409).json({ error: 'No se pueden reasignar grupos una vez generados los partidos.' }); return;
    }

    const groups = tournament.groupCount ?? 2;
    await autoAssignGroups(tournament.participants, groups, prisma);

    const updated = await prisma.participant.findMany({
      where: { tournamentId: id },
      include: { player: true, race: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al auto-asignar grupos', details: String(err) });
  }
});

// PUT /api/tournaments/:id/groups — bulk manual group assignment
router.put('/:id/groups', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido.' }); return; }

    const existingRounds = await prisma.round.count({ where: { tournamentId: id } });
    if (existingRounds > 0) {
      res.status(409).json({ error: 'No se pueden reasignar grupos una vez generados los partidos.' }); return;
    }

    const assignments = req.body as Array<{ participantId: number; groupNumber: number | null }>;
    if (!Array.isArray(assignments)) {
      res.status(400).json({ error: 'Body debe ser un array de asignaciones.' }); return;
    }

    await prisma.$transaction(
      assignments.map(({ participantId, groupNumber }) =>
        prisma.participant.update({
          where: { id: participantId },
          data: { groupNumber },
        })
      )
    );

    const updated = await prisma.participant.findMany({
      where: { tournamentId: id },
      include: { player: true, race: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al asignar grupos', details: String(err) });
  }
});

// POST /api/tournaments/:id/participants
router.post('/:id/participants', async (req: Request, res: Response): Promise<void> => {
  try {
    const tournamentId = parseInt(req.params.id, 10);
    if (isNaN(tournamentId)) {
      res.status(400).json({ error: 'ID de torneo inválido.' });
      return;
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      res.status(404).json({ error: `Torneo con id=${tournamentId} no encontrado.` });
      return;
    }

    const body = req.body as RegisterParticipantInput;
    if (!body.playerId || !body.raceId) {
      res.status(400).json({ error: 'Los campos "playerId" y "raceId" son requeridos.' });
      return;
    }

    const player = await prisma.player.findUnique({ where: { id: body.playerId } });
    if (!player) {
      res.status(404).json({ error: `Jugador con id=${body.playerId} no encontrado.` });
      return;
    }

    const race = await prisma.race.findUnique({ where: { id: body.raceId } });
    if (!race) {
      res.status(404).json({ error: `Raza con id=${body.raceId} no encontrada.` });
      return;
    }

    const rerolls = body.rerolls ?? 0;
    const hasApothecary = body.hasApothecary ?? false;
    const rerollCost = race.rerollCost;

    // Calculate initial team value if roster provided
    let rosterValue = 0;
    if (body.roster && body.roster.length > 0) {
      for (const entry of body.roster) {
        const position = await prisma.position.findUnique({ where: { id: entry.positionId } });
        if (position) rosterValue += position.cost;
      }
    }
    const teamValue = rosterValue + rerolls * rerollCost + (hasApothecary ? 50000 : 0);

    const participant = await prisma.$transaction(async (tx) => {
      const created = await tx.participant.create({
        data: {
          playerId: body.playerId,
          tournamentId,
          raceId: body.raceId,
          teamName: body.teamName?.trim() ?? null,
          rerolls,
          hasApothecary,
          teamValue,
          isVeteran: body.isVeteran ?? false,
        },
        include: { player: true, race: true },
      });

      if (body.roster && body.roster.length > 0) {
        for (const entry of body.roster) {
          await tx.rosterEntry.create({
            data: {
              participantId: created.id,
              positionId: entry.positionId,
              playerName: entry.playerName ?? null,
              spp: entry.spp ?? 0,
              injuries: entry.injuries ?? null,
              skills: entry.skillIds
                ? { create: entry.skillIds.map((skillId) => ({ skillId })) }
                : undefined,
            },
          });
        }
      }

      return created;
    });

    res.status(201).json(participant);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === 'P2002') {
      res.status(409).json({ error: 'El jugador ya está inscrito en este torneo.' });
      return;
    }
    res.status(500).json({ error: 'Error al inscribir participante', details: String(err) });
  }
});

// PUT /api/participants/:participantId/roster
router.put(
  '/participants/:participantId/roster',
  requireReferenceData,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const participantId = parseInt(req.params.participantId, 10);
      if (isNaN(participantId)) {
        res.status(400).json({ error: 'ID de participante inválido.' });
        return;
      }

      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { roster: true },
      });
      if (!participant) {
        res.status(404).json({ error: `Participante con id=${participantId} no encontrado.` });
        return;
      }

      const roster = req.body.roster as RosterEntryInput[];
      if (!Array.isArray(roster)) {
        res.status(400).json({ error: 'El campo "roster" debe ser un array.' });
        return;
      }

      // Validate roster against reference data
      const violations = await validateRoster(roster, participant.raceId, prisma);
      if (violations.length > 0) {
        res.status(422).json({ error: 'La alineación contiene infracciones.', details: violations });
        return;
      }

      // Save snapshot to history
      await prisma.rosterHistory.create({
        data: {
          participantId,
          snapshot: participant.roster as object,
          reason: 'Actualización de alineación',
        },
      });

      // Delete existing roster entries
      await prisma.rosterEntrySkill.deleteMany({
        where: { rosterEntry: { participantId } },
      });
      await prisma.rosterEntry.deleteMany({ where: { participantId } });

      // Create new roster entries
      const created = await Promise.all(
        roster.map((entry) =>
          prisma.rosterEntry.create({
            data: {
              participantId,
              positionId: entry.positionId,
              playerName: entry.playerName ?? null,
              spp: entry.spp ?? 0,
              injuries: entry.injuries ?? null,
              skills: entry.skillIds
                ? {
                    create: entry.skillIds.map((skillId) => ({ skillId })),
                  }
                : undefined,
            },
            include: {
              position: true,
              skills: { include: { skill: true } },
            },
          })
        )
      );

      res.json(created);
    } catch (err) {
      res.status(500).json({ error: 'Error al actualizar alineación', details: String(err) });
    }
  }
);

// POST /api/tournaments/:id/generate-bracket
router.post('/:id/generate-bracket', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!tournament) {
      res.status(404).json({ error: `Torneo con id=${id} no encontrado.` });
      return;
    }

    if (tournament.participants.length < 2) {
      res.status(400).json({ error: 'Se necesitan al menos 2 participantes para generar el bracket.' });
      return;
    }

    const existingRounds = await prisma.round.count({ where: { tournamentId: id } });
    if (existingRounds > 0) {
      res.status(409).json({ error: 'El bracket ya ha sido generado para este torneo.' });
      return;
    }

    const { format, participants } = tournament;

    if (format === 'MIXED') {
      const unassigned = participants.filter((p) => p.groupNumber == null);
      if (unassigned.length > 0) {
        res.status(400).json({ error: 'Todos los participantes deben tener grupo asignado antes de generar los partidos.' });
        return;
      }
      await generateGroupStage(participants, id, prisma);
    } else if (format === 'ROUND_ROBIN') {
      // For round robin, assign everyone to group 1 first
      for (const p of participants) {
        await prisma.participant.update({ where: { id: p.id }, data: { groupNumber: 1 } });
      }
      const updatedParticipants = participants.map((p) => ({ ...p, groupNumber: 1 }));
      await generateGroupStage(updatedParticipants, id, prisma);
    } else if (format === 'SINGLE_ELIMINATION') {
      await generateEliminationBracket(participants, id, prisma);
    }

    const rounds = await prisma.round.findMany({
      where: { tournamentId: id },
      include: { matches: true },
      orderBy: { number: 'asc' },
    });

    res.status(201).json({ message: 'Bracket generado correctamente.', rounds });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar bracket', details: String(err) });
  }
});

// POST /api/tournaments/:id/generate-elimination — generate elimination phase from group stage qualifiers
router.post('/:id/generate-elimination', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      res.status(404).json({ error: `Torneo con id=${id} no encontrado.` });
      return;
    }

    if (tournament.format !== 'MIXED') {
      res.status(400).json({ error: 'Este endpoint solo aplica a torneos con formato MIXED.' });
      return;
    }

    const qualifiersPerGroup = tournament.qualifiersPerGroup ?? 2;
    const qualifiers = await getGroupStageQualifiers(id, qualifiersPerGroup, prisma);

    if (qualifiers.length < 2) {
      res.status(400).json({ error: 'No hay suficientes clasificados para generar la fase eliminatoria.' });
      return;
    }

    const lastRound = await prisma.round.findFirst({
      where: { tournamentId: id },
      orderBy: { number: 'desc' },
    });
    const startingRound = (lastRound?.number ?? 0) + 1;

    await generateEliminationBracket(qualifiers, id, prisma, startingRound);

    const rounds = await prisma.round.findMany({
      where: { tournamentId: id, phase: 'ELIMINATION' },
      include: { matches: true },
      orderBy: { number: 'asc' },
    });

    res.status(201).json({ message: 'Fase eliminatoria generada.', rounds });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar fase eliminatoria', details: String(err) });
  }
});

// GET /api/tournaments/:id/bracket
router.get('/:id/bracket', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      res.status(404).json({ error: `Torneo con id=${id} no encontrado.` });
      return;
    }

    const rounds = await prisma.round.findMany({
      where: { tournamentId: id },
      include: {
        matches: {
          include: {
            homeParticipant: { include: { player: true, race: true } },
            awayParticipant: { include: { player: true, race: true } },
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    res.json({ tournamentId: id, format: tournament.format, rounds });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener bracket', details: String(err) });
  }
});

// GET /api/tournaments/:id/standings
router.get('/:id/standings', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido.' });
      return;
    }

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      res.status(404).json({ error: `Torneo con id=${id} no encontrado.` });
      return;
    }

    const rounds = await prisma.round.findMany({
      where: { tournamentId: id },
      include: { matches: true },
    });
    const allMatches = rounds.flatMap((r) => r.matches);

    const participants = await prisma.participant.findMany({
      where: { tournamentId: id },
      include: { player: true, race: true },
    });

    const standings = calculateStandings(allMatches, participants);
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: 'Error al calcular clasificación', details: String(err) });
  }
});

export default router;
