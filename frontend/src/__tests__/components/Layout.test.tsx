import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Layout } from '../../app/components/Layout'

const { mockContext, logout } = vi.hoisted(() => ({
  logout: vi.fn(),
  mockContext: {
    currentUser: {
      id: 'user-1',
      name: 'Ada Lovelace',
      avatar: '/ada.png',
      credits: 8,
      isAdmin: false,
    } as any,
    logout: vi.fn(),
    totalUnreadMessages: 0,
    loading: false,
  },
}))

vi.mock('../../app/context/AppContext', () => ({
  useApp: () => mockContext,
}))

const renderLayout = (initialPath = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div>Landing page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/*" element={<Layout />}>
          <Route path="dashboard" element={<div>Dashboard outlet</div>} />
          <Route path="messages/*" element={<div>Messages outlet</div>} />
          <Route path="admin" element={<div>Admin outlet</div>} />
          <Route path="services/new" element={<div>New service outlet</div>} />
          <Route path="profile/:id" element={<div>Profile outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('Layout', () => {
  beforeEach(() => {
    logout.mockClear()
    mockContext.currentUser = {
      id: 'user-1',
      name: 'Ada Lovelace',
      avatar: '/ada.png',
      credits: 8,
      isAdmin: false,
    }
    mockContext.logout = logout
    mockContext.totalUnreadMessages = 0
    mockContext.loading = false
  })

  it('shows the loading state while auth is being validated', () => {
    mockContext.loading = true

    renderLayout()

    expect(screen.getByText('Cargando TimeCircle...')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard outlet')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', async () => {
    mockContext.currentUser = null

    renderLayout()

    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  it('renders the authenticated shell with active navigation and unread badges', () => {
    mockContext.currentUser = {
      id: 'admin-1',
      name: 'Grace Hopper',
      avatar: '/grace.png',
      credits: 12,
      isAdmin: true,
    }
    mockContext.totalUnreadMessages = 4

    renderLayout('/messages/thread-1')

    expect(screen.getByText('TimeCircle')).toBeInTheDocument()
    expect(screen.getByText('12 h')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('Messages outlet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /administración/i })).toBeInTheDocument()
    expect(screen.getAllByText('4')).toHaveLength(2)

    const messagesLink = screen.getByRole('link', { name: /mensajes/i })
    expect(messagesLink.className).toContain('bg-teal-600')
  })

  it('opens and closes the mobile sidebar overlay', () => {
    const { container } = renderLayout()

    expect(screen.queryByRole('button', { name: /cerrar barra lateral/i })).not.toBeInTheDocument()

    const menuButton = container.querySelector('header button.lg\\:hidden')
    expect(menuButton).toBeInTheDocument()
    fireEvent.click(menuButton!)

    const overlay = screen.getByRole('button', { name: /cerrar barra lateral/i })
    expect(overlay).toBeInTheDocument()

    fireEvent.click(overlay)
    expect(screen.queryByRole('button', { name: /cerrar barra lateral/i })).not.toBeInTheDocument()
  })

  it('closes the sidebar from its close button and sidebar links', async () => {
    mockContext.currentUser = {
      id: 'admin-1',
      name: 'Grace Hopper',
      avatar: '/grace.png',
      credits: 12,
      isAdmin: true,
    }
    const { container } = renderLayout('/admin')

    const menuButton = container.querySelector('header button.lg\\:hidden')
    fireEvent.click(menuButton!)
    expect(screen.getByRole('button', { name: /cerrar barra lateral/i })).toBeInTheDocument()

    const closeButton = container.querySelector('aside button.ml-auto')
    fireEvent.click(closeButton!)
    expect(screen.queryByRole('button', { name: /cerrar barra lateral/i })).not.toBeInTheDocument()

    fireEvent.click(menuButton!)
    const adminLink = screen.getByRole('link', { name: /administración/i })
    expect(adminLink.className).toContain('bg-teal-600')
    fireEvent.click(adminLink)
    expect(screen.queryByRole('button', { name: /cerrar barra lateral/i })).not.toBeInTheDocument()

    fireEvent.click(menuButton!)
    fireEvent.click(screen.getByRole('link', { name: /grace hopper ver perfil/i }))

    expect(await screen.findByText('Profile outlet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cerrar barra lateral/i })).not.toBeInTheDocument()
  })

  it('opens the profile menu, closes it through the profile link, and navigates links through the outlet', async () => {
    const { container } = renderLayout()

    const profileButton = container.querySelector('header div.relative > button')
    expect(profileButton).toBeInTheDocument()
    fireEvent.click(profileButton!)

    expect(screen.getByRole('link', { name: /mi perfil/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /mi perfil/i }))

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /mi perfil/i })).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('link', { name: /^publicar servicio$/i }))

    expect(await screen.findByText('New service outlet')).toBeInTheDocument()
  })

  it('logs out from both logout controls and navigates home', async () => {
    const { unmount } = renderLayout()

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Landing page')).toBeInTheDocument()

    unmount()
    const { container } = renderLayout()
    const profileButton = container.querySelector('header div.relative > button')
    fireEvent.click(profileButton!)
    fireEvent.click(screen.getAllByRole('button', { name: /cerrar sesión/i }).at(-1)!)

    expect(logout).toHaveBeenCalledTimes(2)
  })
})
