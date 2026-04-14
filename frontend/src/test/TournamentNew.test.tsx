import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/client', () => ({
  tournaments: {
    create: vi.fn(),
  },
}));

// Mock de FormatSelector para poder cambiar el formato en tests
vi.mock('../components/FormatSelector', () => ({
  default: ({ value, onChange }: { value: string; onChange: (f: string) => void }) => (
    <div>
      <button
        type="button"
        data-testid="format-MIXED"
        onClick={() => onChange('MIXED')}
        aria-pressed={value === 'MIXED'}
      >
        Mixto
      </button>
      <button
        type="button"
        data-testid="format-SINGLE_ELIMINATION"
        onClick={() => onChange('SINGLE_ELIMINATION')}
        aria-pressed={value === 'SINGLE_ELIMINATION'}
      >
        Eliminación directa
      </button>
      <button
        type="button"
        data-testid="format-ROUND_ROBIN"
        onClick={() => onChange('ROUND_ROBIN')}
        aria-pressed={value === 'ROUND_ROBIN'}
      >
        Liguilla completa
      </button>
    </div>
  ),
}));

import TournamentNew from '../pages/TournamentNew';
import { tournaments as apiTournaments } from '../api/client';

const mockCreate = vi.mocked(apiTournaments.create);

function renderComponent() {
  return render(
    <MemoryRouter>
      <TournamentNew />
    </MemoryRouter>
  );
}

describe('TournamentNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza todos los campos básicos', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('Nombre del torneo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: I, II, 2025…')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Descripción opcional del torneo')).toBeInTheDocument();
    // Año y fecha de inicio por label
    expect(screen.getByText(/Año/i)).toBeInTheDocument();
    expect(screen.getByText(/Fecha inicio/i)).toBeInTheDocument();
  });

  it('formato MIXED por defecto muestra campos de grupos y clasificados por grupo', () => {
    renderComponent();
    expect(screen.getByText('Número de grupos')).toBeInTheDocument();
    expect(screen.getByText('Clasificados por grupo')).toBeInTheDocument();
  });

  it('cambiar a SINGLE_ELIMINATION oculta los campos de grupos', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByTestId('format-SINGLE_ELIMINATION'));

    expect(screen.queryByText('Número de grupos')).not.toBeInTheDocument();
    expect(screen.queryByText('Clasificados por grupo')).not.toBeInTheDocument();
  });

  it('cambiar a ROUND_ROBIN muestra número de grupos pero oculta clasificados por grupo', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByTestId('format-ROUND_ROBIN'));

    expect(screen.getByText('Número de grupos')).toBeInTheDocument();
    expect(screen.queryByText('Clasificados por grupo')).not.toBeInTheDocument();
  });

  it('muestra error de validación si nombre está vacío al enviar', async () => {
    renderComponent();

    // Usar fireEvent.submit para evitar la validación nativa del browser (atributo required)
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(await screen.findByText('Nombre, edición y fecha de inicio son obligatorios.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('llama a la API con los datos correctos en un envío válido', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      id: 10,
      name: 'Copa Dragón',
      edition: 'I',
      year: 2026,
      startDate: '2026-05-01',
      description: null,
      status: 'ACTIVE',
      format: 'MIXED',
      groupCount: 2,
      qualifiersPerGroup: 2,
      createdAt: '',
      updatedAt: '',
    });
    renderComponent();

    await user.type(screen.getByPlaceholderText('Nombre del torneo'), 'Copa Dragón');
    await user.type(screen.getByPlaceholderText('Ej: I, II, 2025…'), 'I');

    // Rellenar fecha de inicio directamente con fireEvent para evitar problemas de formato en jsdom
    const dateInputEl = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInputEl, { target: { value: '2026-05-01' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Copa Dragón',
          edition: 'I',
          format: 'MIXED',
          startDate: '2026-05-01',
        })
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('/tournaments/10');
  });
});
