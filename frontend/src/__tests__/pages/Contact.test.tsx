import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

// Mock the endpoint used by Contact
const mockSend = vi.fn()
vi.mock('../../app/api/endpoints', () => ({
  apiSendContactMessage: (...args: any[]) => mockSend(...args),
}))

import { Contact } from '../../app/pages/Contact'

describe('Contact page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form and FAQ items', () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    )

    expect(screen.getByText(/¿En qué podemos ayudarte\?/i)).toBeInTheDocument()
    // Reasons buttons present (there may be other occurrences like sidebar)
    const soporte = screen.getAllByText(/Soporte técnico/i)
    expect(soporte.length).toBeGreaterThanOrEqual(1)
    // FAQ question present
    expect(screen.getByText(/¿Cómo recupero mi contraseña\?/i)).toBeInTheDocument()
  })

  it('shows validation errors when submitting empty form', async () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/Enviar mensaje/i))

    await waitFor(() => {
      expect(screen.getByText(/El nombre es obligatorio/i)).toBeInTheDocument()
      expect(screen.getByText(/Introduce un correo válido/i)).toBeInTheDocument()
      expect(screen.getByText(/Selecciona el motivo de contacto/i)).toBeInTheDocument()
      // final message validation text is the length one
      expect(screen.getByText(/El mensaje debe tener al menos 20 caracteres/i)).toBeInTheDocument()
    })
  })

  it('toggles FAQ item open/close', () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    )

    const q = screen.getByText(/¿Cómo recupero mi contraseña\?/i)
    // Initially answer not visible
    expect(screen.queryByText(/Actualmente, contacta con soporte/i)).toBeNull()
    fireEvent.click(q)
    expect(screen.getByText(/Actualmente, contacta con soporte/i)).toBeInTheDocument()
    // Close
    fireEvent.click(q)
    expect(screen.queryByText(/Actualmente, contacta con soporte/i)).toBeNull()
  })

  it('submits successfully and shows sent screen, then resets', async () => {
    mockSend.mockResolvedValueOnce({})

    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    )

    // Fill form
    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'alice@example.com' } })
    // Select reason (choose the button that contains the label)
    const soporteEls = screen.getAllByText(/Soporte técnico/i)
    const soporteBtn = soporteEls.map(e => e.closest('button')).find(Boolean)
    expect(soporteBtn).toBeTruthy()
    fireEvent.click(soporteBtn as Element)
    // Message (>=20 chars)
    fireEvent.change(screen.getByLabelText(/Mensaje \*/i), { target: { value: 'Este es un mensaje suficientemente largo.' } })

    fireEvent.click(screen.getByText(/Enviar mensaje/i))

    await waitFor(() => expect(mockSend).toHaveBeenCalled())

    // Sent screen shown
    expect(screen.getByText(/Mensaje enviado/i)).toBeInTheDocument()
    expect(screen.getByText(/Hemos recibido tu consulta/i)).toBeInTheDocument()

    // Click enviar otro mensaje to reset
    fireEvent.click(screen.getByText(/Enviar otro mensaje/i))
    expect(screen.getByLabelText(/Nombre \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Correo electrónico \*/i)).toBeInTheDocument()
  })

  it('shows API error message when backend returns validation errors', async () => {
    mockSend.mockRejectedValueOnce({ email: ['El correo ya está registrado'] })

    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: 'Bob' } })
    fireEvent.change(screen.getByLabelText(/Correo electrónico \*/i), { target: { value: 'bob@example.com' } })
    const soporteEls2 = screen.getAllByText(/Soporte técnico/i)
    const soporteBtn2 = soporteEls2.map(e => e.closest('button')).find(Boolean)
    expect(soporteBtn2).toBeTruthy()
    fireEvent.click(soporteBtn2 as Element)
    fireEvent.change(screen.getByLabelText(/Mensaje \*/i), { target: { value: 'Mensaje válido con suficiente longitud.' } })

    fireEvent.click(screen.getByText(/Enviar mensaje/i))

    await waitFor(() => expect(mockSend).toHaveBeenCalled())

    expect(screen.getByText(/El correo ya está registrado/i)).toBeInTheDocument()
  })
})

