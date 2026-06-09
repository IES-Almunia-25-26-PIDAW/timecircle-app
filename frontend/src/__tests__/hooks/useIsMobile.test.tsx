import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useIsMobile } from '../../app/components/ui/use-mobile'

describe('useIsMobile hook', () => {
  const originalInnerWidth = globalThis.innerWidth

  const createMatchMediaMock = (matches: boolean) => ({
    matches,
    media: '',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })

  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.innerWidth = originalInnerWidth
  })

  it('returns true on mobile width', async () => {
    vi.stubGlobal('innerWidth', 500)
    vi.stubGlobal('matchMedia', () => createMatchMediaMock(true))

    const { result } = renderHook(() => useIsMobile())
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('returns false on desktop width', async () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('matchMedia', () => createMatchMediaMock(false))

    const { result } = renderHook(() => useIsMobile())
    await waitFor(() => expect(result.current).toBe(false))
  })
})
