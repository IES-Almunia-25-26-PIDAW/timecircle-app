import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NearbyServicesMap from '../../app/components/NearbyServicesMap'

if (!(globalThis as any).__NEARBY_SERVICES_MAP_MOCKS) {
  ;(globalThis as any).__NEARBY_SERVICES_MAP_MOCKS = {
    mapInstances: [] as any[],
    viewInstances: [] as any[],
    tileLayerInstances: [] as any[],
    vectorLayerInstances: [] as any[],
    vectorSources: [] as any[],
    featureInstances: [] as any[],
    pointInstances: [] as any[],
    styleInstances: [] as any[],
    circleStyleInstances: [] as any[],
    fillInstances: [] as any[],
    strokeInstances: [] as any[],
    fromLonLat: vi.fn((coords: [number, number]) => coords),
  }
}

const mocks = (globalThis as any).__NEARBY_SERVICES_MAP_MOCKS as {
  mapInstances: any[]
  viewInstances: any[]
  tileLayerInstances: any[]
  vectorLayerInstances: any[]
  vectorSources: any[]
  featureInstances: any[]
  pointInstances: any[]
  styleInstances: any[]
  circleStyleInstances: any[]
  fillInstances: any[]
  strokeInstances: any[]
  fromLonLat: ReturnType<typeof vi.fn>
}

