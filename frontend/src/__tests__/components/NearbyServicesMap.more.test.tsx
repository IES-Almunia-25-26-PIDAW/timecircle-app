import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ol dependencies used by the component
vi.mock('ol/Map', () => {
  return {
    default: class Map {
      handlers: Record<string, Function[]> = {}
      target: any
      layers: any[]
      constructor(opts: any) {
        this.target = opts.target
        this.layers = opts.layers || []
      }
      on(evt: string, handler: Function) {
        (this.handlers[evt] ||= []).push(handler)
      }
      un(evt: string, handler: Function) {
        const hs = this.handlers[evt] || []
        this.handlers[evt] = hs.filter(h => h !== handler)
      }
      getTargetElement() {
        if (this.target && this.target.nodeType) return this.target
        // create minimal element
        const el = document.createElement('div')
        el.style = ({} as any)
        return el
      }
      forEachFeatureAtPixel(_pixel: any, cb: Function) {
        // iterate features from first layer source if present
        const layer = this.layers.find((l: any) => l && l.source && l.source._features)
        const features = layer?.source?._features || []
        for (const f of features) {
          try { cb(f) } catch (e) { /* ignore */ }
        }
      }
      setTarget() {}
      getView() { return { animate: () => {} } }
    }
  }
})

vi.mock('ol/source/Vector', () => {
  return {
    default: class VectorSource {
      _features: any[] = []
      clear() { this._features = [] }
      addFeature(f: any) { this._features.push(f) }
    }
  }
})

vi.mock('ol/Feature', () => ({ default: class Feature { constructor(){} set(k:any,v:any){ (this as any)[k]=v } get(k:any){ return (this as any)[k] } setStyle(_s:any){ /* noop */ } } }))

vi.mock('ol/geom/Point', () => ({ default: function Point(){ return {} } }))
vi.mock('ol/proj', () => ({ fromLonLat: (v: any) => v }))
vi.mock('ol/layer/Vector', () => ({ default: class VectorLayer { source: any; constructor(opts: any){ this.source = opts.source } } }))
vi.mock('ol/layer/Tile', () => ({ default: class TileLayer { source: any; constructor(opts: any){ this.source = opts.source } } }))
vi.mock('ol/source/OSM', () => ({ default: class OSM { constructor(){ return {} } } }))
vi.mock('ol/style/Style', () => ({ default: function Style(){ return {} } }))
vi.mock('ol/style/Circle', () => ({ default: function CircleStyle(){ return {} } }))
vi.mock('ol/style/Fill', () => ({ default: function Fill(){ return {} } }))
vi.mock('ol/style/Stroke', () => ({ default: function Stroke(){ return {} } }))

// Mock navigate
const navigateMock = vi.fn()
vi.mock('react-router', () => ({ useNavigate: () => navigateMock }))

import NearbyServicesMap from '../../app/components/NearbyServicesMap'

describe('NearbyServicesMap additional branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not add features when services missing coords', () => {
    render(<NearbyServicesMap services={[{ id: 1, user: {} }]} />)
    // Access the vector source created by the mocked Map by searching globals
    const v = (globalThis as any).__tc_vector
    expect(v).toBeDefined()
    expect(v._features.length).toBe(0)
  })

  it('click single marker navigates to service and hides card', () => {
    const svc = { id: 42, title: 'S', user: { latitude: 1, longitude: 2 } }
    render(<NearbyServicesMap services={[svc]} />)
    const map = (globalThis as any).__tc_map
    const vector = (globalThis as any).__tc_vector
    // features were added from services
    expect(vector._features.length).toBe(1)
    // simulate click: call registered singleclick handler
    const handlers = map.handlers['singleclick'] || []
    expect(handlers.length).toBeGreaterThan(0)
    handlers.forEach((h: Function) => h({ pixel: [0,0] }))
    expect(navigateMock).toHaveBeenCalledWith('/services/42')
    // After clicking single marker, dialog should be hidden
    const dialog = document.querySelector('dialog')
    expect(dialog).toBeNull()
  })

  it('click multiple markers pins the card and pointermove does not change when pinned', async () => {
    const s1 = { id: 1, title: 'A', user: { latitude: 1, longitude: 2 } }
    const s2 = { id: 2, title: 'B', user: { latitude: 3, longitude: 4 } }
    render(<NearbyServicesMap services={[s1, s2]} />)
    const map = (globalThis as any).__tc_map
    const vector = (globalThis as any).__tc_vector
    expect(vector._features.length).toBe(2)
    // click to pin multiple
    const clickHandlers = map.handlers['singleclick'] || []
    clickHandlers.forEach((h: Function) => h({ pixel: [0,0] }))
    // dialog with listing should appear (wait for state update)
    await screen.findByText(/2 servicios aquí/i)
    // Change underlying features to a single different feature
    vector._features = [ { get: () => ({ id: 999, title: 'C' }) } ]
    // pointermove handlers should not update hovered card when pinned
    const pmHandlers = map.handlers['pointermove'] || []
    pmHandlers.forEach((h: Function) => h({ pixel: [0,0] }))
    // still shows pinned list
    await screen.findByText(/2 servicios aquí/i)
  })
})
