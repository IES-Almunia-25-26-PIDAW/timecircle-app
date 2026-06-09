import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { NewService } from '../../app/pages/NewService'

const mockNavigate = vi.fn()
const addService = vi.fn()

vi.mock('../../app/context/AppContext', () => ({
  useApp: () => ({
    currentUser: { id: 'me', name: 'María', credits: 10 },
    addService,
  }),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('NewService page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the new service form header', () => {
    render(
      <MemoryRouter>
        <NewService />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Publicar servicio/i })).toBeInTheDocument()
  })

  it('displays service type options', () => {
    render(
      <MemoryRouter>
        <NewService />
      </MemoryRouter>
    )

    expect(screen.getByText(/Tipo de publicación/i)).toBeInTheDocument()
    expect(screen.getByText(/Ofrezco ayuda/i)).toBeInTheDocument()
  })

  it('displays category options', () => {
    render(
      <MemoryRouter>
        <NewService />
      </MemoryRouter>
    )

    expect(screen.getByText(/Arte y Creatividad/i)).toBeInTheDocument()
  })
})
