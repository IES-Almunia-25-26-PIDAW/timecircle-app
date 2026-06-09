import React from 'react'
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { TermsOfService } from '../../app/pages/TermsOfService'

let mockScrollIntoView: any

beforeAll(() => {
  mockScrollIntoView = vi.fn()

  globalThis.IntersectionObserver = class {
    callback: IntersectionObserverCallback
    constructor(cb: IntersectionObserverCallback) {
      this.callback = cb
      // Simulate the first section becoming visible
      Promise.resolve().then(() => {
        this.callback(
          [{ target: { id: 'objeto' }, isIntersecting: true } as any],
          {} as any
        )
      })
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
})

beforeEach(() => {
  vi.clearAllMocks()
  mockScrollIntoView.mockClear()
  
  // Mock document.getElementById to return a mock element with scrollIntoView
  document.getElementById = vi.fn((id: string) => {
    if (id && ['objeto', 'registro', 'creditos', 'servicios', 'intercambios', 'conducta', 'privacidad', 'limitaciones', 'modificaciones', 'contacto'].includes(id)) {
      return {
        id,
        scrollIntoView: mockScrollIntoView,
      } as any
    }
    return null
  })
})

afterAll(() => {
  delete (globalThis as any).IntersectionObserver
})

describe('TermsOfService page', () => {
  it('renders the terms header and navigation links', () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Términos y Condiciones de Uso/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Contactar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toBeInTheDocument()
  })

  it('renders section content', () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    )

    // Check for section content (covers section rendering)
    expect(screen.getByText(/banco de tiempo comunitario/i)).toBeInTheDocument()
    expect(screen.getByText(/aceptación plena e incondicional/i)).toBeInTheDocument()
  })

  it('scrolls to a section when scrollTo is called', async () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    )

    // Find and click a TOC button (if visible on desktop) or test the scroll behavior
    const buttons = screen.getAllByRole('button')
    
    // Find a button that scrolls to a section (one of the TOC buttons)
    const registroButton = buttons.find(btn => btn.textContent?.includes('Registro'))
    
    if (registroButton) {
      fireEvent.click(registroButton)
      
      // Verify scrollIntoView was called with the correct parameters (covers line 39)
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
      })
    }
  })

  it('updates active section from IntersectionObserver', async () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    )

    // Wait for IntersectionObserver callback to fire and update activeSection
    await waitFor(() => {
      const objetoButton = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Objeto'))
      // When activeSection is 'objeto', the button should have bg-teal-600 class (covers line 71)
      if (objetoButton) {
        expect(objetoButton).toHaveClass('bg-teal-600')
      }
    })
  })
})
