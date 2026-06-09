import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router'

const mockNavigate = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => mockNavigate }
})

let mockContext: any = {
  currentUser: null,
  getUserById: () => undefined,
  getUserReviews: () => [],
  services: [],
  getUserTrades: () => [],
  startConversation: () => Promise.resolve(null),
  updateProfile: () => Promise.resolve(),
}

vi.mock('../../app/context/AppContext', () => ({ useApp: () => mockContext }))

import { Profile } from '../../app/pages/Profile'

describe('Profile page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Edit modal for own profile and calls updateProfile on save', async () => {
    const user = { id: 'u1', name: 'Me', avatar: '', skills: [], badge: null, isAdmin: false, shareExactLocation: false, streetAddress: '', postalCode: '', rating: 0, completedTrades: 0, hoursGiven: 0, hoursReceived: 0, memberSince: null }
    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserById: (id: string) => user,
      services: [],
      getUserReviews: () => [],
      getUserTrades: () => [],
      updateProfile: vi.fn().mockResolvedValue(undefined),
    }

    render(
      <MemoryRouter initialEntries={[`/profile/${user.id}`]}>
        <Routes>
          <Route path="/profile/:id" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    )

    const editBtn = await screen.findByRole('button', { name: /Editar perfil/i })
    fireEvent.click(editBtn)

    // Modal should show (check for a field inside it)
    expect(await screen.findByLabelText(/Nombre completo/i)).toBeInTheDocument()

    const saveBtn = screen.getByRole('button', { name: /Guardar/i })
    fireEvent.click(saveBtn)

    await waitFor(() => expect(mockContext.updateProfile).toHaveBeenCalled())
  })

  it('clicking Mensaje starts conversation and navigates', async () => {
    // use top-level mocked navigate

    const current = { id: 'me', name: 'Me' }
    const other = { id: 'u2', name: 'Other', avatar: '', skills: [], badge: null, isAdmin: false, shareExactLocation: false, streetAddress: '', postalCode: '', rating: 4.5, completedTrades: 2, hoursGiven: 0, hoursReceived: 0, memberSince: null }

    mockContext = {
      ...mockContext,
      currentUser: current,
      getUserById: (id: string) => id === other.id ? other : null,
      services: [],
      getUserReviews: () => [],
      getUserTrades: () => [],
      startConversation: vi.fn().mockResolvedValue('conv123'),
    }

    render(
      <MemoryRouter initialEntries={[`/profile/${other.id}`]}>
        <Routes>
          <Route path="/profile/:id" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    )

    const msgBtn = await screen.findByRole('button', { name: /Mensaje/i })
    fireEvent.click(msgBtn)

    await waitFor(() => expect(mockContext.startConversation).toHaveBeenCalledWith(other.id))
    expect(mockNavigate).toHaveBeenCalledWith('/messages?conv=conv123')
  })
})
