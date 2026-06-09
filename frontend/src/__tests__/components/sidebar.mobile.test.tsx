import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

// Mock useIsMobile to true for mobile branch
vi.mock('../../app/components/ui/use-mobile', () => ({
  useIsMobile: () => true,
}))

// Mock sheet primitives used for mobile rendering
vi.mock('../../app/components/ui/sheet', () => {
  const React = require('react')
  const make = (name: string) => (props: any) => React.createElement(name, props, props.children)
  return {
    Sheet: make('div'),
    SheetContent: make('div'),
    SheetHeader: make('div'),
    SheetTitle: make('div'),
    SheetDescription: make('div'),
  }
})

// Mock tooltip provider to keep provider working
vi.mock('../../app/components/ui/tooltip', () => {
  const React = require('react')
  return {
    TooltipProvider: ({ children }: any) => React.createElement('div', {}, children),
    Tooltip: ({ children }: any) => React.createElement('div', {}, children),
    TooltipTrigger: ({ children, ...p }: any) => React.createElement('div', p, children),
    TooltipContent: ({ children }: any) => React.createElement('div', {}, children),
  }
})

import { SidebarProvider, Sidebar } from '../../app/components/ui/sidebar'

describe('Sidebar mobile branch', () => {
  test('renders Sheet-based mobile sidebar when isMobile true', () => {
    render(
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>
    )

    const mobile = document.querySelector('[data-mobile="true"]')
    expect(mobile).toBeTruthy()
    const slot = document.querySelector('[data-slot="sidebar"]')
    expect(slot).toBeTruthy()
  })
})
