import { describe, it, expect } from 'vitest'
import { CATEGORIES, API_CAT_TO_SLUG, SLUG_TO_API_CAT } from '../../app/data/mockData'

describe('mockData helpers', () => {
  it('exports the expected categories array', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true)
    expect(CATEGORIES).toHaveLength(12)
    expect(CATEGORIES.map((item) => item.id)).toContain('hogar')
  })

  it('maps API category names to local slugs', () => {
    expect(API_CAT_TO_SLUG['Hogar']).toBe('hogar')
    expect(API_CAT_TO_SLUG['Tecnología']).toBe('tecnologia')
  })

  it('maps local slugs back to API categories', () => {
    expect(SLUG_TO_API_CAT['hogar']).toBe('Hogar')
    expect(SLUG_TO_API_CAT['cocina']).toBe('Cocina')
  })
})
