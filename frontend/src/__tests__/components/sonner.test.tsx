import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

// mock sonner Toaster render to inspect props
vi.mock('sonner', () => ({ Toaster: (p: any) => React.createElement('div', { 'data-sonner': JSON.stringify(p) }) }))

describe('Toaster (sonner) wrapper', () => {
  afterEach(() => vi.resetModules())

  test('passes theme from useTheme and spreads props', async () => {
    // mock next-themes useTheme
    vi.doMock('next-themes', () => ({ useTheme: () => ({ theme: 'dark' }) }))

    const mod = await import('../../app/components/ui/sonner')
    const { Toaster } = mod

    const { container } = render(<Toaster position="top-right" />)
    const el = container.querySelector('[data-sonner]')
    expect(el).toBeTruthy()

    const props = JSON.parse(el?.getAttribute('data-sonner') || '{}')
    // theme should be provided
    expect(props.theme).toBe('dark')
    // spread props should include position
    expect(props.position).toBe('top-right')
  })
})
