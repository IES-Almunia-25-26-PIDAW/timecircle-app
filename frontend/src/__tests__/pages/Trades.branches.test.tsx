import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('lucide-react', () => ({
  CheckCircle: () => React.createElement('svg', { 'data-icon': 'check' }),
  XCircle: () => React.createElement('svg', { 'data-icon': 'x' }),
  PlayCircle: () => React.createElement('svg', { 'data-icon': 'play' }),
  Star: () => React.createElement('svg', { 'data-icon': 'star' }),
  Calendar: () => React.createElement('svg', { 'data-icon': 'cal' }),
  Clock: () => React.createElement('svg', { 'data-icon': 'clock' }),
  ChevronDown: () => React.createElement('svg', { 'data-icon': 'cd' }),
  ChevronUp: () => React.createElement('svg', { 'data-icon': 'cu' }),
  ArrowLeftRight: () => React.createElement('svg', { 'data-icon': 'alr' }),
}))

vi.mock('react-router', () => ({ Link: ({ to, children }: any) => React.createElement('a', { href: to }, children) }))

describe('Trades branches', () => {
  afterEach(() => vi.resetModules())

  test('ReviewModal shows error for short comment then submits', async () => {
    const addReview = vi.fn()
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))
    const getUserTrades = vi.fn(() => [
      {
        id: 't4',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'completed',
        creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById,
        getUserById,
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart: vi.fn(),
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview,
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)

    // open completed tab
    const compBtn = screen.getAllByText('Completados').find((el: any) => el.tagName === 'BUTTON') as HTMLElement
    fireEvent.click(compBtn)

    // expand card
    const toggle = container.querySelector('svg[data-icon="cd"], svg[data-icon="cu"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    // open review modal
    const valBtn = await screen.findByText('Valorar')
    fireEvent.click(valBtn)

    // set rating then click submit with short comment to trigger comment length validation
    const starBtn = screen.getAllByLabelText(/Puntuación 5/)[0]
    fireEvent.click(starBtn)
    const submit = await screen.findByText('Enviar valoración')
    fireEvent.click(submit)

    // expect error message about length
    await waitFor(() => expect(screen.getByText(/El comentario debe/)).toBeTruthy())
    const ta = screen.getByPlaceholderText('Comparte tu experiencia con la comunidad...') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'Este es un comentario valido.' } })

    fireEvent.click(submit)

    await waitFor(() => expect(addReview).toHaveBeenCalled())
    // success UI displayed
    expect(screen.getByText(/¡Valoración enviada!/)).toBeTruthy()
  })

  test('accepted trade: startedById branches show requested or confirm', async () => {
    const confirmStart = vi.fn()
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))

    // case: startedById === currentUser -> shows Inicio solicitado
    const getUserTradesA = vi.fn(() => [
      {
        id: 't5',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'accepted',
        creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        startedById: 'u1',
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades: getUserTradesA,
        getServiceById,
        getUserById,
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart,
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="cd"], svg[data-icon="cu"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)
    expect(screen.queryByText('Inicio solicitado')).toBeTruthy()

    // case: startedById different -> Confirmar inicio
    vi.resetModules()
    const getUserTradesB = vi.fn(() => [
      {
        id: 't6',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'accepted',
        creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        startedById: 'u2',
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades: getUserTradesB,
        getServiceById,
        getUserById,
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart,
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades: Trades2 } = await import('../../app/pages/Trades')
    const { container: c2 } = render(<Trades2 />)
    const toggle2 = c2.querySelector('svg[data-icon="cd"], svg[data-icon="cu"]')?.parentElement as HTMLElement
    if (toggle2) fireEvent.click(toggle2)
    const confirmBtn = await screen.findByText('Confirmar inicio')
    expect(confirmBtn).toBeTruthy()
  })

  test('in_progress shows requestEnd and confirmEnd paths', async () => {
    const requestEnd = vi.fn()
    const confirmEnd = vi.fn()
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))
    const getUserTrades = vi.fn(() => [
      {
        id: 't7',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'in_progress',
        creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById,
        getUserById,
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart: vi.fn(),
        requestEnd,
        confirmEnd,
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="cd"], svg[data-icon="cu"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    const reqBtn = await screen.findByText('Solicitar fin')
    expect(reqBtn).toBeTruthy()

    // Confirmar fin removed — the UI shows an end-request count
    expect(await screen.findByText(/0\/2 personas/i)).toBeTruthy()
  })
})
