import React, { useEffect } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// Force desktop branch by default
vi.mock('../../app/components/ui/use-mobile', () => ({ useIsMobile: () => false }))

// Mock sheet primitives for mobile branch
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

// Mock tooltip to capture hidden prop
vi.mock('../../app/components/ui/tooltip', () => {
  const React = require('react')
  return {
    TooltipProvider: ({ children }: any) => React.createElement('div', {}, children),
    Tooltip: ({ children }: any) => React.createElement('div', {}, children),
    TooltipTrigger: ({ children, ...p }: any) => React.createElement('div', p, children),
    TooltipContent: ({ children, hidden, side, align, ...p }: any) =>
      React.createElement('div', { 'data-hidden': hidden, 'data-side': side, 'data-align': align }, children),
  }
})

// Mock other UI primitives
vi.mock('../../app/components/ui/button', () => ({ Button: (p: any) => React.createElement('button', p, p.children) }))
vi.mock('../../app/components/ui/input', () => ({ Input: (p: any) => React.createElement('input', p) }))
vi.mock('../../app/components/ui/separator', () => ({ Separator: (p: any) => React.createElement('div', p) }))
vi.mock('../../app/components/ui/skeleton', () => ({ Skeleton: (p: any) => React.createElement('div', p) }))

import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenuButton,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSubButton,
  useSidebar,
} from '../../app/components/ui/sidebar'

function ToggleViaContext() {
  const ctx = useSidebar()
  useEffect(() => {
    // flip open to ensure setOpen branch runs and cookie gets set
    ctx.setOpen(!ctx.open)
  }, [])
  return <div data-testid="ctx-open">{String(ctx.open)}</div>
}

describe('Sidebar coverage exercise', () => {
  afterEach(() => {
    // clear cookie
    document.cookie = 'sidebar_state=; max-age=0; path=/'
  })

  test('exercise many branches and subcomponents', () => {
    render(
      <SidebarProvider defaultOpen={true}>
        <div>
          {/* Desktop sidebar variations */}
          <Sidebar collapsible="icon" variant="floating" side="right">
            <div>inside</div>
          </Sidebar>

          <Sidebar collapsible="none">NoCollapse</Sidebar>

          <SidebarTrigger />
          <SidebarRail />
          <SidebarInset />
          <SidebarInput placeholder="x" />
          <SidebarHeader>H</SidebarHeader>
          <SidebarFooter>F</SidebarFooter>
          <SidebarSeparator />
          <SidebarContent>Content</SidebarContent>

          <SidebarGroupLabel>Label</SidebarGroupLabel>
          <SidebarGroupAction />

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive tooltip="Tip">Btn</SidebarMenuButton>
              <SidebarMenuBadge>1</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenuSkeleton showIcon />

          <SidebarMenuSubButton href="#">Sub</SidebarMenuSubButton>

          <ToggleViaContext />
        </div>
      </SidebarProvider>
    )

    // ensure sidebar elements rendered
    expect(document.querySelector('[data-slot="sidebar"]')).toBeTruthy()
    // ensure cookie was set by ToggleViaContext setOpen
    expect(document.cookie).toContain('sidebar_state=')

    // simulate keyboard shortcut: ctrl/meta + b
    const ev = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true })
    globalThis.dispatchEvent(ev)

    // ensure menu button rendered and tooltip content has data-hidden attribute
    const tooltip = document.querySelector('[data-hidden]')
    expect(tooltip).toBeTruthy()
  })
})
