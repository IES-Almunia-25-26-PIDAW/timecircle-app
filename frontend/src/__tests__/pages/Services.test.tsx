import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Services } from '../../app/pages/Services'

const services = [
  {
    id: 's1',
    userId: 'other',
    title: 'Clases de piano',
    description: 'Aprende canciones sencillas',
    category: 'tecnologia',
    type: 'offer',
    credits: 2,
    status: 'active',
    tags: ['música', 'instrumento'],
    distanceKm: 5,
    proximity: 'close',
  },
  {
    id: 's2',
    userId: 'other',
    title: 'Cortar el césped',
    description: 'Ayuda en jardín',
    category: 'hogar',
    type: 'offer',
    credits: 1,
    status: 'active',
    tags: ['jardín'],
    distanceKm: 3,
    proximity: 'very_close',
  },
]

const currentUser = {
  id: 'me',
  searchRadiusKm: 50,
  searchMyCityOnly: false,
}

const searchServices = vi.fn()
const updateProfile = vi.fn()
const getUserById = vi.fn(() => ({ id: 'other', name: 'Carlos', avatar: '/avatar.png', rating: 4.5, completedTrades: 5 }))
const getUserReviews = vi.fn(() => [])

vi.mock('../../app/context/AppContext', () => ({
  useApp: () => ({
    services,
    currentUser,
    searchServices,
    updateProfile,
    getUserById,
    getUserReviews,
    trades: [],
  }),
}))

describe('Services page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders services header', () => {
    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Servicios/i })).toBeInTheDocument()
  })

  it('renders services from the list', () => {
    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    expect(screen.getByText(/Clases de piano/i)).toBeInTheDocument()
    expect(screen.getByText(/Cortar el césped/i)).toBeInTheDocument()
  })

  it('handles services without distance/proximity and unknown category', () => {
    // Mock a service lacking distanceKm and with unknown category
    const noDist = {
      id: 's3',
      userId: 'other',
      title: 'Sin distancia',
      description: 'No distance info',
      category: 'nonexistent',
      type: 'offer',
      credits: 1,
      status: 'active',
      tags: [],
    }

    // Replace the shared `services` array contents for this test instance
    const prev = services.slice()
    services.splice(0, services.length, noDist)

    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    // Should show title
    expect(screen.getByText(/Sin distancia/)).toBeInTheDocument()

    // No distance/proximity text should be rendered
    expect(screen.queryByText(/km desde ti/)).toBeNull()

    // Unknown category should fall back to generic icon '✨' (at least one occurrence)
    const icons = screen.getAllByText('✨')
    expect(icons.length).toBeGreaterThanOrEqual(1)

    // Restore original services
    services.splice(0, services.length, ...prev)
  })

  it('type filter hides offers when set to request', () => {
    // Start from the original mocked services array (offers present)
    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    // Open filters panel
    fireEvent.click(screen.getByText(/Filtros/i))

    // Click the 'Solicitudes' button to filter requests only
    fireEvent.click(screen.getByText('🙋 Solicitudes'))

    // Now only requests should be shown — the offer 'Clases de piano' should be hidden
    expect(screen.queryByText(/Clases de piano/i)).toBeNull()
  })
})
