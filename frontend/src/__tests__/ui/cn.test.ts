import { describe, it, expect } from 'vitest'
import { cn } from '../../app/components/ui/utils'

describe('ui utils', () => {
  it('merges class names and removes duplicates', () => {
    expect(cn('btn', 'btn-primary', 'btn')).toBe('btn btn-primary btn')
  })

  it('handles conditional class names correctly', () => {
    expect(cn('btn', false && 'hidden', 'active')).toBe('btn active')
  })
})
