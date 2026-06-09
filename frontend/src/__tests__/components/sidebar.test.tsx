import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock useIsMobile to control mobile/desktop branches
vi.mock('../../app/components/ui/use-mobile', () => ({
  useIsMobile: () => false,
}))

// Mock sheet primitives used for mobile rendering (kept simple)
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

// Mock tooltip provider so SidebarProvider can render
vi.mock('../../app/components/ui/tooltip', () => {
  const React = require('react')
  return {
    TooltipProvider: ({ children }: any) => React.createElement('div', {}, children),
    Tooltip: ({ children }: any) => React.createElement('div', {}, children),
    TooltipTrigger: ({ children, ...p }: any) => React.createElement('div', p, children),
    TooltipContent: ({ children }: any) => React.createElement('div', {}, children),
  }
})

// Mock button/input/separator/skeleton to simple elements
vi.mock('../../app/components/ui/button', () => ({ Button: (p: any) => React.createElement('button', p, p.children) }))
vi.mock('../../app/components/ui/input', () => ({ Input: (p: any) => React.createElement('input', p) }))
vi.mock('../../app/components/ui/separator', () => ({ Separator: (p: any) => React.createElement('div', p) }))
vi.mock('../../app/components/ui/skeleton', () => ({ Skeleton: (p: any) => React.createElement('div', p) }))

import {
  SidebarProvider,
  Sidebar,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarContent,
} from '../../app/components/ui/sidebar'

describe('Sidebar (ui/sidebar.tsx)', () => {
  test('SidebarProvider renders wrapper and desktop Sidebar structure when not mobile', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <div data-testid="inner">Hello</div>
        </Sidebar>
      </SidebarProvider>
    )

    expect(document.querySelector('[data-slot="sidebar-wrapper"]')).toBeTruthy()
    // Desktop sidebar should render sidebar container and inner slot
    expect(document.querySelector('[data-slot="sidebar"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="sidebar-inner"]')).toBeTruthy()
    expect(screen.getByTestId('inner')).toBeInTheDocument()
  })

  test('SidebarInput, Header, Footer and Content render data-slot attributes', () => {
    render(
      <SidebarProvider>
        <div>
          <SidebarInput placeholder="Search" />
          <SidebarHeader>H</SidebarHeader>
          <SidebarFooter>F</SidebarFooter>
          <SidebarContent>Content</SidebarContent>
        </div>
      </SidebarProvider>
    )

    expect(document.querySelector('[data-slot="sidebar-input"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="sidebar-header"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="sidebar-footer"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="sidebar-content"]')).toBeTruthy()
  })

  test('SidebarGroupLabel renders as Slot or div based on asChild', () => {
    // asChild = false
    const a = SidebarGroupLabel({ children: 'Label' } as any)
    expect(a.props['data-slot']).toBe('sidebar-group-label')

    // asChild = true should still provide same data-slot when called
    const b = SidebarGroupLabel({ asChild: true, children: 'Label' } as any)
    expect(b.props['data-slot']).toBe('sidebar-group-label')
  })
})
