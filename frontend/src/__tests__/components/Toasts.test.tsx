import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Toasts, { pushToast, toastEventName } from '../../app/components/Toasts'

describe('Toasts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders nothing until a toast event is received', () => {
    const { container } = render(<Toasts />)

    expect(container.firstChild).toBeNull()
  })

  it('pushes info, success, and error toasts with the expected styling', async () => {
    render(<Toasts />)

    act(() => {
      pushToast('Plain update')
      pushToast('Saved successfully', 'success')
      pushToast('Something failed', 'error')
    })

    // state updates are flushed synchronously inside the act above, use
    // synchronous queries to avoid depending on Testing Library's timers
    expect(screen.getByText('Plain update')).toHaveClass('bg-slate-800', 'text-white')
    expect(screen.getByText('Saved successfully')).toHaveClass('bg-green-600', 'text-white')
    expect(screen.getByText('Something failed')).toHaveClass('bg-red-600', 'text-white')
  })

  it('removes toasts automatically after the timeout', async () => {
    render(<Toasts />)

    act(() => {
      pushToast('Temporary toast')
    })

    // synchronous assertion for presence (state update flushed by act)
    expect(screen.getByText('Temporary toast')).toBeInTheDocument()

    // advance the fake timers to trigger the removal timeout
    act(() => {
      vi.advanceTimersByTime(4500)
      // flush any remaining scheduled timers to ensure removal runs
      vi.runAllTimers()
    })

    // state changes from the timer callback are flushed by the act above
    expect(screen.queryByText('Temporary toast')).not.toBeInTheDocument()
  })

  it('registers and removes the global toast listener', () => {
    const addListener = vi.spyOn(globalThis, 'addEventListener')
    const removeListener = vi.spyOn(globalThis, 'removeEventListener')

    const { unmount } = render(<Toasts />)

    expect(addListener).toHaveBeenCalledWith(toastEventName, expect.any(Function))

    unmount()

    expect(removeListener).toHaveBeenCalledWith(toastEventName, expect.any(Function))
  })
})
