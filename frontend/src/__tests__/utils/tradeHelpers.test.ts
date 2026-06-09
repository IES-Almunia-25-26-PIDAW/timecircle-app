import { describe, it, expect } from 'vitest'
import canRequestStart from '../../app/utils/tradeHelpers'

describe('tradeHelpers - canRequestStart', () => {
  it('should allow request when no scheduled date is provided', () => {
    const result = canRequestStart({})
    expect(result.allowed).toBe(true)
    expect(result.tooSoon).toBe(false)
  })

  it('should allow request when scheduled date is invalid', () => {
    const result = canRequestStart({ scheduledDate: 'invalid-date' })
    expect(result.allowed).toBe(true)
    expect(result.tooSoon).toBe(false)
  })

  it('should deny request if current time is more than 1 day before scheduled time', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 2) // 2 days in the future

    const result = canRequestStart({ scheduledDate: futureDate.toISOString() })
    expect(result.allowed).toBe(false)
    expect(result.tooSoon).toBe(true)
    expect(result.message).toContain('muy pronto')
  })

  it('should allow request when within the allowed time window', () => {
    const nearFutureDate = new Date()
    nearFutureDate.setHours(nearFutureDate.getHours() + 1) // 1 hour in future

    const result = canRequestStart({ scheduledDate: nearFutureDate.toISOString() })
    expect(result.allowed).toBe(true)
    expect(result.tooSoon).toBe(false)
  })

  it('should allow request when past the scheduled time', () => {
    const pastDate = new Date()
    pastDate.setHours(pastDate.getHours() - 1) // 1 hour in past

    const result = canRequestStart({ scheduledDate: pastDate.toISOString() })
    expect(result.allowed).toBe(true)
    expect(result.tooSoon).toBe(false)
  })
})
