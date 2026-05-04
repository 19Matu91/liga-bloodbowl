import { PrismaClient } from '@prisma/client';
import { RosterEntryInput } from '../types';

export interface RosterViolation {
  positionId: number;
  positionName?: string;
  message: string;
}

export async function validateRoster(
  roster: RosterEntryInput[],
  raceId: number,
  prisma: PrismaClient
): Promise<RosterViolation[]> {
  const violations: RosterViolation[] = [];

  const validPositions = await prisma.position.findMany({
    where: { raceId },
  });

  const validPositionIds = new Set(validPositions.map((p) => p.id));

  for (const entry of roster) {
    if (!validPositionIds.has(entry.positionId)) {
      violations.push({
        positionId: entry.positionId,
        message: `La posición ${entry.positionId} no pertenece a la raza seleccionada (raceId=${raceId}).`,
      });
    }
  }

  return violations;
}
