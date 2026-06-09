import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

if (!(globalThis as any).__GEO_OVERVIEW_MAP_MOCKS) {
  ;(globalThis as any).__GEO_OVERVIEW_MAP_MOCKS = {
    mapInstances: [] as any[],
    viewInstances: [] as any[],
    tileLayerInstances: [] as any[],
    vectorLayerInstances: [] as any[],
    vectorSources: [] as any[],
    featureInstances: [] as any[],
    circleInstances: [] as any[],
    styleInstances: [] as any[],
    fillInstances: [] as any[],
    strokeInstances: [] as any[],
    fromLonLat: vi.fn((coords: [number, number]) => coords),
  }
}

const mocks = (globalThis as any).__GEO_OVERVIEW_MAP_MOCKS as {
  mapInstances: any[]
  viewInstances: any[]
  tileLayerInstances: any[]
  vectorLayerInstances: any[]
  vectorSources: any[]
  featureInstances: any[]
  circleInstances: any[]
  styleInstances: any[]
  fillInstances: any[]
  strokeInstances: any[]
  fromLonLat: ReturnType<typeof vi.fn>
}

vi.mock('ol/Map', () => ({
  default: class {
    opts: any
    setTarget = vi.fn()
    constructor(opts: any) {
      this.opts = opts
      mocks.mapInstances.push(this)
    }
  },
}))
vi.mock('ol/View', () => ({
  default: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.viewInstances.push(this)
    }
  },
}))
vi.mock('ol/layer/Tile', () => ({
  default: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.tileLayerInstances.push(this)
    }
  },
}))
vi.mock('ol/source/OSM', () => ({ default: vi.fn() }))
vi.mock('ol/layer/Vector', () => ({
  default: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.vectorLayerInstances.push(this)
    }
  },
}))
vi.mock('ol/source/Vector', () => ({
  default: class {
    clear = vi.fn()
    features: any[] = []
    constructor() {
      mocks.vectorSources.push(this)
    }
    addFeature(feature: any) {
      this.features.push(feature)
    }
  },
}))
vi.mock('ol/Feature', () => ({
  default: class {
    opts: any
    style: any = null
    constructor(opts: any) {
      this.opts = opts
      mocks.featureInstances.push(this)
    }
    setStyle(style: any) {
      this.style = style
    }
  },
}))
vi.mock('ol/proj', () => ({
  fromLonLat: (coords: [number, number]) => mocks.fromLonLat(coords),
}))
vi.mock('ol/geom/Circle', () => ({
  default: class {
    coord: any
    radius: number
    constructor(coord: any, radius: number) {
      this.coord = coord
      this.radius = radius
      mocks.circleInstances.push(this)
    }
  },
}))
vi.mock('ol/style', () => ({
  Style: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.styleInstances.push(this)
    }
  },
  Fill: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.fillInstances.push(this)
    }
  },
  Stroke: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.strokeInstances.push(this)
    }
  },
}))

import GeoOverviewMap from '../../app/components/GeoOverviewMap'

describe('GeoOverviewMap', () => {
  beforeEach(() => {
    mocks.mapInstances.length = 0
    mocks.viewInstances.length = 0
    mocks.tileLayerInstances.length = 0
    mocks.vectorLayerInstances.length = 0
    mocks.vectorSources.length = 0
    mocks.featureInstances.length = 0
    mocks.circleInstances.length = 0
    mocks.styleInstances.length = 0
    mocks.fillInstances.length = 0
    mocks.strokeInstances.length = 0
    mocks.fromLonLat.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes the map and sets the target container', async () => {
    const { container } = render(<GeoOverviewMap height={250} />)

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
      expect(mocks.viewInstances.length).toBe(1)
      expect(mocks.vectorSources.length).toBe(1)
    })

    expect(mocks.mapInstances[0].opts.target).toBe(container.querySelector('div'))
    expect(mocks.mapInstances[0].opts.controls).toEqual([])
    expect(mocks.fromLonLat).toHaveBeenCalledWith([-3.7038, 40.4168])
    expect(container.firstElementChild).toHaveStyle({ height: '250px' })
  })

  it('uses custom center, zoom, and string height when provided', async () => {
    const { container } = render(
      <GeoOverviewMap center={{ lat: 51.5, lon: -0.12 }} zoom={12} height="42vh" />,
    )

    await waitFor(() => {
      expect(mocks.viewInstances.length).toBe(1)
    })

    expect(mocks.fromLonLat).toHaveBeenCalledWith([-0.12, 51.5])
    expect(mocks.viewInstances[0].opts).toEqual({ center: [-0.12, 51.5], zoom: 12 })
    expect(container.firstElementChild).toHaveStyle({ height: '42vh' })
  })

  it('adds user and service cells as features and clears the source on update', async () => {
    const userCells = [{ lat: 40, lon: -3, count: 2 }]
    const serviceCells = [{ lat: 41, lon: -4, count: 3 }]

    render(<GeoOverviewMap userCells={userCells} serviceCells={serviceCells} />)

    await waitFor(() => {
      expect(mocks.vectorSources.length).toBe(1)
      expect(mocks.vectorSources[0].clear).toHaveBeenCalled()
      expect(mocks.featureInstances.length).toBe(2)
    })

    expect(mocks.circleInstances[0].radius).toBe(1200)
    expect(mocks.circleInstances[1].radius).toBe(1800)
    expect(mocks.circleInstances[0].coord).toEqual([-3, 40])
    expect(mocks.circleInstances[1].coord).toEqual([-4, 41])
    expect(mocks.styleInstances[0].opts.fill.opts.color).toBe('rgba(16,185,129,0.18)')
    expect(mocks.styleInstances[1].opts.fill.opts.color).toBe('rgba(56,189,248,0.12)')
    expect(mocks.strokeInstances[0].opts).toEqual({ color: '#10b981', width: 2 })
    expect(mocks.strokeInstances[1].opts).toEqual({ color: '#38bdf8', width: 2 })
    expect(mocks.vectorSources[0].features).toEqual(mocks.featureInstances)
  })

  it('falls back to minimum radii and refreshes features on prop updates', async () => {
    const { rerender } = render(
      <GeoOverviewMap
        userCells={[{ lat: 10, lon: 20, count: 0 }]}
        serviceCells={[{ lat: 11, lon: 21 }]}
      />,
    )

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(2)
    })

    expect(mocks.circleInstances[0].radius).toBe(1200)
    expect(mocks.circleInstances[1].radius).toBe(1000)
    expect(mocks.vectorSources[0].clear).toHaveBeenCalledTimes(1)

    rerender(<GeoOverviewMap userCells={[{ lat: 12, lon: 22, count: 5 }]} serviceCells={[]} />)

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(3)
    })

    expect(mocks.vectorSources[0].clear).toHaveBeenCalledTimes(2)
    expect(mocks.circleInstances[2].radius).toBe(3000)
    expect(mocks.circleInstances[2].coord).toEqual([22, 12])
  })

  it('cleans up the map target on unmount', async () => {
    const { unmount } = render(<GeoOverviewMap />)

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
    })

    unmount()
    expect(mocks.mapInstances[0].setTarget).toHaveBeenCalled()
  })

  it('logs cleanup errors when clearing the map target fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { unmount } = render(<GeoOverviewMap />)

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
    })

    const error = new Error('target cleanup failed')
    mocks.mapInstances[0].setTarget.mockImplementation(() => {
      throw error
    })

    unmount()

    expect(consoleError).toHaveBeenCalledWith('Error occurred while clearing map target', error)
    consoleError.mockRestore()
  })
})
