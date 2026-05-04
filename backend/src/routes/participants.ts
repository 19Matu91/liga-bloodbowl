import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireReferenceData } from '../middleware/requireReferenceData';
import { validateRoster } from '../lib/validation';
import { RosterEntryInput, UpdateRosterInput } from '../types';

const router = Router();

// GET /api/participants/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const participantId = parseInt(req.params.id, 10);
    if (isNaN(participantId)) {
      res.status(400).json({ error: 'ID de participante inválido.' });
      return;
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        player: true,
        race: true,
        roster: {
          include: {
            position: {
              include: { skills: { include: { skill: true } } },
            },
            skills: { include: { skill: true } },
          },
        },
      },
    });

    if (!participant) {
      res.status(404).json({ error: `Participante con id=${participantId} no encontrado.` });
      return;
    }

    res.json(participant);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener participante', details: String(err) });
  }
});

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
      include: { roster: true, race: true },
    });
    if (!participant) {
      res.status(404).json({ error: `Participante con id=${participantId} no encontrado.` });
      return;
    }

    const body = req.body as UpdateRosterInput;
    const roster = body.roster as RosterEntryInput[];
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

    // Calculate team value
    const rerolls = body.rerolls ?? participant.rerolls;
    const hasApothecary = body.hasApothecary ?? participant.hasApothecary;
    const rerollCost = participant.race.rerollCost;

    // Sum position costs from roster
    let rosterValue = 0;
    for (const entry of roster) {
      const position = await prisma.position.findUnique({ where: { id: entry.positionId } });
      if (position) rosterValue += position.cost;
    }
    const teamValue = rosterValue + rerolls * rerollCost + (hasApothecary ? 50000 : 0);

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
              ? { create: entry.skillIds.map((skillId) => ({ skillId })) }
              : undefined,
          },
          include: {
            position: true,
            skills: { include: { skill: true } },
          },
        })
      )
    );

    // Update participant fields
    const teamName = body.teamName !== undefined ? (body.teamName.trim() || null) : undefined;
    await prisma.participant.update({
      where: { id: participantId },
      data: { rerolls, hasApothecary, teamValue, ...(teamName !== undefined && { teamName }) },
    });

    res.json(created);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar alineación', details: String(err) });
  }
});

export default router;
