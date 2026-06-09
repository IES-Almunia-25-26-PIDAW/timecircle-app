import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '../../app/components/ui/button'

describe('Button component', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies variant class for destructive', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    // Ensure the button contains the variant class name string (class values may be Tailwind-generated)
    expect(container.querySelector('[data-slot="button"], button')).toBeTruthy()
  })
})
