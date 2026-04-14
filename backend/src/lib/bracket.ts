import { PrismaClient, Participant, RoundPhase } from '@prisma/client';
import { calculateStandings } from './standings';

export function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Distributes participants into groups balancing veterans and novices.
 * Veterans and novices are distributed round-robin separately, then merged per group.
 */
export async function autoAssignGroups(
  participants: Participant[],
  groupCount: number,
  prisma: PrismaClient
): Promise<void> {
  const veterans = participants.filter((p) => p.isVeteran);
  const novices = participants.filter((p) => !p.isVeteran);

  const groups: Participant[][] = Array.from({ length: groupCount }, () => []);
  veterans.forEach((p, i) => groups[i % groupCount].push(p));
  novices.forEach((p, i) => groups[i % groupCount].push(p));

  for (let g = 0; g < groups.length; g++) {
    for (const p of groups[g]) {
      await prisma.participant.update({
        where: { id: p.id },
        data: { groupNumber: g + 1 },
      });
    }
  }
}

/**
 * Interleaves veterans and novices so the circular rotation algorithm
 * produces V-vs-N matchups in the earliest rounds possible.
 * Example: [V1,V2,N1,N2] → [V1,N1,V2,N2]
 * Round 1 pairs: (V1 vs N2), (N1 vs V2) — all cross-category.
 */
function interleaveVN(players: Participant[]): Participant[] {
  const vets = players.filter((p) => p.isVeteran);
  const novs = players.filter((p) => !p.isVeteran);
  const result: Participant[] = [];
  const maxLen = Math.max(vets.length, novs.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < vets.length) result.push(vets[i]);
    if (i < novs.length) result.push(novs[i]);
  }
  return result;
}

/**
 * Generates round-robin matches per group using the circular rotation algorithm.
 * Participants must already have groupNumber assigned before calling this function.
 * Within each group, players are interleaved V/N to maximise cross-category matchups
 * in the earliest rounds.
 */
export async function generateGroupStage(
  participants: Participant[],
  tournamentId: number,
  prisma: PrismaClient
): Promise<void> {
  // Group participants by their already-assigned groupNumber
  const groupMap = new Map<number, Participant[]>();
  for (const p of participants) {
    const g = p.groupNumber ?? 1;
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(p);
  }

  // Generate round-robin matches per group using circular rotation
  for (const group of groupMap.values()) {
    const n = group.length;
    if (n < 2) continue;

    // Reorder group to maximise V-vs-N matchups in early rounds
    const ordered = interleaveVN(group);

    // If odd number, add a "bye" placeholder (null)
    const players: (Participant | null)[] = n % 2 === 0 ? [...ordered] : [...ordered, null];
    const size = players.length;
    const roundCount = size - 1;

    for (let round = 0; round < roundCount; round++) {
      const dbRound = await prisma.round.create({
        data: {
          tournamentId,
          number: round + 1,
          phase: RoundPhase.GROUP_STAGE,
        },
      });

      const matchPromises = [];
      for (let j = 0; j < size / 2; j++) {
        const home = players[j];
        const away = players[size - 1 - j];
        if (home === null || away === null) continue; // skip bye matches
        matchPromises.push(
          prisma.match.create({
            data: {
              roundId: dbRound.id,
              homeParticipantId: home.id,
              awayParticipantId: away.id,
            },
          })
        );
      }
      await Promise.all(matchPromises);

      // Rotate: fix position 0, rotate positions 1..size-1
      const last = players[size - 1];
      for (let k = size - 1; k > 1; k--) {
        players[k] = players[k - 1];
      }
      players[1] = last;
    }
  }
}

/**
 * Seeds the bracket by interleaving groups to avoid same-group matchups early.
 */
