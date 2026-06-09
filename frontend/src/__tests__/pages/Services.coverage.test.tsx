import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Services } from '../../app/pages/Services'

let services: any[] = [
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
    type: 'request',
    credits: 1,
    status: 'active',
    tags: ['jardín'],
    distanceKm: 1,
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
const getUserReviews = vi.fn(() => [{ id: 'r1', rating: 5 }])
const trades: any[] = [ { id: 't1', serviceId: 's1', status: 'completed' } ]

vi.mock('../../app/context/AppContext', () => ({
  useApp: () => ({
    services,
    currentUser,
    searchServices,
    updateProfile,
    getUserById,
    getUserReviews,
    trades,
  }),
}))

describe('Services page (coverage)', () => {
  beforeEach(() => {
    // reset spies and test state
    vi.clearAllMocks()
  })

  it('renders header, offers and requests and proximity/type labels', () => {
    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Servicios/i })).toBeInTheDocument()

    // Both items from the mocked `services` fixture should render
    expect(screen.getByText(/Clases de piano/i)).toBeInTheDocument()
    expect(screen.getByText(/Cortar el césped/i)).toBeInTheDocument()

    // Proximity labels (emoji + text)
    const proximityMatches = screen.getAllByText(/Cerca|Muy cerca/)
    expect(proximityMatches.length).toBeGreaterThanOrEqual(1)

    // Type chips
    const typeMatches = screen.getAllByText(/Oferta|Solicitud/)
    expect(typeMatches.length).toBeGreaterThanOrEqual(1)
  })

  it('opens filters and calls searchServices and updateProfile with the correct args', () => {
    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    // Open filters
    fireEvent.click(screen.getByText('Filtros'))

    // Ensure the distance input and the checkbox are present
    const distanceInput = screen.getByLabelText('Radio máximo (km)') as HTMLInputElement
    const cityCheckbox = screen.getByLabelText('Mostrar solo mi ciudad') as HTMLInputElement

    // Change values
    fireEvent.change(distanceInput, { target: { value: '10' } })
    expect(distanceInput.value).toBe('10')

    fireEvent.click(cityCheckbox)
    expect(cityCheckbox.checked).toBe(true)

    // Apply filters
    fireEvent.click(screen.getByText('Aplicar filtros'))
    expect(searchServices).toHaveBeenCalledWith({ maxDistanceKm: 10, myCityOnly: true })

    // Save defaults
    fireEvent.click(screen.getByText('Guardar como predeterminado'))
    expect(updateProfile).toHaveBeenCalledWith({ searchRadiusKm: 10, searchMyCityOnly: true })
  })

  it('category quick access filters services when clicking a category tile', () => {
    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    // Click Hogar category quick tile and assert only the matching service remains
    const hogarBtn = screen.getByRole('button', { name: /Hogar/i })
    fireEvent.click(hogarBtn)

    // The hogar service should be visible and the other should not
    expect(screen.getByText(/Cortar el césped/i)).toBeInTheDocument()
    expect(screen.queryByText(/Clases de piano/i)).not.toBeInTheDocument()
  })

  it('search input filters by title/description/tags', () => {
    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    const searchInput = screen.getByPlaceholderText('Buscar servicios...') as HTMLInputElement
    fireEvent.change(searchInput, { target: { value: 'piano' } })

    expect(screen.getByText(/Clases de piano/i)).toBeInTheDocument()
    expect(screen.queryByText(/Cortar el césped/i)).not.toBeInTheDocument()
  })

  it('shows empty state when there are no services', () => {
    // Temporarily empty the services list
    services = []

    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>
    )

    expect(screen.getByText(/No se encontraron servicios/i)).toBeInTheDocument()

    // restore services for other tests
    services = [
      {
        id: 's1', userId: 'other', title: 'Clases de piano', description: 'Aprende canciones sencillas', category: 'tecnologia', type: 'offer', credits: 2, status: 'active', tags: ['música'], distanceKm: 5,
      },
    ]
  })
})
