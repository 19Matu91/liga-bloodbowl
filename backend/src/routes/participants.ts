import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireReferenceData } from '../middleware/requireReferenceData';
import { validateRoster } from '../lib/validation';
import { RosterEntryInput } from '../types';

const router = Router();

// PUT /api/participants/:id/roster
router.put('/:id/roster', requireReferenceData, async (req: Request, res: Response): Promise<void> => {
  try {
    const participantId = parseInt(req.params.id, 10);
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

    // Save snapshot to history before overwriting
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
});

export default router;
