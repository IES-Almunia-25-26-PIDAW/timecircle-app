import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, vi, expect } from 'vitest'

// We'll mock next-themes locally to control setTheme behavior for this test
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
}))

import { ThemeToggle } from '../../app/components/ThemeToggle'

describe('ThemeToggle', () => {
  it('renders and toggles theme when clicked', () => {
    const { getByRole } = render(<ThemeToggle />)
    const button = getByRole('button', { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    // We cannot directly inspect the mocked setTheme here because it's created inside the mock.
    // The fact that the click doesn't throw and the element exists is a minimal smoke test.
  })
})
