interface Props {
  groupCount: number;
  qualifiersPerGroup: number;
}

interface TBDMatch {
  home: string | null;
  away: string | null;
}

function nextPowerOf2WithMin2(n: number): number {
  if (n <= 2) return 2;
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

function buildTBDSeeds(groupCount: number, qualifiersPerGroup: number): { labels: (string | null)[]; size: number } {
  const labels: (string | null)[] = [];
  for (let pos = 0; pos < qualifiersPerGroup; pos++) {
    for (let g = 1; g <= groupCount; g++) {
      labels.push(`${pos + 1}º Grupo ${String.fromCharCode(64 + g)}`);
    }
  }
  const size = nextPowerOf2WithMin2(labels.length);
  while (labels.length < size) labels.push(null);
  return { labels, size };
}

function buildTBDRounds(groupCount: number, qualifiersPerGroup: number): TBDMatch[][] {
  const { labels, size } = buildTBDSeeds(groupCount, qualifiersPerGroup);

  const rounds: TBDMatch[][] = [];

  // Primera ronda
  const firstRound: TBDMatch[] = [];
  for (let i = 0; i < size / 2; i++) {
    firstRound.push({ home: labels[i], away: labels[size - 1 - i] });
  }
  rounds.push(firstRound);

  // Rondas siguientes
  let currentSize = size / 2;
  while (currentSize > 1) {
    const round: TBDMatch[] = [];
    for (let i = 0; i < currentSize / 2; i++) {
      round.push({ home: 'TBD', away: 'TBD' });
    }
    rounds.push(round);
    currentSize = currentSize / 2;
  }

  return rounds;
}

function getRoundLabel(i: number, total: number): string {
  const fromEnd = total - i;
  if (fromEnd === 1) return 'Final';
  if (fromEnd === 2) return 'Semifinales';
  if (fromEnd === 3) return 'Cuartos de final';
  return `Ronda ${i + 1}`;
}

function TBDMatchCard({ match }: { match: TBDMatch }) {
  const isTBD = match.home === 'TBD' || match.away === 'TBD';
  return (
    <div className="card min-w-[190px] max-w-[230px] overflow-hidden opacity-70">
      {/* Home */}
      <div className="px-3 py-2.5 border-b border-parchment-100/10">
        <p className={`text-xs font-medium truncate ${isTBD || match.home == null ? 'text-parchment-400/50 italic' : 'text-parchment-100'}`}>
          {match.home == null ? 'BYE' : match.home}
        </p>
      </div>
      {/* Away */}
      <div className="px-3 py-2.5">
        <p className={`text-xs font-medium truncate ${isTBD || match.away == null ? 'text-parchment-400/50 italic' : 'text-parchment-100'}`}>
          {match.away == null ? 'BYE' : match.away}
        </p>
      </div>
    </div>
  );
}

export default function EliminationBracketTBD({ groupCount, qualifiersPerGroup }: Props) {
  const rounds = buildTBDRounds(groupCount, qualifiersPerGroup);

  return (
    <div>
      <p className="text-parchment-400/60 text-xs italic mb-4">
        Vista previa del bracket — se generará al finalizar la fase de grupos.
      </p>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max items-start">
          {rounds.map((round, ri) => (
            <div key={ri} className="flex flex-col gap-4">
              <h4 className="text-xs font-bold text-parchment-400/60 uppercase tracking-wider text-center">
                {getRoundLabel(ri, rounds.length)}
              </h4>
              <div className="flex flex-col justify-around gap-6 flex-1">
                {round.map((match, mi) => (
                  <TBDMatchCard key={mi} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
