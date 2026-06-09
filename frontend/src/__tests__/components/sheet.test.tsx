import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock radix dialog primitives
vi.mock('@radix-ui/react-dialog', () => {
  const React = require('react')
  const make = (name: string) => (props: any) => React.createElement(name, props, props.children)
  return {
    Root: make('div'),
    Trigger: make('button'),
    Close: make('button'),
    Portal: make('div'),
    Overlay: make('div'),
    Content: make('div'),
    Title: make('h2'),
    Description: make('div'),
  }
})

// Mock XIcon
vi.mock('lucide-react', () => {
  const React = require('react')
  return {
    XIcon: (props: any) => React.createElement('svg', props),
  }
})

import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '../../app/components/ui/sheet'

describe('Sheet wrappers', () => {
  

  test('SheetContent renders close button with XIcon and supports sides', () => {
    render(
      <SheetContent side="left">
        <div>body</div>
      </SheetContent>
    )

    const content = document.querySelector('[data-slot="sheet-content"]')
    expect(content).toBeTruthy()
    expect(content?.textContent).toContain('body')
    const close = document.querySelector('[data-slot="sheet-close"]') || content?.querySelector('button')
    expect(close).toBeTruthy()
    // XIcon renders as svg child of close
    expect(close?.querySelector('svg')).toBeTruthy()
  })

  test('top-level wrappers return elements with correct data-slot (call without render)', () => {
    // Call components as functions to inspect the returned React element
    const rootEl = Sheet({}) as any
    const triggerEl = SheetTrigger({ children: 't' } as any) as any
    const closeEl = SheetClose({} as any) as any

    expect(rootEl.props['data-slot']).toBe('sheet')
    expect(triggerEl.props['data-slot']).toBe('sheet-trigger')
    expect(closeEl.props['data-slot']).toBe('sheet-close')
  })

  test('Header, Title, Description and Footer have slots', () => {
    render(
      <div>
        <SheetHeader>H</SheetHeader>
        <SheetTitle>T</SheetTitle>
        <SheetDescription>D</SheetDescription>
        <SheetFooter>F</SheetFooter>
      </div>
    )

    expect(document.querySelector('[data-slot="sheet-header"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="sheet-title"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="sheet-description"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="sheet-footer"]')).toBeTruthy()
  })
})
