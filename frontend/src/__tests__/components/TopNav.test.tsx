import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { TopNav } from '../../app/components/TopNav'

describe('TopNav component', () => {
  it('renders a logo and navigation links', () => {
    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    )

    expect(screen.getByText('TimeCircle')).toBeInTheDocument()
    expect(screen.getByText(/volver/i)).toBeInTheDocument()
  })

  it('includes a theme toggle button', () => {
    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })
})