vi.mock('ol/Map', () => ({
  default: class {
    opts: any
    handlers: Record<string, any[]> = {}
    featuresAtPixel: any[] = []
    targetElement: HTMLElement
    setTarget = vi.fn()
    constructor(opts: any) {
      this.opts = opts
      this.targetElement = opts.target
      mocks.mapInstances.push(this)
    }
    on(eventName: string, handler: any) {
      this.handlers[eventName] = this.handlers[eventName] || []
      this.handlers[eventName].push(handler)
    }
    un(eventName: string, handler: any) {
      this.handlers[eventName] = (this.handlers[eventName] || []).filter((h) => h !== handler)
    }
    getTargetElement() {
      return this.targetElement
    }
    getView() {
      return this.opts.view
    }
    forEachFeatureAtPixel(_pixel: any, cb: any) {
      this.featuresAtPixel.forEach((feature) => cb(feature))
    }
    emit(eventName: string, event: any = { pixel: [0, 0] }) {
      ;(this.handlers[eventName] || []).forEach((handler) => handler(event))
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
    features: any[] = []
    clear = vi.fn(() => {
      this.features.length = 0
    })
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
    geometry: any
    props: Record<string, any> = {}
    style: any = null
    constructor(geometry: any) {
      this.geometry = geometry
      mocks.featureInstances.push(this)
    }
    set(key: string, value: any) {
      this.props[key] = value
    }
    get(key: string) {
      return this.props[key]
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

const service = (overrides: Record<string, any> = {}) => ({
  id: 'svc-1',
  title: 'Fix a bike',
  type: 'offer',
  category: { name: 'Repairs' },
  credits: 2,
  distance_km: 1.5,
  user: {
    name: 'Ada',
    avatar: '/ada.png',
    latitude: 40,
    longitude: -3,
    rating: '4.75',
  },
  ...overrides,
})

const renderMap = (props: React.ComponentProps<typeof NearbyServicesMap> = {}, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<NearbyServicesMap {...props} />} />
        <Route path="/services/:id" element={<div>Service detail page</div>} />
      </Routes>
    </MemoryRouter>,
  )

const emitMapEvent = (map: any, eventName: string) => {
  act(() => {
    map.emit(eventName)
  })
}

describe('NearbyServicesMap', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mocks.mapInstances.length = 0
    mocks.viewInstances.length = 0
    mocks.tileLayerInstances.length = 0
    mocks.vectorLayerInstances.length = 0
    mocks.vectorSources.length = 0
    mocks.featureInstances.length = 0
    mocks.pointInstances.length = 0
    mocks.styleInstances.length = 0
    mocks.circleStyleInstances.length = 0
    mocks.fillInstances.length = 0
    mocks.strokeInstances.length = 0
    mocks.fromLonLat.mockClear()
    delete (globalThis as any).__tc_map
    delete (globalThis as any).__tc_vector
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('initializes the map with defaults and creates features only for located services', async () => {
    const locatedOffer = service()
    const locatedRequest = service({
      id: 'svc-2',
      type: 'request',
      user: { username: 'beatriz', latitude: 41, longitude: -4, rating: 5 },
    })

    const { container } = renderMap({
      services: [locatedOffer, service({ id: 'missing', user: { name: 'No coords' } }), locatedRequest],
      height: 280,
    })

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
      expect(mocks.vectorSources.length).toBe(1)
      expect(mocks.featureInstances.length).toBe(2)
    })

    expect(mocks.mapInstances[0].opts.target).toBe(container.querySelector('.relative > div'))
    expect(mocks.mapInstances[0].opts.controls).toEqual([])
    expect(mocks.viewInstances[0].opts).toEqual({ center: [-3.7038, 40.4168], zoom: 12 })
    expect(mocks.pointInstances[0].coord).toEqual([-3, 40])
    expect(mocks.pointInstances[1].coord).toEqual([-4, 41])
    expect(mocks.fillInstances[0].opts.color).toBe('#38bdf8')
    expect(mocks.fillInstances[1].opts.color).toBe('#8b5cf6')
    expect(mocks.strokeInstances[0].opts).toEqual({ color: '#ffffff', width: 2 })
    expect((globalThis as any).__tc_map).toBe(mocks.mapInstances[0])
    expect(container.firstElementChild).toHaveStyle({ height: '280px' })
  })

  it('shows and hides a single service card on pointer movement', async () => {
    renderMap({ services: [service()] })

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(1)
    })

    const map = mocks.mapInstances[0]
    map.featuresAtPixel = [mocks.featureInstances[0]]
    emitMapEvent(map, 'pointermove')

    expect(await screen.findByRole('dialog', { name: /servicios cercanos/i })).toHaveAttribute(
      'data-service-id',
      'svc-1',
    )
    expect(screen.getByText('Fix a bike')).toBeInTheDocument()
    expect(screen.getByText('Repairs · Ada')).toBeInTheDocument()
    expect(screen.getByText('2 cr')).toBeInTheDocument()
    expect(screen.getByText('1.5 km')).toBeInTheDocument()
    expect(screen.getByText('★ 4.8')).toBeInTheDocument()
    expect(map.getTargetElement().style.cursor).toBe('pointer')

    map.featuresAtPixel = []
    emitMapEvent(map, 'pointermove')
    expect(map.getTargetElement().style.cursor).toBe('')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /servicios cercanos/i })).not.toBeInTheDocument()
    })
  })

  it('hides the card when the map element is left', async () => {
    renderMap({ services: [service()] })

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(1)
    })

    const map = mocks.mapInstances[0]
    map.featuresAtPixel = [mocks.featureInstances[0]]
    emitMapEvent(map, 'pointermove')

    expect(await screen.findByRole('dialog', { name: /servicios cercanos/i })).toBeInTheDocument()
    map.getTargetElement().style.cursor = 'pointer'

    fireEvent.mouseLeave(map.opts.target)

    expect(map.getTargetElement().style.cursor).toBe('')
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /servicios cercanos/i })).not.toBeInTheDocument()
    })
  })

  it('navigates when clicking a single feature', async () => {
    renderMap({ services: [service()] })

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(1)
    })

    const map = mocks.mapInstances[0]
    map.featuresAtPixel = [mocks.featureInstances[0]]
    emitMapEvent(map, 'singleclick')

    expect(await screen.findByText('Service detail page')).toBeInTheDocument()
  })

  it('pins multiple services on click and navigates from a pinned card item', async () => {
    renderMap({
      services: [
        service(),
        service({
          id: 'svc-2',
          title: 'Cook dinner',
          category: { name: 'Food' },
          user: { username: 'bea', latitude: 40, longitude: -3 },
        }),
      ],
    })

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(2)
    })

    const map = mocks.mapInstances[0]
    map.featuresAtPixel = mocks.featureInstances
    emitMapEvent(map, 'singleclick')

    expect(await screen.findByText('2 servicios aquí')).toBeInTheDocument()
    expect(screen.getByText('Fix a bike')).toBeInTheDocument()
    expect(screen.getByText('Cook dinner')).toBeInTheDocument()

    map.featuresAtPixel = []
    emitMapEvent(map, 'pointermove')
    expect(screen.getByText('2 servicios aquí')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cook dinner/i }))

    expect(await screen.findByText('Service detail page')).toBeInTheDocument()
  })

  it('unpins and hides the card when clicking empty map space', async () => {
    renderMap({ services: [service(), service({ id: 'svc-2', title: 'Teach piano' })] })

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(2)
    })

    const map = mocks.mapInstances[0]
    map.featuresAtPixel = mocks.featureInstances
    emitMapEvent(map, 'singleclick')
    expect(await screen.findByRole('dialog', { name: /servicios cercanos/i })).toBeInTheDocument()

    map.featuresAtPixel = []
    emitMapEvent(map, 'singleclick')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /servicios cercanos/i })).not.toBeInTheDocument()
    })
  })

  it('handles dialog pointer, touch, blur, and Escape events once the card ref is attached', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <NearbyServicesMap services={[service(), service({ id: 'svc-2', title: 'Teach piano' })]} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(2)
    })

    const map = mocks.mapInstances[0]
    map.featuresAtPixel = mocks.featureInstances
    emitMapEvent(map, 'singleclick')

    await screen.findByRole('dialog', { name: /servicios cercanos/i })

    rerender(
      <MemoryRouter>
        <NearbyServicesMap
          height={361}
          services={[service(), service({ id: 'svc-2', title: 'Teach piano' })]}
        />
      </MemoryRouter>,
    )

    let card = await screen.findByRole('dialog', { name: /servicios cercanos/i })

    fireEvent.focus(card)
    fireEvent.pointerEnter(card)
    fireEvent.touchStart(card)
    fireEvent.pointerLeave(card)
    fireEvent.touchEnd(card)

    expect(screen.getByRole('dialog', { name: /servicios cercanos/i })).toBeInTheDocument()

    fireEvent.keyDown(card, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /servicios cercanos/i })).not.toBeInTheDocument()
    })

    map.featuresAtPixel = [mocks.featureInstances[0]]
    emitMapEvent(map, 'pointermove')
    card = await screen.findByRole('dialog', { name: /servicios cercanos/i })

    rerender(
      <MemoryRouter>
        <NearbyServicesMap height={362} services={[service()]} />
      </MemoryRouter>,
    )

    card = await screen.findByRole('dialog', { name: /servicios cercanos/i })
    fireEvent.blur(card)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /servicios cercanos/i })).not.toBeInTheDocument()
    })
  })

  it('updates markers and recenters when props change', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <NearbyServicesMap center={{ lat: 50, lon: 2 }} zoom={7} services={[service()]} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mocks.featureInstances.length).toBe(1)
    })

    rerender(
      <MemoryRouter>
        <NearbyServicesMap
          center={{ lat: 51, lon: 3 }}
          zoom={7}
          services={[service({ id: 'svc-3', user: { latitude: 42, longitude: -5 } })]}
        />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mocks.vectorSources[0].clear).toHaveBeenCalledTimes(2)
      expect(mocks.featureInstances.length).toBe(2)
    })

    expect(mocks.viewInstances[0].animate).toHaveBeenCalledWith({ center: [3, 51] })
    expect(mocks.pointInstances[1].coord).toEqual([-5, 42])
  })

  it('removes listeners and clears the map target on unmount', async () => {
    const { container, unmount } = renderMap({ services: [service()] })

    await waitFor(() => {
      expect(mocks.mapInstances.length).toBe(1)
    })

    const map = mocks.mapInstances[0]
    const removeListener = vi.spyOn(map.opts.target, 'removeEventListener')

    unmount()

    expect(map.handlers.pointermove).toEqual([])
    expect(map.handlers.singleclick).toEqual([])
    expect(removeListener).toHaveBeenCalledWith('mouseleave', expect.any(Function))
    expect(map.setTarget).toHaveBeenCalled()
  })
})
