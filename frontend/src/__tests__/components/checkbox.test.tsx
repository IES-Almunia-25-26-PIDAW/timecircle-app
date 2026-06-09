import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import { Checkbox } from '../../app/components/ui/checkbox'

describe('Checkbox', () => {
  test('renders with data-slot and accepts className', () => {
    render(<Checkbox className="my-check" />)
    const cb = screen.getByRole('checkbox')
    expect(cb).toBeInTheDocument()
    expect(cb).toHaveAttribute('data-slot', 'checkbox')
    expect(cb.className).toContain('my-check')
  })

  test('toggles checked state on click and exposes indicator', () => {
    render(<Checkbox />)
    const cb = screen.getByRole('checkbox')
    expect(cb).toBeInTheDocument()
    fireEvent.click(cb)
    expect(cb).toHaveAttribute('aria-checked', 'true')
    const indicator = cb.querySelector('[data-slot="checkbox-indicator"]')
    expect(indicator).toBeTruthy()
  })
})
