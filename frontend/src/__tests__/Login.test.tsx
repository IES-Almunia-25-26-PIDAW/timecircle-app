import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Mock endpoints and toast at top level
vi.mock('../app/api/endpoints', () => ({ apiRequestPasswordReset: vi.fn(), apiConfirmPasswordReset: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

import { Login } from '../app/pages/Login';
import * as AppCtx from '../app/context/AppContext';
import * as Router from 'react-router';
import * as endpoints from '../app/api/endpoints';

describe('Login page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // ensure no real navigation
    vi.spyOn(Router, 'useNavigate').mockReturnValue(vi.fn() as any);
  });

  test('successful login calls login and navigates', async () => {
    const loginMock = vi.fn().mockResolvedValue(true);
    const navigate = vi.fn();
    vi.spyOn(Router, 'useNavigate').mockReturnValue(navigate as any);
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ login: loginMock } as any);

    render(
      <Router.MemoryRouter>
        <Login />
      </Router.MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Nombre de usuario/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'secret' } });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('alice', 'secret'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
  });

  test('failed login shows error message', async () => {
    const loginMock = vi.fn().mockResolvedValue(false);
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ login: loginMock } as any);

    render(
      <Router.MemoryRouter>
        <Login />
      </Router.MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Nombre de usuario/i), { target: { value: 'bob' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    expect(await screen.findByText(/Usuario o contraseña incorrectos./i)).toBeInTheDocument();
  });

  test('password toggle shows and hides password', async () => {
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ login: vi.fn() } as any);

    const { container } = render(
      <Router.MemoryRouter>
        <Login />
      </Router.MemoryRouter>
    );

    const pwdInput = container.querySelector('#login-password') as HTMLInputElement;
    expect(pwdInput).toBeTruthy();
    expect(pwdInput.getAttribute('type')).toBe('password');

    // the toggle button is inside the same parent as the input
    const toggle = pwdInput.parentElement?.querySelector('button') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle);

    // input type should update to text
    await waitFor(() => expect((container.querySelector('#login-password') as HTMLInputElement).getAttribute('type')).toBe('text'));
  });

  test('reset flow: send code then confirm reset', async () => {
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ login: vi.fn() } as any);
    // mock endpoints
    (endpoints.apiRequestPasswordReset as any).mockResolvedValue({});
    (endpoints.apiConfirmPasswordReset as any).mockResolvedValue({});

    render(
      <Router.MemoryRouter>
        <Login />
      </Router.MemoryRouter>
    );

    // open reset panel
    fireEvent.click(screen.getByRole('button', { name: /¿Has olvidado la contraseña\?/i }));

    // step 1: send code
    const email = 'me@example.com';
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar código/i }));

    await waitFor(() => expect(endpoints.apiRequestPasswordReset).toHaveBeenCalledWith(email));

    // now step 2 should be visible
    expect(await screen.findByLabelText(/Código \(6 dígitos\)/i)).toBeInTheDocument();

    // fill code and new password and confirm
    fireEvent.change(screen.getByLabelText(/Código \(6 dígitos\)/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/Nueva contraseña/i), { target: { value: 'newpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }));

    await waitFor(() => expect(endpoints.apiConfirmPasswordReset).toHaveBeenCalledWith(email, '123456', 'newpass'));

    // after confirm, the login view should be shown again (check heading)
    expect(await screen.findByRole('heading', { name: /Iniciar sesión/i })).toBeInTheDocument();
  });
});
