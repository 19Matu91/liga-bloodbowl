import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/client', () => ({
  matches: {
    submitResult: vi.fn(),
  },
}));

import MatchResultForm from '../components/bracket/MatchResultForm';
import { matches as matchesApi } from '../api/client';

const mockSubmitResult = vi.mocked(matchesApi.submitResult);

const pendingMatch = {
  id: 1,
  roundId: 1,
  status: 'PENDING' as const,
  homeTDs: null,
  awayTDs: null,
  homeCas: null,
  awayCas: null,
  winnerId: null,
  homeParticipantId: 1,
  awayParticipantId: 2,
  homeParticipant: {
    id: 1,
    playerId: 1,
    tournamentId: 1,
    raceId: 1,
    teamName: null,
    groupNumber: 1,
    rerolls: 0,
    hasApothecary: false,
    teamValue: 1000,
    isVeteran: false,
    player: { id: 1, name: 'Pepin', createdAt: '', updatedAt: '' },
    race: { id: 1, name: 'Humanos', rerollCost: 50000, imageUrl: null },
  },
  awayParticipant: {
    id: 2,
    playerId: 2,
    tournamentId: 1,
    raceId: 2,
    teamName: null,
    groupNumber: 1,
    rerolls: 0,
    hasApothecary: false,
    teamValue: 1000,
    isVeteran: false,
    player: { id: 2, name: 'Jorge', createdAt: '', updatedAt: '' },
    race: { id: 2, name: 'Elfos', rerollCost: 50000, imageUrl: null },
  },
};

const completedMatch = {
  ...pendingMatch,
  id: 2,
  status: 'COMPLETED' as const,
  homeTDs: 2,
  awayTDs: 1,
  homeCas: 0,
  awayCas: 1,
  winnerId: 1,
};

describe('MatchResultForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza los nombres del partido (local y visitante)', () => {
    render(<MatchResultForm match={pendingMatch} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Pepin')).toBeInTheDocument();
    expect(screen.getByText('Jorge')).toBeInTheDocument();
  });

  it('los inputs TD se precargan con los valores actuales del match', () => {
    render(<MatchResultForm match={completedMatch} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole('spinbutton');
    // homeTDs, awayTDs, homeCas, awayCas = 2, 1, 0, 1
    expect(inputs[0]).toHaveValue(2);
    expect(inputs[1]).toHaveValue(1);
    expect(inputs[2]).toHaveValue(0);
    expect(inputs[3]).toHaveValue(1);
  });

  it('al enviar un partido pendiente → llama directamente a la API sin modal', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockSubmitResult.mockResolvedValue({});

    render(<MatchResultForm match={pendingMatch} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(mockSubmitResult).toHaveBeenCalledWith(1, 0, 0, 0, 0);
    });
    expect(screen.queryByText('Este partido ya tiene resultado.')).not.toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('al enviar un partido completado → muestra el modal de confirmación', async () => {
    const user = userEvent.setup();
    render(<MatchResultForm match={completedMatch} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(await screen.findByText('¿Deseas modificarlo?', { exact: false })).toBeInTheDocument();
    expect(mockSubmitResult).not.toHaveBeenCalled();
  });

  it('en el modal de confirmación → al confirmar llama a la API', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockSubmitResult.mockResolvedValue({});

    render(<MatchResultForm match={completedMatch} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    const confirmBtn = await screen.findByRole('button', { name: 'Modificar' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockSubmitResult).toHaveBeenCalledWith(2, 2, 1, 0, 1);
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('en el modal de confirmación → al cancelar no llama a la API', async () => {
    const user = userEvent.setup();
    render(<MatchResultForm match={completedMatch} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    const cancelModalBtn = await screen.findAllByRole('button', { name: 'Cancelar' });
    // El primer "Cancelar" está en el modal (el segundo es el del formulario)
    await user.click(cancelModalBtn[0]);

    expect(mockSubmitResult).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Deseas modificarlo?', { exact: false })).not.toBeInTheDocument();
  });

  it('el botón Cancelar llama a onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<MatchResultForm match={pendingMatch} onSuccess={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('muestra error si la API falla', async () => {
    const user = userEvent.setup();
    mockSubmitResult.mockRejectedValue(new Error('Partido no encontrado'));

    render(<MatchResultForm match={pendingMatch} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Partido no encontrado')).toBeInTheDocument();
  });
});
