import React, { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import { usePolling } from '../../app/hooks/usePolling'

function PollingComponent({ interval, enabled }: { interval: number; enabled: boolean }) {
  const [count, setCount] = useState(0)

  usePolling(() => {
    setCount((prev) => prev + 1)
  }, interval, enabled)

  return <div>Count: {count}</div>
}

describe('usePolling hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs the callback immediately and on interval', () => {
    render(<PollingComponent interval={1000} enabled={true} />)

    expect(screen.getByText(/Count:/)).toHaveTextContent('Count: 1')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/Count:/)).toHaveTextContent('Count: 2')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText(/Count:/)).toHaveTextContent('Count: 4')
  })

  it('does not poll when disabled', () => {
    render(<PollingComponent interval={1000} enabled={false} />)

    expect(screen.getByText(/Count:/)).toHaveTextContent('Count: 0')

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText(/Count:/)).toHaveTextContent('Count: 0')
  })
})
