import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock del módulo de navegación
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock del cliente de la API
vi.mock('../api/client', () => ({
  players: {
    create: vi.fn(),
  },
}));

import PlayerNew from '../pages/PlayerNew';
import { players as apiPlayers } from '../api/client';

const mockCreate = vi.mocked(apiPlayers.create);

function renderComponent() {
  return render(
    <MemoryRouter>
      <PlayerNew />
    </MemoryRouter>
  );
}

describe('PlayerNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el campo de nombre y el botón de crear', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('Nombre del jugador')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear jugador' })).toBeInTheDocument();
  });

  it('muestra error si se intenta enviar con nombre vacío', async () => {
    renderComponent();

    // Usar fireEvent.submit para evitar la validación nativa del browser (atributo required)
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('llama a la API con el nombre correcto al enviar un nombre válido', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({ id: 42, name: 'Pepin', createdAt: '', updatedAt: '' });
    renderComponent();

    await user.type(screen.getByPlaceholderText('Nombre del jugador'), 'Pepin');
    await user.click(screen.getByRole('button', { name: 'Crear jugador' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ name: 'Pepin' });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/players/42');
  });

  it('muestra el error de la API si create() rechaza la promesa', async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(new Error('Nombre duplicado'));
    renderComponent();

    await user.type(screen.getByPlaceholderText('Nombre del jugador'), 'Pepin');
    await user.click(screen.getByRole('button', { name: 'Crear jugador' }));

    expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument();
  });

  it('el botón muestra "Creando…" mientras se envía', async () => {
    const user = userEvent.setup();
    // Promesa que nunca resuelve para mantener el estado de carga
    mockCreate.mockReturnValue(new Promise(() => {}));
    renderComponent();

    await user.type(screen.getByPlaceholderText('Nombre del jugador'), 'Pepin');
    await user.click(screen.getByRole('button', { name: 'Crear jugador' }));

    expect(await screen.findByRole('button', { name: 'Creando…' })).toBeDisabled();
  });
});
