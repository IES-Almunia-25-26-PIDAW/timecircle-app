import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '../../app/components/ui/label'

describe('Label component', () => {
  it('renders children and forwards htmlFor', () => {
    render(<Label htmlFor="username">Nombre de usuario</Label>)

    const label = screen.getByText('Nombre de usuario')
    expect(label).toBeInTheDocument()
    expect(label.closest('label')).toHaveAttribute('for', 'username')
  })
})
