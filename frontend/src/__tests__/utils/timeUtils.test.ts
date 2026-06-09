import { describe, it, expect } from 'vitest'

// Simple utility function for testing
function calculateTimeDifference(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60) // Returns difference in hours
}

function formatTimeDisplay(hours: number): string {
  if (hours < 1) return 'Less than 1 hour'
  if (hours === 1) return '1 hour'
  return `${Math.round(hours)} hours`
}

describe('Time utilities', () => {
  it('should calculate time difference in hours correctly', () => {
    const date1 = new Date('2026-01-01T10:00:00')
    const date2 = new Date('2026-01-01T12:00:00')

    const diff = calculateTimeDifference(date1, date2)
    expect(diff).toBe(2)
  })

  it('should return absolute difference regardless of order', () => {
    const date1 = new Date('2026-01-01T10:00:00')
    const date2 = new Date('2026-01-01T08:00:00')

    const diff = calculateTimeDifference(date1, date2)
    expect(diff).toBe(2)
  })

  it('should format time display correctly', () => {
    expect(formatTimeDisplay(0.5)).toBe('Less than 1 hour')
    expect(formatTimeDisplay(1)).toBe('1 hour')
    expect(formatTimeDisplay(2.5)).toBe('3 hours')
    expect(formatTimeDisplay(24)).toBe('24 hours')
  })

  it('should handle zero difference', () => {
    const date1 = new Date('2026-01-01T10:00:00')
    const diff = calculateTimeDifference(date1, date1)
    expect(diff).toBe(0)
  })
})
