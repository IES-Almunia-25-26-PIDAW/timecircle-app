import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const mockNavigate = vi.fn()

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal()
  const React = await import('react')
  return {
    ...actual,
    Clock: () => React.createElement('svg', { 'data-icon': 'clock' }),
    Eye: () => React.createElement('svg', { 'data-icon': 'eye' }),
    EyeOff: () => React.createElement('svg', { 'data-icon': 'eye-off' }),
    CheckCircle: () => React.createElement('svg', { 'data-icon': 'check' }),
    Sparkles: () => React.createElement('svg', { 'data-icon': 'sparkles' }),
    Moon: () => React.createElement('svg', { 'data-icon': 'moon' }),
    Sun: () => React.createElement('svg', { 'data-icon': 'sun' }),
  }
})

vi.mock('react-router', () => ({
  Link: ({ children, ...props }: any) => React.createElement('a', { ...props }, children),
  useNavigate: () => mockNavigate,
}))

vi.mock('../../app/components/ThemeToggle', () => ({ ThemeToggle: () => React.createElement('div', { 'data-slot': 'theme-toggle' }) }))

import * as AppContext from '../../app/context/AppContext'
import * as endpoints from '../../app/api/endpoints'
import * as client from '../../app/api/client'
import { Register } from '../../app/pages/Register'

describe('Register page', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
    vi.spyOn(AppContext, 'useApp').mockImplementation(() => ({ login: mockLogin }))
    vi.spyOn(endpoints, 'apiRegister').mockResolvedValue(undefined as any)
    vi.spyOn(client, 'setTokens').mockImplementation(() => {})
  })

  test('renders form fields and left panel content', () => {
    render(<Register />)
    expect(screen.getByText('Crear cuenta')).toBeTruthy()
    expect(screen.getByLabelText(/Nombre \*/i)).toBeTruthy()
    expect(screen.getByLabelText(/Nombre de usuario \*/i)).toBeTruthy()
    expect(screen.getByLabelText(/Correo electrónico \*/i)).toBeTruthy()
    expect(screen.getByLabelText('Contraseña *')).toBeTruthy()
    expect(screen.getByLabelText('Confirmar contraseña *')).toBeTruthy()
  })

  test('auto-generates username from first name', () => {
    render(<Register />)
    const first = screen.getByLabelText(/Nombre \*/i) as HTMLInputElement
    const username = screen.getByLabelText(/Nombre de usuario \*/i) as HTMLInputElement

    fireEvent.change(first, { target: { value: 'Ana María' } })
    expect(username.value).toBe('ana_mara')
  })

  test('toggles show password button', () => {
    render(<Register />)
    const pwd = screen.getByLabelText('Contraseña *') as HTMLInputElement
    const toggle = screen.getByRole('button', { name: '' })
    expect(pwd.type).toBe('password')
    fireEvent.click(toggle)
    expect(pwd.type).toBe('text')
  })

  test('validates password mismatch and length', async () => {
    render(<Register />)
    const pwd = screen.getByLabelText('Contraseña *') as HTMLInputElement
    const confirm = screen.getByLabelText('Confirmar contraseña *') as HTMLInputElement
    const submit = screen.getByRole('button', { name: /Crear cuenta gratuita/i })

    // mismatch
    fireEvent.change(pwd, { target: { value: 'password123' } })
    fireEvent.change(confirm, { target: { value: 'different' } })
    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(submit)
    await screen.findByText(/Las contraseñas no coinciden/i)

    // short
    fireEvent.change(pwd, { target: { value: 'short' } })
    fireEvent.change(confirm, { target: { value: 'short' } })
    fireEvent.click(submit)
    await screen.findByText(/La contraseña debe tener al menos 8 caracteres/i)
  })

  test('requires username', async () => {
    render(<Register />)
    const username = screen.getByLabelText(/Nombre de usuario \*/i) as HTMLInputElement
    const pwd = screen.getByLabelText('Contraseña *') as HTMLInputElement
    const confirm = screen.getByLabelText('Confirmar contraseña *') as HTMLInputElement
    const submit = screen.getByRole('button', { name: /Crear cuenta gratuita/i })

    fireEvent.change(username, { target: { value: '' } })
    fireEvent.change(pwd, { target: { value: 'validpassword' } })
    fireEvent.change(confirm, { target: { value: 'validpassword' } })
    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(submit)
    await screen.findByText(/El nombre de usuario es obligatorio/i)
  })

  test('successful registration navigates to dashboard', async () => {
    // mock apiRegister to return tokens
    ;(endpoints.apiRegister as unknown as vi.Mock).mockResolvedValue({ tokens: { access: 'a', refresh: 'r' } })
    mockLogin.mockResolvedValue(true)

    render(<Register />)
    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'validpassword' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'validpassword' } })

    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta gratuita/i }))

    await waitFor(() => expect(client.setTokens).toHaveBeenCalled())
    await waitFor(() => expect(mockLogin).toHaveBeenCalled())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })

  test('handles API username error', async () => {
    ;(endpoints.apiRegister as unknown as vi.Mock).mockRejectedValue({ username: ['Username already exists'] })

    render(<Register />)
    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'validpassword' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'validpassword' } })

    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta gratuita/i }))

    await screen.findByText(/Username already exists/i)
  })

  test('handles API email error', async () => {
    ;(endpoints.apiRegister as unknown as vi.Mock).mockRejectedValue({ email: ['Email already exists'] })

    render(<Register />)
    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'validpassword' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'validpassword' } })

    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta gratuita/i }))

    await screen.findByText(/Email already exists/i)
  })

  test('handles API password error', async () => {
    ;(endpoints.apiRegister as unknown as vi.Mock).mockRejectedValue({ password: ['Password too weak'] })

    render(<Register />)
    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'validpassword' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'validpassword' } })

    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta gratuita/i }))

    await screen.findByText(/Password too weak/i)
  })

  test('handles API detail error', async () => {
    ;(endpoints.apiRegister as unknown as vi.Mock).mockRejectedValue({ detail: 'Registration failed' })

    render(<Register />)
    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'validpassword' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'validpassword' } })

    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta gratuita/i }))

    await screen.findByText(/Registration failed/i)
  })

  test('handles login failure after successful registration', async () => {
    ;(endpoints.apiRegister as unknown as vi.Mock).mockResolvedValue({ tokens: { access: 'a', refresh: 'r' } })
    mockLogin.mockResolvedValue(false)

    render(<Register />)
    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'validpassword' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'validpassword' } })

    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta gratuita/i }))

    await screen.findByText(/Error al crear la cuenta. Comprueba los datos./i)
  })

  test('handles registration without tokens', async () => {
    ;(endpoints.apiRegister as unknown as vi.Mock).mockResolvedValue({})

    render(<Register />)
    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'validpassword' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'validpassword' } })

    const form = document.querySelector('form') as HTMLFormElement
    form.noValidate = true
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta gratuita/i }))

    await screen.findByText(/Error al crear la cuenta. Comprueba los datos./i)
  })

  test('formats username with spaces and special characters', () => {
    render(<Register />)
    const username = screen.getByLabelText(/Nombre de usuario \*/i) as HTMLInputElement

    // Test with spaces, uppercase, and special characters (accents removed)
    fireEvent.change(username, { target: { value: 'Ana García-López @123' } })
    expect(username.value).toBe('ana_garcalpez_123')

    // Test with only special characters
    fireEvent.change(username, { target: { value: '!@#$%' } })
    expect(username.value).toBe('')

    // Test with normal input
    fireEvent.change(username, { target: { value: 'test_user_123' } })
    expect(username.value).toBe('test_user_123')
  })
})
