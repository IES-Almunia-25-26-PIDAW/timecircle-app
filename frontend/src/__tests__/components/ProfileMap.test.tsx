import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileMap from '../../app/components/ProfileMap'

if (!(globalThis as any).__PROFILE_MAP_MOCKS) {
  ;(globalThis as any).__PROFILE_MAP_MOCKS = {
    mapInstances: [] as any[],
    viewInstances: [] as any[],
    tileLayerInstances: [] as any[],
    vectorLayerInstances: [] as any[],
    vectorSourceInstances: [] as any[],
    featureInstances: [] as any[],
    pointInstances: [] as any[],
    circleGeomInstances: [] as any[],
    styleInstances: [] as any[],
    circleStyleInstances: [] as any[],
    fillInstances: [] as any[],
    strokeInstances: [] as any[],
    fromLonLat: vi.fn((coords: [number, number]) => coords),
  }
}

const mocks = (globalThis as any).__PROFILE_MAP_MOCKS as {
  mapInstances: any[]
  viewInstances: any[]
  tileLayerInstances: any[]
  vectorLayerInstances: any[]
  vectorSourceInstances: any[]
  featureInstances: any[]
  pointInstances: any[]
  circleGeomInstances: any[]
  styleInstances: any[]
  circleStyleInstances: any[]
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
    getView() {
      return this.opts.view
    }
  },
}))
vi.mock('ol/View', () => ({
  default: class {
    opts: any
    animate = vi.fn()
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
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.vectorSourceInstances.push(this)
    }
    clear() {
      if (this.opts && Array.isArray(this.opts.features)) this.opts.features.length = 0
    }
    addFeature(f: any) {
      if (!this.opts) this.opts = {}
      if (!Array.isArray(this.opts.features)) this.opts.features = []
      this.opts.features.push(f)
    }
  },
}))
vi.mock('ol/Feature', () => ({
  default: class {
    geometry: any
    style: any = null
    constructor(geometry: any) {
      this.geometry = geometry
      mocks.featureInstances.push(this)
    }
    setStyle(style: any) {
      this.style = style
    }
  },
}))
vi.mock('ol/geom/Point', () => ({
  default: class {
    coord: any
    constructor(coord: any) {
      this.coord = coord
      mocks.pointInstances.push(this)
    }
  },
}))
vi.mock('ol/geom/Circle', () => ({
  default: class {
    coord: any
    radius: number
    constructor(coord: any, radius: number) {
      this.coord = coord
      this.radius = radius
      mocks.circleGeomInstances.push(this)
    }
  },
}))
vi.mock('ol/proj', () => ({
  fromLonLat: (coords: [number, number]) => mocks.fromLonLat(coords),
}))
vi.mock('ol/style/Style', () => ({
  default: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.styleInstances.push(this)
    }
  },
}))
vi.mock('ol/style/Circle', () => ({
  default: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.circleStyleInstances.push(this)
    }
  },
}))
vi.mock('ol/style/Fill', () => ({
  default: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.fillInstances.push(this)
    }
  },
}))
vi.mock('ol/style/Stroke', () => ({
  default: class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      mocks.strokeInstances.push(this)
    }
  },
}))