function seedBracket(qualifiers: Participant[]): (Participant | null)[] {
  // Group qualifiers by groupNumber
  const byGroup = new Map<number, Participant[]>();
  for (const p of qualifiers) {
    const g = p.groupNumber ?? 0;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(p);
  }

  const groups = Array.from(byGroup.values());
  const seeded: Participant[] = [];

  // Interleave: take one from each group in order
  const maxLen = Math.max(...groups.map((g) => g.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      if (i < group.length) seeded.push(group[i]);
    }
  }

  const size = nextPowerOf2(seeded.length);
  const result: (Participant | null)[] = new Array(size).fill(null);
  for (let i = 0; i < seeded.length; i++) {
    result[i] = seeded[i];
  }
  return result;
}

/**
 * Generates a single-elimination bracket from a list of qualifiers.
 */
export async function generateEliminationBracket(
  qualifiers: Participant[],
  tournamentId: number,
  prisma: PrismaClient,
  startingRoundNumber = 1
): Promise<void> {
  const seeded = seedBracket(qualifiers);
  const size = seeded.length;

  const dbRound = await prisma.round.create({
    data: {
      tournamentId,
      number: startingRoundNumber,
      phase: RoundPhase.ELIMINATION,
    },
  });

  const matchPromises = [];
  for (let i = 0; i < size / 2; i++) {
    const home = seeded[i];
    const away = seeded[size - 1 - i];
    matchPromises.push(
      prisma.match.create({
        data: {
          roundId: dbRound.id,
          homeParticipantId: home?.id ?? null,
          awayParticipantId: away?.id ?? null,
        },
      })
    );
  }
  await Promise.all(matchPromises);
}

/**
 * When all matches in an elimination round are COMPLETED, generates the next round.
 */
export async function generateNextEliminationRound(
  completedRoundId: number,
  prisma: PrismaClient
): Promise<void> {
  const round = await prisma.round.findUnique({
    where: { id: completedRoundId },
    include: { matches: true },
  });

  if (!round) return;
  if (round.phase !== RoundPhase.ELIMINATION) return;

  const allCompleted = round.matches.every((m) => m.status === 'COMPLETED');
  if (!allCompleted) return;

  // Collect winners (handle byes: if one side is null, the other advances)
  const winners: number[] = [];
  for (const match of round.matches) {
    if (match.winnerId != null) {
      winners.push(match.winnerId);
    } else if (match.homeParticipantId == null && match.awayParticipantId != null) {
      winners.push(match.awayParticipantId);
    } else if (match.awayParticipantId == null && match.homeParticipantId != null) {
      winners.push(match.homeParticipantId);
    }
  }

  if (winners.length <= 1) return; // Tournament is over

  const nextRound = await prisma.round.create({
    data: {
      tournamentId: round.tournamentId,
      number: round.number + 1,
      phase: RoundPhase.ELIMINATION,
    },
  });

  const matchPromises = [];
  for (let i = 0; i < winners.length; i += 2) {
    matchPromises.push(
      prisma.match.create({
        data: {
          roundId: nextRound.id,
          homeParticipantId: winners[i],
          awayParticipantId: winners[i + 1] ?? null,
        },
      })
    );
  }
  await Promise.all(matchPromises);
}

/**
 * Gets the qualifiers from a completed group stage for a tournament.
 */
export async function getGroupStageQualifiers(
  tournamentId: number,
  qualifiersPerGroup: number,
  prisma: PrismaClient
): Promise<Participant[]> {
  const rounds = await prisma.round.findMany({
    where: { tournamentId, phase: RoundPhase.GROUP_STAGE },
    include: {
      matches: true,
    },
  });

  const allMatches = rounds.flatMap((r) => r.matches);

  const participants = await prisma.participant.findMany({
    where: { tournamentId },
    include: { player: true, race: true },
  });

  const standings = calculateStandings(allMatches, participants);

  // Group standings by groupNumber
  const byGroup = new Map<number | null | undefined, typeof standings>();
  for (const entry of standings) {
    const g = entry.groupNumber;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(entry);
  }

  const qualifiers: Participant[] = [];
  for (const groupStandings of byGroup.values()) {
    const topN = groupStandings.slice(0, qualifiersPerGroup);
    for (const entry of topN) {
      const p = participants.find((p) => p.id === entry.participantId);
      if (p) qualifiers.push(p);
    }
  }

  return qualifiers;
}
