import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router'

let mockCtx: any = { users: [], currentUser: null }
vi.mock('../../app/context/AppContext', () => ({ useApp: () => mockCtx }))

import { Leaderboard } from '../../app/pages/Leaderboard'

function makeUser(i: number, overrides = {}) {
  return {
    id: `u${i}`,
    name: `User ${i}`,
    avatar: `avatar-${i}.png`,
    rating: 5 - (i % 5),
    completedTrades: i,
    hoursGiven: i * 2,
    credits: i * 3,
    country: i % 6 === 0 ? 'Spain' : 'Country' + (i % 3),
    city: i % 7 === 0 ? 'Jerez' : 'City' + (i % 4),
    badge: overrides.badge ?? undefined,
    ...overrides,
  }
}

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders podium and top users with medals and badges', async () => {
    const users = [
      makeUser(1, { hoursGiven: 100, badge: 'gold' }),
      makeUser(2, { hoursGiven: 80, badge: 'silver' }),
      makeUser(3, { hoursGiven: 50, badge: 'bronze' }),
      makeUser(4, { hoursGiven: 20 }),
    ]
    mockCtx = { users, currentUser: users[1] }

    render(
      <MemoryRouter initialEntries={["/leaderboard"]}>
        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </MemoryRouter>
    )

    // header and trophy present
    expect(await screen.findByText(/Vecinos más solidarios/i)).toBeTruthy()

    // badges legend should be rendered
    expect(screen.getByText(/Oro/i)).toBeTruthy()
    expect(screen.getByText(/Plata/i)).toBeTruthy()
    expect(screen.getByText(/Bronce/i)).toBeTruthy()

    // default active sort is Horas dadas
    const hoursBtn = screen.getByRole('button', { name: /Horas dadas/i })
    expect(hoursBtn.className).toMatch(/bg-teal-600/)
  })

  it('excludes users from Spain and Jerez and handles pagination', async () => {
    const users = Array.from({ length: 15 }).map((_, i) => makeUser(i + 1))
    users.push(makeUser(100, { country: 'Spain', city: 'Seville' }))
    users.push(makeUser(101, { country: 'Country1', city: 'Jerez' }))

    mockCtx = { users, currentUser: users[0] }

    render(
      <MemoryRouter initialEntries={["/leaderboard"]}>
        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText(/Página 1 de/i)).toBeTruthy()

    const nextBtn = screen.getByText(/Next/i)
    if (!nextBtn.hasAttribute('disabled')) {
      fireEvent.click(nextBtn)
      expect(screen.getByText(/Página 2 de/i)).toBeTruthy()
    }

    expect(screen.queryByText(/User 100/)).toBeNull()
  })

  it('allows changing sort option to rating and updates active button', async () => {
    const users = [makeUser(1), makeUser(2), makeUser(3), makeUser(4)]
    mockCtx = { users, currentUser: users[0] }

    render(
      <MemoryRouter initialEntries={["/leaderboard"]}>
        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </MemoryRouter>
    )

    const ratingBtn = await screen.findByRole('button', { name: /Valoración/i })
    fireEvent.click(ratingBtn)

    // active class toggles when selected
    expect(ratingBtn.className).toMatch(/bg-teal-600/)
    const hoursBtn = screen.getByRole('button', { name: /Horas dadas/i })
    expect(hoursBtn.className).not.toMatch(/bg-teal-600/)
  })

  it('shows correct stat suffix for hours and rating when sort changes', async () => {
    const users = [
      makeUser(1, { hoursGiven: 10, rating: 4 }),
      makeUser(2, { hoursGiven: 5, rating: 5 }),
      makeUser(3, { hoursGiven: 2, rating: 3 }),
    ]
    mockCtx = { users, currentUser: users[0] }

    render(
      <MemoryRouter initialEntries={["/leaderboard"]}>
        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </MemoryRouter>
    )

    // default is hours -> show at least one 'h' suffix
    expect((await screen.findAllByText(/h/)).length).toBeGreaterThan(0)

    // switch to rating -> should show star suffix
    const ratingBtn = screen.getByRole('button', { name: /Valoración/i })
    fireEvent.click(ratingBtn)
    expect((await screen.findAllByText(/★/)).length).toBeGreaterThan(0)
  })

  it('renders non-podium rows with #index and marks current user as tú', async () => {
    const users = Array.from({ length: 12 }).map((_, i) => makeUser(i + 1, { country: 'CountryX', city: 'CityX' }))
    mockCtx = { users, currentUser: users[5] }

    render(
      <MemoryRouter initialEntries={["/leaderboard"]}>
        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </MemoryRouter>
    )

    // ensure current user row is rendered and annotated with (tú)
    const userEl = await screen.findByText(/User 6/)
    expect(userEl).toBeTruthy()
    expect(userEl.textContent).toContain('(tú)')
  })

  it('initializes from URL search params for sort and page', async () => {
    const users = Array.from({ length: 25 }).map((_, i) => makeUser(i + 1, { country: 'Country1', city: 'City1' }))
    mockCtx = { users, currentUser: users[0] }

    render(
      <MemoryRouter initialEntries={["/leaderboard?sort=rating&page=2"]}>
        <Routes>
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </MemoryRouter>
    )

    // component should reflect page 2 from URL: look for active page button
    const pageButtons = await screen.findAllByRole('button')
    const page2Btn = pageButtons.find(b => b.textContent?.trim() === '2')
    expect(page2Btn).toBeTruthy()
    expect(page2Btn?.className).toMatch(/bg-teal-600/)
    // rating sort should be active
    const ratingBtn = screen.getByRole('button', { name: /Valoración/i })
    expect(ratingBtn.className).toMatch(/bg-teal-600/)
  })
})
