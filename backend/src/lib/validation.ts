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

  // Load all valid positions for this race
  const validPositions = await prisma.position.findMany({
    where: { raceId },
  });

  const validPositionMap = new Map(validPositions.map((p) => [p.id, p]));

  // Count occurrences of each positionId in the roster
  const positionCounts = new Map<number, number>();
  for (const entry of roster) {
    positionCounts.set(entry.positionId, (positionCounts.get(entry.positionId) ?? 0) + 1);
  }

  // Check each position
  for (const [positionId, count] of positionCounts.entries()) {
    const position = validPositionMap.get(positionId);
    if (!position) {
      violations.push({
        positionId,
        message: `La posición ${positionId} no pertenece a la raza seleccionada (raceId=${raceId}).`,
      });
    } else if (count > position.maxCount) {
      violations.push({
        positionId,
        positionName: position.name,
        message: `La posición "${position.name}" supera el máximo permitido (${count} > ${position.maxCount}).`,
      });
    }
  }

  return violations;
}
