import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Login } from '../../app/pages/Login'

vi.mock('../../app/context/AppContext', () => ({
  useApp: () => ({ login: vi.fn(async () => false) }),
}))

vi.mock('../../app/api/endpoints', () => ({
  apiRequestPasswordReset: vi.fn(async () => ({})),
  apiConfirmPasswordReset: vi.fn(async () => ({})),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

describe('Login page', () => {
  it('renders login form and toggle button', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre de usuario/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
  })

  it('shows reset password form when requested', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/¿has olvidado la contraseña\?/i))
    expect(await screen.findByText(/restablecer contraseña/i)).toBeInTheDocument()
  })
})
