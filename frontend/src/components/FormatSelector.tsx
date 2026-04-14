import type { TournamentFormat } from '../types';

interface FormatOption {
  value: TournamentFormat;
  label: string;
  description: string;
  available: boolean;
}

const OPTIONS: FormatOption[] = [
  {
    value: 'MIXED',
    label: 'Mixto',
    description: 'Fase de grupos + eliminatoria cruzada',
    available: true,
  },
  {
    value: 'SINGLE_ELIMINATION',
    label: 'Eliminación directa',
    description: 'Bracket de ida y vuelta hasta el campeón',
    available: false,
  },
  {
    value: 'ROUND_ROBIN',
    label: 'Liguilla completa',
    description: 'Todos contra todos, gana el mejor registro',
    available: false,
  },
];

interface Props {
  value: TournamentFormat;
  onChange: (format: TournamentFormat) => void;
}

export default function FormatSelector({ value, onChange }: Props) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={!opt.available}
            onClick={() => opt.available && onChange(opt.value)}
            className={[
              'relative text-left p-4 rounded-lg border transition-all duration-150',
              opt.available
                ? selected
                  ? 'border-verde-500 bg-verde-500/10 cursor-pointer'
                  : 'border-parchment-100/20 hover:border-parchment-100/40 cursor-pointer'
                : 'border-parchment-100/10 opacity-50 cursor-not-allowed',
            ].join(' ')}
          >
            {!opt.available && (
              <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest text-parchment-400 bg-parchment-100/10 px-1.5 py-0.5 rounded">
                Próximamente
              </span>
            )}
            {selected && opt.available && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-verde-500" />
            )}
            <p className={`font-display font-bold text-sm mb-1 ${selected && opt.available ? 'text-verde-400' : 'text-parchment-200'}`}>
              {opt.label}
            </p>
            <p className="text-parchment-400 text-xs leading-snug">{opt.description}</p>
          </button>
        );
      })}
    </div>
  );
}