describe('ProfileMap', () => {
  beforeEach(() => {
    mocks.mapInstances.length = 0
    mocks.viewInstances.length = 0
    mocks.tileLayerInstances.length = 0
    mocks.vectorLayerInstances.length = 0
    mocks.vectorSourceInstances.length = 0
    mocks.featureInstances.length = 0
    mocks.pointInstances.length = 0
    mocks.circleGeomInstances.length = 0
    mocks.styleInstances.length = 0
    mocks.circleStyleInstances.length = 0
    mocks.fillInstances.length = 0
    mocks.strokeInstances.length = 0
    mocks.fromLonLat.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes the map, marker, layers, and container styles', async () => {
    const { container } = render(<ProfileMap lat={40.4} lon={-3.7} height={240} />)

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
      expect(mocks.viewInstances.length).toBe(1)
      expect(mocks.vectorSourceInstances.length).toBe(1)
    })

    expect(mocks.fromLonLat).toHaveBeenCalledWith([-3.7, 40.4])
    expect(mocks.viewInstances[0].opts).toEqual({ center: [-3.7, 40.4], zoom: 13 })
    expect(mocks.mapInstances[0].opts.target).toBe(container.firstElementChild)
    expect(mocks.mapInstances[0].opts.controls).toEqual([])
    expect(mocks.mapInstances[0].opts.layers).toEqual([
      mocks.tileLayerInstances[0],
      mocks.vectorLayerInstances[0],
    ])
    expect(mocks.pointInstances[0].coord).toEqual([-3.7, 40.4])
    expect(mocks.featureInstances[0].geometry).toBe(mocks.pointInstances[0])
    expect(mocks.vectorSourceInstances[0].opts.features).toEqual([mocks.featureInstances[0]])
    expect(container.firstElementChild).toHaveStyle({
      width: '100%',
      height: '240px',
      borderRadius: '12px',
      overflow: 'hidden',
    })
  })

  it('uses default sizing and accepts string heights', async () => {
    const { container, rerender } = render(<ProfileMap lat={1} lon={2} />)

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
    })

    expect(container.firstElementChild).toHaveStyle({ height: '320px' })

    rerender(<ProfileMap lat={1} lon={2} height="45vh" />)

    expect(container.firstElementChild).toHaveStyle({ height: '45vh' })
  })

  it('applies the marker style', async () => {
    render(<ProfileMap lat={40} lon={-3} zoom={10} />)

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(1)
    })

    expect(mocks.circleStyleInstances[0].opts.radius).toBe(8)
    expect(mocks.circleStyleInstances[0].opts.fill).toBe(mocks.fillInstances[0])
    expect(mocks.circleStyleInstances[0].opts.stroke).toBe(mocks.strokeInstances[0])
    expect(mocks.fillInstances[0].opts).toEqual({ color: '#38bdf8' })
    expect(mocks.strokeInstances[0].opts).toEqual({ color: '#ffffff', width: 2 })
    expect(mocks.styleInstances[0].opts.image).toBe(mocks.circleStyleInstances[0])
    expect(mocks.featureInstances[0].style).toBe(mocks.styleInstances[0])
  })

  it('displays 0.5 km privacy circle when shareExactLocation is false', async () => {
    render(<ProfileMap lat={40} lon={-3} zoom={10} shareExactLocation={false} />)

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(1)
      expect(mocks.circleGeomInstances.length).toBe(1)
    })

    const circleGeom = mocks.circleGeomInstances[0]
    expect(circleGeom.coord).toEqual([-3, 40])
    expect(circleGeom.radius).toBeGreaterThan(0)

    const style = mocks.styleInstances[0]
    expect(style.opts.fill).toBeDefined()
    expect(style.opts.stroke).toBeDefined()
    expect(style.opts.stroke.opts.lineDash).toEqual([5, 5])
  })

  it('animates the existing map view when coordinates or zoom change', async () => {
    const { rerender } = render(<ProfileMap lat={40} lon={-3} zoom={11} height="50vh" />)

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
    })

    mocks.viewInstances[0].animate.mockClear()
    rerender(<ProfileMap lat={41} lon={-4} zoom={12} height="50vh" />)

    expect(mocks.mapInstances.length).toBe(1)
    expect(mocks.viewInstances[0].animate).toHaveBeenCalledWith({ center: [-4, 41], zoom: 12 })
  })

  it('clears the map target on unmount', async () => {
    const { unmount } = render(<ProfileMap lat={40} lon={-3} />)

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
    })

    unmount()

    expect(mocks.mapInstances[0].setTarget).toHaveBeenCalled()
  })

  it('logs cleanup failures without throwing', async () => {
    const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const { unmount } = render(<ProfileMap lat={40} lon={-3} />)

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
    })

    const error = new Error('cleanup failed')
    mocks.mapInstances[0].setTarget.mockImplementation(() => {
      throw error
    })

    unmount()

    expect(consoleDebug).toHaveBeenCalledWith('ProfileMap: cleanup failed', error)
    consoleDebug.mockRestore()
  })
})
